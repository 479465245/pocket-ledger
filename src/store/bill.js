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
    
    // Core: Add Bill with Chain Correction
    async addBill(billData) {
      const assetStore = useAssetStore()
      const newBill = {
        id: generateId(),
        ...billData,
        timestamp: billData.timestamp || Date.now(),
        isIncludedInStats: billData.isIncludedInStats !== undefined ? billData.isIncludedInStats : true,
        isRefunded: false
        // 注意：保留 parentCategoryId 存储一级分类，新增 categoryId 存储实际分类ID
      }
      
      // If it's a refund, link to original
      if (newBill.type === 'refund' && newBill.originalBillId) {
        const original = this.bills.find(b => b.id === newBill.originalBillId)
        if (original) {
            original.isRefunded = true
        }
      }

      // Add to local list first
      this.bills.push(newBill)
      
      // Trigger chain correction for the affected asset(s)
      await this.recalculateAssetBalance(newBill.assetId, newBill.timestamp)
      if (newBill.type === 'transfer' && newBill.targetAssetId) {
          await this.recalculateAssetBalance(newBill.targetAssetId, newBill.timestamp)
      }
      
      this.save()
      return newBill.id
    },

    // Core: Chain Correction Algorithm
    async recalculateAssetBalance(assetId, fromTimestamp) {
        const assetStore = useAssetStore()
        const asset = assetStore.getAsset(assetId)
        if (!asset) return

        // 1. Get all bills for this asset sorted by time (Source OR Target)
        const assetBills = this.bills
            .filter(b => b.assetId === assetId || (b.type === 'transfer' && b.targetAssetId === assetId))
            .sort((a, b) => a.timestamp - b.timestamp)

        // 2. Find starting point
        // For simplicity and robustness on "small" data (<10k), full recalc for the asset is safer.
        
        let runningBalance = asset.initialBalance
        
        for (const bill of assetBills) {
            let amount = Number(bill.amount)
            
            // Handle Transfer Logic
            if (bill.type === 'transfer') {
                if (bill.targetAssetId === assetId) {
                    // If we are the target of a transfer, we receive money.
                    // The stored amount is negative (outflow from source).
                    // So we reverse it.
                    amount = -amount
                }
                // If we are the source (bill.assetId === assetId), amount is already negative. Correct.
            }
            
            runningBalance += amount
            
            // Update snapshot only if this bill belongs primarily to this asset?
            // Or should we store snapshots for both sides?
            // The bill object is shared. If we update `balanceSnapshot` here, it overwrites the value for the other asset if they are processed sequentially?
            // YES. This is a problem. A single bill object cannot store two different snapshots (one for source, one for target).
            
            // Solution: We shouldn't store `balanceSnapshot` on the bill itself if it differs per context.
            // OR, we store `balanceSnapshot` and `targetBalanceSnapshot`.
            if (bill.assetId === assetId) {
                bill.balanceSnapshot = Number(runningBalance.toFixed(2))
            } else if (bill.targetAssetId === assetId) {
                bill.targetBalanceSnapshot = Number(runningBalance.toFixed(2))
            }
        }

        // 3. Update Asset's current balance to the final running balance
        assetStore.updateBalance(assetId, Number(runningBalance.toFixed(2)))
        
        // Note: we modified objects inside this.bills, so just saving is enough
        this.save()
    },

    deleteBill(id) {
        const bill = this.bills.find(b => b.id === id)
        if (!bill) return
        
        const assetId = bill.assetId
        const targetAssetId = bill.targetAssetId
        const timestamp = bill.timestamp
        
        // Remove
        this.bills = this.bills.filter(b => b.id !== id)
        
        // If it was a refund, unmark the original?
        if (bill.type === 'refund' && bill.originalBillId) {
             const original = this.bills.find(b => b.id === bill.originalBillId)
             if (original) original.isRefunded = false
        }

        // Recalculate
        this.recalculateAssetBalance(assetId, timestamp)
        if (targetAssetId) {
            this.recalculateAssetBalance(targetAssetId, timestamp)
        }
    },

    // Core: Migrate bills from one category to another
    migrateCategory(oldCatId, newCatId) {
        let count = 0
        this.bills.forEach(bill => {
            // 更新 parentCategoryId（一级分类）
            if (bill.parentCategoryId === oldCatId) {
                bill.parentCategoryId = newCatId
            }
            // 如果 categoryId 是旧的分类ID，也更新它
            if (bill.categoryId === oldCatId) {
                bill.categoryId = newCatId
                count++
            }
        })
        this.save()
        return count
    },

    deleteBillsByCategory(catId) {
        // Delete all bills associated with this category
        // 检查 parentCategoryId 或 categoryId 是否匹配
        const billsToDelete = this.bills.filter(b => b.parentCategoryId === catId || b.categoryId === catId)
        
        // We need to recalculate balances for all affected assets
        const affectedAssets = new Set()
        billsToDelete.forEach(b => affectedAssets.add(b.assetId))
        
        // Remove bills
        this.bills = this.bills.filter(b => b.parentCategoryId !== catId && b.categoryId !== catId)
        
        // Recalculate
        affectedAssets.forEach(assetId => {
            this.recalculateAssetBalance(assetId, 0) // Full recalc
        })
        
        this.save()
    }
  }
})
