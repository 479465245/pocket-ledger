import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'
import { useAssetStore } from './asset'

const STORAGE_KEY = 'account_book_bills'

const normalizeCurrency = (currency) => currency || 'CNY'
const roundMoney = (value) => Number(Number(value || 0).toFixed(2))
const toCents = (value) => Math.round(Number(value || 0) * 100)
const fromCents = (value) => roundMoney(Number(value || 0) / 100)

const parseDateValue = (value) => {
  if (typeof value === 'number') return new Date(value)
  if (value instanceof Date) return new Date(value.getTime())
  const text = String(value || '')
  if (!text) return new Date()
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const addMonthKeepingDay = (dateValue, offset) => {
  const source = parseDateValue(dateValue)
  const day = source.getDate()
  const target = new Date(source.getFullYear(), source.getMonth() + offset, 1, source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds())
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, lastDay))
  return target.getTime()
}

const splitCents = (totalCents, count) => {
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}

const normalizeAA = (aa) => {
  if (!aa || typeof aa !== 'object') return undefined
  return {
    ...aa,
    enabled: aa.enabled !== false,
    groupId: aa.groupId || '',
    role: aa.role || 'payer',
    ownAmount: aa.ownAmount !== undefined ? roundMoney(aa.ownAmount) : undefined,
    receivableAmount: aa.receivableAmount !== undefined ? roundMoney(aa.receivableAmount) : undefined,
    settlementAmount: aa.settlementAmount !== undefined ? roundMoney(aa.settlementAmount) : undefined
  }
}

const normalizeInstallment = (installment) => {
  if (!installment || typeof installment !== 'object') return undefined
  return {
    ...installment,
    groupId: installment.groupId || '',
    period: Number(installment.period || 0),
    totalPeriods: Number(installment.totalPeriods || 0),
    totalAmount: installment.totalAmount !== undefined ? roundMoney(installment.totalAmount) : undefined,
    principalAmount: installment.principalAmount !== undefined ? roundMoney(installment.principalAmount) : undefined,
    fee: installment.fee !== undefined ? roundMoney(installment.fee) : 0,
    periodPrincipal: installment.periodPrincipal !== undefined ? roundMoney(installment.periodPrincipal) : undefined,
    periodFee: installment.periodFee !== undefined ? roundMoney(installment.periodFee) : undefined,
    periodAmount: installment.periodAmount !== undefined ? roundMoney(installment.periodAmount) : undefined,
    statAmount: installment.statAmount !== undefined ? roundMoney(installment.statAmount) : undefined
  }
}

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
          statAmount: b.statAmount !== undefined ? roundMoney(b.statAmount) : undefined,
          aa: normalizeAA(b.aa),
          installment: normalizeInstallment(b.installment),
          isIncludedInStats: b.type === 'transfer'
            ? false
            : ['income', 'expense'].includes(b.type) && normalizeCurrency(b.currency) !== 'CNY' && b.isIncludedInStats === false
              ? true
              : b.isIncludedInStats
        }))

        const assetStore = useAssetStore()
        assetStore.assets.forEach(asset => this.recalculateAssetBalance(asset.id))
      }
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.bills))
    },
    getBill(id) {
      return this.bills.find(b => b.id === id)
    },
    getInstallmentBills(groupId) {
      return this.bills
        .filter(bill => bill.installment?.groupId === groupId)
        .sort((a, b) => {
          const periodDelta = Number(a.installment.period || 0) - Number(b.installment.period || 0)
          return periodDelta || Number(a.timestamp || 0) - Number(b.timestamp || 0)
        })
    },
    createAAGroupId() {
      return generateId()
    },
    getAAPayer(groupId) {
      return this.bills.find(bill => bill.aa?.groupId === groupId && bill.aa?.role === 'payer')
    },
    getAASettlement(groupId) {
      const bills = this.bills.filter(bill => bill.aa?.groupId === groupId)
      const payer = bills.find(bill => bill.aa?.role === 'payer')
      const receivable = Number(payer?.aa?.receivableAmount || 0)
      const settled = bills
        .filter(bill => bill.type === 'income' && bill.aa?.role === 'repayment')
        .reduce((sum, bill) => sum + Number(bill.aa?.settlementAmount ?? Math.abs(bill.amount || 0)), 0)

      return {
        groupId,
        payer,
        receivable: roundMoney(receivable),
        settled: roundMoney(settled),
        outstanding: roundMoney(Math.max(0, receivable - settled))
      }
    },
    normalizeBillData(billData = {}) {
      const currency = normalizeCurrency(billData.currency)
      const targetCurrency = normalizeCurrency(billData.targetCurrency || currency)
      const amount = Number(billData.amount || 0)
      const targetAmount = billData.targetAmount !== undefined
        ? Number(billData.targetAmount || 0)
        : undefined
      const normalized = {
        ...billData,
        amount,
        currency,
        targetCurrency,
        targetAmount,
        remark: billData.remark ?? billData.note ?? '',
        fee: Number(billData.fee || 0),
        statAmount: billData.statAmount !== undefined ? roundMoney(billData.statAmount) : undefined,
        aa: normalizeAA(billData.aa),
        installment: normalizeInstallment(billData.installment),
        isIncludedInStats: billData.type === 'transfer'
          ? false
          : billData.isIncludedInStats !== undefined ? billData.isIncludedInStats : true
      }

      if (normalized.aa?.role === 'repayment') {
        if (normalized.type !== 'income') throw new Error('AA还款必须是收入账单')
        if (!normalized.aa.groupId) throw new Error('AA还款缺少AA组')
        if (amount <= 0) throw new Error('AA还款金额必须大于0')
        normalized.isIncludedInStats = false
        normalized.aa.settlementAmount = roundMoney(Math.abs(amount))
      }

      if (normalized.aa?.enabled && normalized.aa.role !== 'repayment') {
        if (normalized.type !== 'expense') throw new Error('AA分摊只支持支出账单')
        const ownAmount = Number(normalized.aa.ownAmount)
        if (!Number.isFinite(ownAmount) || ownAmount < 0 || ownAmount > Math.abs(amount)) {
          throw new Error('AA本人承担金额不正确')
        }
        normalized.aa.ownAmount = roundMoney(ownAmount)
        normalized.aa.receivableAmount = roundMoney(Math.abs(amount) - ownAmount)
        normalized.aa.groupId = normalized.aa.groupId || this.createAAGroupId()
        normalized.statAmount = normalized.aa.ownAmount
      }

      if (normalized.installment?.groupId && normalized.aa?.enabled) {
        throw new Error('AA与分期不能同时使用')
      }

      return normalized
    },
    validateAAGroup(groupId, billData = {}, currentId = '') {
      const settlement = this.getAASettlement(groupId)
      const payer = settlement.payer
      if (!payer) throw new Error('AA组不存在付款账单')
      if (currentId && payer.id === currentId) return settlement
      if (billData.type !== 'income') throw new Error('AA还款必须是收入账单')
      if (billData.currency && payer.currency && billData.currency !== payer.currency) {
        throw new Error('AA还款币种必须与付款账单一致')
      }
      const amount = Math.abs(Number(billData.amount || 0))
      const currentSettlement = currentId
        ? this.bills.find(bill => bill.id === currentId)?.aa?.settlementAmount || 0
        : 0
      if (amount <= 0 || amount > settlement.outstanding + Number(currentSettlement)) {
        throw new Error(`AA还款不能超过待收金额 ${settlement.outstanding.toFixed(2)}`)
      }
      return settlement
    },
    async addBill(billData, options = {}) {
      const newBill = {
        id: generateId(),
        ...this.normalizeBillData(billData),
        timestamp: billData.timestamp || Date.now(),
        isRefunded: false
      }

      if (newBill.installment?.groupId && !options.allowImportedInstallment) {
        throw new Error('分期账单请通过分期编辑页面维护')
      }

      if (newBill.aa?.role === 'repayment' && !options.allowImportedRelations) {
        this.validateAAGroup(newBill.aa.groupId, newBill)
      }

      if (newBill.type === 'refund' && newBill.originalBillId) {
        const original = this.bills.find(b => b.id === newBill.originalBillId)
        if (!original) throw new Error('原账单不存在')
        if (original.isRefunded) throw new Error('该账单已退款')
        if (original.installment?.groupId) throw new Error('分期账单请通过分期页面处理退款')
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
    async addInstallment(billData, options = {}) {
      if (billData.type !== 'expense') throw new Error('分期账单只支持支出')
      if (billData.aa?.enabled) throw new Error('分期账单暂不支持AA分摊')

      const totalAmount = Number(options.totalAmount ?? Math.abs(Number(billData.amount || 0)))
      const periods = Number(options.periods)
      const fee = Number(options.fee || 0)
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error('分期总金额不正确')
      if (!Number.isInteger(periods) || periods < 2) throw new Error('分期期数至少为2期')
      if (!Number.isFinite(fee) || fee < 0) throw new Error('分期手续费不正确')

      const groupId = options.groupId || generateId()
      const installmentBills = this.buildInstallmentBills(billData, {
        groupId,
        totalAmount,
        periods,
        fee,
        firstDate: options.firstDate || billData.timestamp || Date.now()
      }, options.existingIds || [])

      this.bills.push(...installmentBills)
      const affectedAssets = new Set(installmentBills.map(bill => bill.assetId).filter(Boolean))
      for (const assetId of affectedAssets) await this.recalculateAssetBalance(assetId)
      this.save()
      return { groupId, billIds: installmentBills.map(bill => bill.id) }
    },
    buildInstallmentBills(billData, options, existingIds = []) {
      const { groupId, totalAmount, periods, fee, firstDate } = options
      const principalCents = toCents(totalAmount)
      const feeCents = toCents(fee)
      const principalParts = splitCents(principalCents, periods)
      const feeParts = splitCents(feeCents, periods)
      const statAmount = roundMoney(totalAmount + fee)
      const baseData = this.normalizeBillData({
        ...billData,
        type: 'expense',
        amount: -totalAmount,
        isIncludedInStats: true,
        fee: 0,
        statAmount
      })

      return principalParts.map((principalCentsForPeriod, index) => {
        const period = index + 1
        const periodPrincipal = fromCents(principalCentsForPeriod)
        const periodFee = fromCents(feeParts[index])
        const periodAmount = roundMoney(periodPrincipal + periodFee)
        const timestamp = addMonthKeepingDay(firstDate, index)
        const installment = {
          groupId,
          period,
          totalPeriods: periods,
          totalAmount,
          principalAmount: totalAmount,
          fee,
          periodPrincipal,
          periodFee,
          periodAmount,
          statAmount: period === 1 ? statAmount : 0,
          firstDate: parseDateValue(firstDate).toISOString().slice(0, 10),
          interval: 'month'
        }

        return {
          ...baseData,
          id: existingIds[index] || generateId(),
          amount: -periodAmount,
          timestamp,
          isIncludedInStats: period === 1,
          statAmount: period === 1 ? statAmount : 0,
          installment,
          isRefunded: false
        }
      })
    },
    async updateInstallment(groupId, payload = {}) {
      const currentBills = this.getInstallmentBills(groupId)
      if (!currentBills.length) throw new Error('分期账单不存在')
      if (currentBills.some(bill => bill.isRefunded || bill.originalBillId)) {
        throw new Error('该分期已有退款关联，不能直接修改')
      }

      const first = currentBills[0]
      const totalAmount = Number(payload.totalAmount ?? first.installment.totalAmount)
      const periods = Number(payload.periods ?? first.installment.totalPeriods)
      const fee = Number(payload.fee ?? first.installment.fee ?? 0)
      const firstDate = payload.firstDate || first.timestamp
      const billData = {
        amount: -totalAmount,
        assetId: payload.assetId ?? first.assetId,
        parentCategoryId: payload.parentCategoryId ?? first.parentCategoryId,
        categoryId: payload.categoryId ?? first.categoryId,
        currency: payload.currency ?? first.currency,
        type: 'expense',
        remark: payload.remark ?? first.remark,
        timestamp: firstDate,
        isIncludedInStats: true
      }

      const oldAssets = new Set(currentBills.map(bill => bill.assetId).filter(Boolean))
      this.bills = this.bills.filter(bill => bill.installment?.groupId !== groupId)
      const replacement = this.buildInstallmentBills(billData, {
        groupId,
        totalAmount,
        periods,
        fee,
        firstDate,
      }, currentBills.map(bill => bill.id))
      this.bills.push(...replacement)
      replacement.forEach(bill => oldAssets.add(bill.assetId))
      for (const assetId of oldAssets) await this.recalculateAssetBalance(assetId)
      this.save()
      return replacement.map(bill => bill.id)
    },
    async deleteInstallment(groupId) {
      const billsToDelete = this.getInstallmentBills(groupId)
      if (!billsToDelete.length) return
      if (billsToDelete.some(bill => bill.isRefunded || bill.originalBillId)) {
        throw new Error('该分期已有退款关联，不能直接删除')
      }
      const affectedAssets = new Set(billsToDelete.map(bill => bill.assetId).filter(Boolean))
      this.bills = this.bills.filter(bill => bill.installment?.groupId !== groupId)
      for (const assetId of affectedAssets) await this.recalculateAssetBalance(assetId)
      this.save()
    },
    async createRefund(originalBillId, overrides = {}) {
      const original = this.bills.find(b => b.id === originalBillId)
      if (!original) throw new Error('原账单不存在')
      if (original.type === 'transfer') throw new Error('转账记录不支持退款')
      if (original.type === 'refund') throw new Error('退款记录不能再次退款')
      if (original.installment?.groupId) throw new Error('分期账单请通过分期页面处理退款')
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
      if (index === -1) throw new Error('账单不存在')
      const originalBill = { ...this.bills[index] }
      if (originalBill.installment?.groupId) throw new Error('分期账单请通过分期页面修改')
      if (originalBill.type === 'refund' && originalBill.originalBillId) throw new Error('退款账单不能直接编辑')
      if (originalBill.isRefunded) throw new Error('已退款账单不能直接编辑')
      if (originalBill.aa?.role === 'payer' && this.getAASettlement(originalBill.aa.groupId).settled > 0) {
        throw new Error('AA付款已有还款，请先删除还款记录')
      }

      const normalized = this.normalizeBillData(billData)
      if (normalized.aa?.role === 'repayment') {
        this.validateAAGroup(normalized.aa.groupId, normalized, id)
      }

      this.bills[index] = {
        ...this.bills[index],
        ...normalized,
        id,
        fee: billData.type === 'transfer' ? Number(billData.fee || 0) : 0
      }

      const assetsToRecalculate = new Set()
      if (originalBill.assetId) assetsToRecalculate.add(originalBill.assetId)
      if (billData.assetId) assetsToRecalculate.add(billData.assetId)
      if (originalBill.type === 'transfer' && originalBill.targetAssetId) assetsToRecalculate.add(originalBill.targetAssetId)
      if (billData.type === 'transfer' && billData.targetAssetId) assetsToRecalculate.add(billData.targetAssetId)

      for (const assetId of assetsToRecalculate) await this.recalculateAssetBalance(assetId)
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
      const currentBalances = { ...runningBalances }
      const now = Date.now()
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
          if (bill.timestamp <= now) {
            currentBalances[currency] = roundMoney((currentBalances[currency] || 0) + delta)
          }
        }

        if (bill.type === 'transfer' && bill.targetAssetId === assetId) {
          const targetCurrency = normalizeCurrency(bill.targetCurrency || bill.currency)
          const fallbackTargetAmount = Math.abs(Number(bill.amount || 0))
          const targetAmount = bill.targetAmount !== undefined ? Number(bill.targetAmount || 0) : fallbackTargetAmount
          runningBalances[targetCurrency] = roundMoney((runningBalances[targetCurrency] || 0) + targetAmount)
          bill.targetBalanceSnapshot = runningBalances[targetCurrency]
          bill.targetBalanceCurrency = targetCurrency
          if (bill.timestamp <= now) {
            currentBalances[targetCurrency] = roundMoney((currentBalances[targetCurrency] || 0) + targetAmount)
          }
        }
      }

      assetStore.updateBalances(assetId, currentBalances)
      this.save()
    },
    async deleteBill(id) {
      const bill = this.bills.find(b => b.id === id)
      if (!bill) return
      if (bill.aa?.role === 'payer') {
        const settlement = this.getAASettlement(bill.aa.groupId)
        if (settlement.settled > 0) throw new Error('AA付款已有还款，请先删除还款记录')
      }
      if (bill.installment?.groupId) {
        await this.deleteInstallment(bill.installment.groupId)
        return
      }

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

      for (const assetId of affectedAssets) await this.recalculateAssetBalance(assetId)
      this.save()
    },
    getStatType(bill) {
      if (!bill || bill.type === 'transfer' || bill.type === 'refund' || bill.type === 'adjustment') return bill?.type || ''
      return bill.type
    },
    getStatAmount(bill) {
      if (bill.statAmount !== undefined && bill.statAmount !== null) {
        return Math.abs(Number(bill.statAmount || 0))
      }
      if (bill.aa?.enabled && bill.aa.role !== 'repayment' && bill.aa.ownAmount !== undefined) {
        return Math.abs(Number(bill.aa.ownAmount || 0))
      }
      return Math.abs(Number(bill.amount || 0))
    },
    migrateCategory(oldCatId, newCatId) {
      let count = 0
      this.bills.forEach(bill => {
        if (bill.parentCategoryId === oldCatId) bill.parentCategoryId = newCatId
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
      affectedAssets.forEach(assetId => this.recalculateAssetBalance(assetId))
      this.save()
    }
  }
})
