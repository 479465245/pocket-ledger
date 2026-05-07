import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'

const STORAGE_KEY = 'account_book_assets'

const defaultAssets = [
  { id: 'a1', name: '现金', type: 'cash', initialBalance: 0, currentBalance: 0 },
  { id: 'a2', name: '微信钱包', type: 'digital', initialBalance: 0, currentBalance: 0 },
  { id: 'a3', name: '支付宝', type: 'digital', initialBalance: 0, currentBalance: 0 },
]

export const useAssetStore = defineStore('asset', {
  state: () => ({
    assets: []
  }),
  actions: {
    init() {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        this.assets = JSON.parse(stored)
      } else {
        this.assets = defaultAssets
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

      const asset = {
        id: generateId(),
        name: payload.name,
        type: payload.type || 'digital',
        initialBalance: Number(payload.initialBalance ?? payload.balance ?? 0),
        currentBalance: Number(payload.initialBalance ?? payload.balance ?? 0)
      }

      this.assets.push(asset)
      this.save()
      return asset
    },
    updateBalance(id, newBalance) {
      const asset = this.assets.find(a => a.id === id)
      if (asset) {
        asset.currentBalance = Number(newBalance)
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
      if (payload.initialBalance !== undefined) asset.initialBalance = Number(payload.initialBalance)
      if (payload.currentBalance !== undefined) asset.currentBalance = Number(payload.currentBalance)

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
