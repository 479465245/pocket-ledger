import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'
import { useAssetStore } from './asset'

const STORAGE_KEY = 'account_book_bills'

export const useBillStore = defineStore('bill', {
  state: () => ({
    bills: []
  }),
  actions: {
    init() {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        this.bills = JSON.parse(stored)
      }
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.bills))
    },
    getBill(id) {
      return this.bills.find(b => b.id === id)
    },
    normalizeBillData(billData = {}) {
      return {
        ...billData,
        remark: billData.remark ?? billData.note ?? '',
        fee: Number(billData.fee || 0),
        isIncludedInStats: billData.isIncludedInStats !== undefined ? billData.isIncludedInStats : true,
      }
    },
    async addBill(billData) {
      const newBill = {
        id: generateId(),
        ...this.normalizeBillData(billData),
        timestamp: billData.timestamp || Date.now(),
        isRefunded: false,
      }

      if (newBill.type === 'refund' && newBill.originalBillId) {
        const original = this.bills.find(b => b.id === newBill.originalBillId)
        if (!original) {
          throw new Error('原账单不存在')
        }
        if (original.isRefunded) {
          throw new Error('该账单已退款')
        }
        original.isRefunded = true
      }

      this.bills.push(newBill)

      await this.recalculateAssetBalance(newBill.assetId, newBill.timestamp)
      if (newBill.type === 'transfer' && newBill.targetAssetId) {
        await this.recalculateAssetBalance(newBill.targetAssetId, newBill.timestamp)
      }

      this.save()
      return newBill.id
    },
    async createRefund(originalBillId, overrides = {}) {
      const original = this.bills.find(b => b.id === originalBillId)
      if (!original) throw new Error('原账单不存在')
      if (original.type === 'transfer') throw new Error('转账记录不支持退款')
      if (original.type === 'refund') throw new Error('退款记录不能再次退款')
      if (original.isRefunded) throw new Error('该账单已退款')

      const refundAmount = -Number(original.amount)
      const remark = overrides.remark || (original.remark ? `退款：${original.remark}` : '退款')

      return await this.addBill({
        amount: refundAmount,
        assetId: original.assetId,
        parentCategoryId: original.parentCategoryId,
        categoryId: original.categoryId,
        type: 'refund',
        timestamp: overrides.timestamp || Date.now(),
        remark,
        originalBillId,
        isIncludedInStats: false,
        fee: 0
      })
    },
    async updateBill(id, billData) {
      const index = this.bills.findIndex(b => b.id === id)
      if (index === -1) {
        throw new Error('账单不存在')
      }

      const originalBill = { ...this.bills[index] }

      this.bills[index] = {
        ...this.bills[index],
        ...this.normalizeBillData(billData),
        id,
        fee: billData.type === 'transfer' ? Number(billData.fee || 0) : 0
      }

      const assetsToRecalculate = new Set()
      if (originalBill.assetId) assetsToRecalculate.add(originalBill.assetId)
      if (billData.assetId) assetsToRecalculate.add(billData.assetId)
      if (originalBill.type === 'transfer' && originalBill.targetAssetId) assetsToRecalculate.add(originalBill.targetAssetId)
      if (billData.type === 'transfer' && billData.targetAssetId) assetsToRecalculate.add(billData.targetAssetId)

      for (const assetId of assetsToRecalculate) {
        await this.recalculateAssetBalance(assetId, Math.min(originalBill.timestamp, billData.timestamp || originalBill.timestamp))
      }

      this.save()
      return id
    },
    async recalculateAssetBalance(assetId) {
      const assetStore = useAssetStore()
      const asset = assetStore.getAsset(assetId)
      if (!asset) return

      const assetBills = this.bills
        .filter(b => b.assetId === assetId || (b.type === 'transfer' && b.targetAssetId === assetId))
        .sort((a, b) => a.timestamp - b.timestamp)

      let runningBalance = asset.initialBalance

      for (const bill of assetBills) {
        let amount = Number(bill.amount)

        if (bill.type === 'transfer' && bill.targetAssetId === assetId) {
          const fee = Number(bill.fee) || 0
          amount = -amount - fee
        }

        runningBalance += amount

        if (bill.assetId === assetId) {
          bill.balanceSnapshot = Number(runningBalance.toFixed(2))
        } else if (bill.targetAssetId === assetId) {
          bill.targetBalanceSnapshot = Number(runningBalance.toFixed(2))
        }
      }

      assetStore.updateBalance(assetId, Number(runningBalance.toFixed(2)))
      this.save()
    },
    async deleteBill(id) {
      const bill = this.bills.find(b => b.id === id)
      if (!bill) return

      const cascadeRefundIds = bill.type === 'refund'
        ? []
        : this.bills.filter(b => b.originalBillId === id).map(b => b.id)
      const idsToDelete = new Set([id, ...cascadeRefundIds])
      const billsToDelete = this.bills.filter(b => idsToDelete.has(b.id))
      const affectedAssets = new Set()

      billsToDelete.forEach(item => {
        if (item.assetId) affectedAssets.add(item.assetId)
        if (item.targetAssetId) affectedAssets.add(item.targetAssetId)
        if (item.type === 'refund' && item.originalBillId) {
          const original = this.bills.find(b => b.id === item.originalBillId)
          if (original) original.isRefunded = false
        }
      })

      this.bills = this.bills.filter(b => !idsToDelete.has(b.id))

      if (bill.type === 'refund' && bill.originalBillId) {
        const original = this.bills.find(b => b.id === bill.originalBillId)
        if (original) original.isRefunded = false
      }

      for (const assetId of affectedAssets) {
        await this.recalculateAssetBalance(assetId, 0)
      }

      this.save()
    },
    migrateCategory(oldCatId, newCatId) {
      let count = 0
      this.bills.forEach(bill => {
        if (bill.parentCategoryId === oldCatId) {
          bill.parentCategoryId = newCatId
        }
        if (bill.categoryId === oldCatId) {
          bill.categoryId = newCatId
          bill.parentCategoryId = newCatId
          count++
        }
      })
      this.save()
      return count
    },
    deleteBillsByCategory(catId) {
      const billsToDelete = this.bills.filter(b => b.parentCategoryId === catId || b.categoryId === catId)
      const affectedAssets = new Set()
      billsToDelete.forEach(b => {
        if (b.assetId) affectedAssets.add(b.assetId)
        if (b.targetAssetId) affectedAssets.add(b.targetAssetId)
      })

      this.bills = this.bills.filter(b => b.parentCategoryId !== catId && b.categoryId !== catId)

      affectedAssets.forEach(assetId => {
        this.recalculateAssetBalance(assetId, 0)
      })

      this.save()
    }
  }
})
