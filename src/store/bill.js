import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'
import { useAssetStore } from './asset'

const STORAGE_KEY = 'account_book_bills'

const normalizeCurrency = (currency) => currency || 'CNY'
const roundMoney = (value) => Number(Number(value || 0).toFixed(2))

export const useBillStore = defineStore('bill', {
  state: () => ({
    bills: []
  }),
  actions: {
    init() {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        this.bills = JSON.parse(stored).map(b => ({
          ...b,
          currency: normalizeCurrency(b.currency),
          targetCurrency: normalizeCurrency(b.targetCurrency || b.currency),
          isIncludedInStats: b.type === 'transfer'
            ? false
            : ['income', 'expense'].includes(b.type) && normalizeCurrency(b.currency) !== 'CNY' && b.isIncludedInStats === false
            ? true
            : b.isIncludedInStats
        }))
      }
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.bills))
    },
    getBill(id) {
      return this.bills.find(b => b.id === id)
    },
    normalizeBillData(billData = {}) {
      const currency = normalizeCurrency(billData.currency)
      const targetCurrency = normalizeCurrency(billData.targetCurrency || currency)
      const amount = Number(billData.amount || 0)
      const targetAmount = billData.targetAmount !== undefined
        ? Number(billData.targetAmount || 0)
        : undefined

      return {
        ...billData,
        amount,
        currency,
        targetCurrency,
        targetAmount,
        remark: billData.remark ?? billData.note ?? '',
        fee: Number(billData.fee || 0),
        isIncludedInStats: billData.type === 'transfer'
          ? false
          : billData.isIncludedInStats !== undefined ? billData.isIncludedInStats : true,
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

      await this.recalculateAssetBalance(newBill.assetId)
      if (newBill.type === 'transfer' && newBill.targetAssetId) {
        await this.recalculateAssetBalance(newBill.targetAssetId)
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
        currency: original.currency || 'CNY',
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
        await this.recalculateAssetBalance(assetId)
      }

      this.save()
      return id
    },
    async recalculateAssetBalance(assetId) {
      const assetStore = useAssetStore()
      const asset = assetStore.getAsset(assetId)
      if (!asset) return

      const runningBalances = {
        CNY: Number(asset.initialBalance || 0),
        ...(asset.initialBalances || {})
      }

      const assetBills = this.bills
        .filter(b => b.assetId === assetId || (b.type === 'transfer' && b.targetAssetId === assetId))
        .sort((a, b) => a.timestamp - b.timestamp)

      for (const bill of assetBills) {
        if (bill.assetId === assetId) {
          const currency = normalizeCurrency(bill.currency)
          const fee = bill.type === 'transfer' ? Number(bill.fee || 0) : 0
          const delta = Number(bill.amount || 0) - Math.abs(fee)
          runningBalances[currency] = roundMoney((runningBalances[currency] || 0) + delta)
          bill.balanceSnapshot = runningBalances[currency]
          bill.balanceCurrency = currency
        }

        if (bill.type === 'transfer' && bill.targetAssetId === assetId) {
          const targetCurrency = normalizeCurrency(bill.targetCurrency || bill.currency)
          const fallbackTargetAmount = Math.abs(Number(bill.amount || 0))
          const targetAmount = bill.targetAmount !== undefined ? Number(bill.targetAmount || 0) : fallbackTargetAmount
          runningBalances[targetCurrency] = roundMoney((runningBalances[targetCurrency] || 0) + targetAmount)
          bill.targetBalanceSnapshot = runningBalances[targetCurrency]
          bill.targetBalanceCurrency = targetCurrency
        }
      }

      assetStore.updateBalances(assetId, runningBalances)
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
        await this.recalculateAssetBalance(assetId)
      }

      this.save()
    },
    getStatType(bill) {
      return bill.type
    },
    getStatAmount(bill) {
      return Math.abs(Number(bill.amount || 0))
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
        this.recalculateAssetBalance(assetId)
      })

      this.save()
    }
  }
})
