import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'

const STORAGE_KEY = 'account_book_assets'
const BILL_STORAGE_KEY = 'account_book_bills'

const withCurrencyBalances = (asset) => {
  const cnyBalance = Number(asset.currentBalance ?? asset.initialBalance ?? 0)
  const balances = {
    CNY: cnyBalance,
    ...(asset.balances || {})
  }

  return {
    ...asset,
    currency: asset.currency || 'CNY',
    balances,
    initialBalances: {
      CNY: Number(asset.initialBalance ?? balances.CNY ?? 0),
      ...(asset.initialBalances || {})
    },
    initialBalance: Number(asset.initialBalance ?? balances.CNY ?? 0),
    currentBalance: Number(balances.CNY ?? 0)
  }
}

const isZeroAsset = (asset) => {
  const balances = asset.balances || {}
  return Number(asset.initialBalance || 0) === 0 &&
    Number(asset.currentBalance || 0) === 0 &&
    Object.values(balances).every(amount => Number(amount || 0) === 0)
}

const hasStoredBills = () => {
  const stored = uni.getStorageSync(BILL_STORAGE_KEY)
  if (!stored) return false

  try {
    const bills = JSON.parse(stored)
    return Array.isArray(bills) && bills.length > 0
  } catch (error) {
    return true
  }
}

const shouldDropLegacyDefaultAssets = (assets) => {
  const legacyAssets = [
    { id: 'a1', name: '现金' },
    { id: 'a2', name: '微信钱包' },
    { id: 'a3', name: '支付宝' }
  ]

  return !hasStoredBills() &&
    assets.length === legacyAssets.length &&
    legacyAssets.every(legacy => assets.some(asset => asset.id === legacy.id && asset.name === legacy.name && isZeroAsset(asset)))
}

export const useAssetStore = defineStore('asset', {
  state: () => ({
    assets: []
  }),
  actions: {
    init() {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        const assets = JSON.parse(stored).map(withCurrencyBalances)
        this.assets = shouldDropLegacyDefaultAssets(assets) ? [] : assets
        this.save()
      } else {
        this.assets = []
        this.save()
      }
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.assets))
    },
    addAsset(nameOrPayload, type, initialBalance) {
      const payload = typeof nameOrPayload === 'object' && nameOrPayload !== null
        ? nameOrPayload
        : { name: nameOrPayload, type, initialBalance }

      const currency = payload.currency || 'CNY'
      const balance = Number(payload.initialBalance ?? payload.balance ?? 0)
      const asset = withCurrencyBalances({
        id: generateId(),
        name: payload.name,
        type: payload.type || 'digital',
        currency,
        initialBalance: currency === 'CNY' ? balance : 0,
        currentBalance: currency === 'CNY' ? balance : 0,
        initialBalances: { [currency]: balance },
        balances: { [currency]: balance }
      })

      this.assets.push(asset)
      this.save()
      return asset
    },
    updateBalance(id, newBalance) {
      this.updateCurrencyBalance(id, 'CNY', newBalance)
    },
    updateCurrencyBalance(id, currency = 'CNY', newBalance) {
      const asset = this.assets.find(a => a.id === id)
      if (asset) {
        if (!asset.balances) asset.balances = {}
        asset.balances[currency] = Number(newBalance)
        if (currency === 'CNY') {
          asset.currentBalance = Number(newBalance)
        }
        this.save()
      }
    },
    updateBalances(id, balances = {}) {
      const asset = this.assets.find(a => a.id === id)
      if (asset) {
        asset.balances = { ...(asset.balances || {}), ...balances }
        asset.currentBalance = Number(asset.balances.CNY || 0)
        this.save()
      }
    },
    updateAsset(id, payload = {}) {
      const asset = this.assets.find(a => a.id === id)
      if (!asset) {
        throw new Error('资产不存在')
      }

      if (payload.name !== undefined) asset.name = payload.name
      if (payload.type !== undefined) asset.type = payload.type
      if (payload.currency !== undefined) asset.currency = payload.currency
      if (payload.initialBalance !== undefined) {
        asset.initialBalance = Number(payload.initialBalance)
        if (!asset.initialBalances) asset.initialBalances = {}
        asset.initialBalances.CNY = Number(payload.initialBalance)
      }
      if (payload.currentBalance !== undefined) {
        if (!asset.balances) asset.balances = {}
        asset.balances.CNY = Number(payload.currentBalance)
        asset.currentBalance = Number(payload.currentBalance)
      }
      if (payload.balances !== undefined) {
        asset.balances = { ...(asset.balances || {}), ...payload.balances }
        asset.currentBalance = Number(asset.balances.CNY || 0)
      }

      this.save()
      return asset
    },
    deleteAsset(id) {
      const index = this.assets.findIndex(a => a.id === id)
      if (index === -1) {
        throw new Error('资产不存在')
      }
      const [deleted] = this.assets.splice(index, 1)
      this.save()
      return deleted
    },
    getAsset(id) {
      return this.assets.find(a => a.id === id)
    },
    findByName(name) {
      return this.assets.find(a => a.name === name)
    }
  }
})
