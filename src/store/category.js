import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'

const STORAGE_KEY = 'account_book_categories'

export const ASSET_ADJUSTMENT_CATEGORY_ID = 'sys-asset-adjustment'

const systemCategories = [
  {
    id: ASSET_ADJUSTMENT_CATEGORY_ID,
    name: '资产调整',
    type: 'expense',
    icon: '⚖️',
    parentId: null,
    children: [],
    isSystem: true,
    hidden: true
  }
]

const ensureSystemCategories = (categories = []) => {
  const normalized = categories.map(cat => ({
    ...cat,
    children: cat.children || []
  }))

  systemCategories.forEach(systemCat => {
    const existing = normalized.find(cat => cat.id === systemCat.id)
    if (existing) {
      Object.assign(existing, {
        ...systemCat,
        children: existing.children || []
      })
    } else {
      normalized.push({ ...systemCat, children: [] })
    }
  })

  return normalized
}

const defaultCategories = [
  {
    id: 'c1',
    name: '餐饮',
    type: 'expense',
    icon: '🍔',
    parentId: null,
    children: [
      { id: 'c1-1', name: '早餐', type: 'expense', icon: '🍞', parentId: 'c1' },
      { id: 'c1-2', name: '午餐', type: 'expense', icon: '🍱', parentId: 'c1' },
      { id: 'c1-3', name: '晚餐', type: 'expense', icon: '🍲', parentId: 'c1' },
    ]
  },
  {
    id: 'c2',
    name: '交通',
    type: 'expense',
    icon: '🚗',
    parentId: null,
    children: [
      { id: 'c2-1', name: '地铁', type: 'expense', icon: '🚇', parentId: 'c2' },
      { id: 'c2-2', name: '打车', type: 'expense', icon: '🚕', parentId: 'c2' },
    ]
  },
  {
    id: 'c3',
    name: '购物',
    type: 'expense',
    icon: '🛍️',
    parentId: null,
    children: []
  },
  {
    id: 'c4',
    name: '工资',
    type: 'income',
    icon: '💰',
    parentId: null,
    children: []
  },
  {
    id: 'c5',
    name: '兼职',
    type: 'income',
    icon: '💼',
    parentId: null,
    children: []
  }
]

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: []
  }),
  actions: {
    init() {
      const stored = uni.getStorageSync(STORAGE_KEY)
      if (stored) {
        this.categories = ensureSystemCategories(JSON.parse(stored))
        if (this.categories.length > 0 && !this.categories[0].type) {
          this.categories.forEach(c => {
            c.type = 'expense'
            c.icon = c.icon || c.name[0]
            if (c.children) {
              c.children.forEach(sub => {
                sub.type = 'expense'
                sub.icon = sub.icon || sub.name[0]
              })
            }
          })
          this.save()
        }
      } else {
        this.categories = ensureSystemCategories(defaultCategories)
        this.save()
      }
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.categories))
    },
    addCategory(nameOrPayload, parentId = null, icon = 'default', type = 'expense') {
      const payload = typeof nameOrPayload === 'object' && nameOrPayload !== null
        ? nameOrPayload
        : { name: nameOrPayload, parentId, icon, type }

      const newCat = {
        id: generateId(),
        name: payload.name,
        icon: payload.icon || '🏷️',
        type: payload.type || 'expense',
        parentId: payload.parentId ?? null,
        children: []
      }

      if (newCat.parentId) {
        const parent = this.categories.find(c => c.id === newCat.parentId)
        if (parent) {
          if (!parent.children) parent.children = []
          newCat.type = parent.type
          parent.children.push(newCat)
        }
      } else {
        this.categories.push(newCat)
      }
      this.save()
      return newCat
    },
    deleteCategory(id, migrationTargetId = null, billStore = null) {
      let targetCategory = this.categories.find(c => c.id === id)
      let parent = null

      if (!targetCategory) {
        for (const cat of this.categories) {
          const child = (cat.children || []).find(c => c.id === id)
          if (child) {
            targetCategory = child
            parent = cat
            break
          }
        }
      }

      if (!targetCategory) {
        throw new Error('分类不存在')
      }

      if (targetCategory.isSystem) {
        throw new Error('系统分类不能删除')
      }

      if (migrationTargetId) {
        if (!billStore) {
          throw new Error('缺少账单 store，无法迁移分类')
        }

        billStore.migrateCategory(targetCategory.id, migrationTargetId)

        if (!targetCategory.parentId && targetCategory.children?.length) {
          const migrationTarget = this.categories.find(c => c.id === migrationTargetId)
          if (!migrationTarget) {
            throw new Error('迁移目标分类不存在')
          }
          if (!migrationTarget.children) migrationTarget.children = []
          const movedChildren = targetCategory.children.map(child => ({
            ...child,
            parentId: migrationTarget.id
          }))
          migrationTarget.children = [...migrationTarget.children, ...movedChildren]
        }
      } else if (billStore) {
        billStore.deleteBillsByCategory(targetCategory.id)
      }

      if (targetCategory.parentId) {
        const holder = parent || this.categories.find(c => c.id === targetCategory.parentId)
        if (holder?.children) {
          holder.children = holder.children.filter(c => c.id !== targetCategory.id)
        }
      } else {
        this.categories = this.categories.filter(c => c.id !== targetCategory.id)
      }

      this.save()
      return {
        deletedId: targetCategory.id,
        migratedTo: migrationTargetId || null,
        isChild: !!targetCategory.parentId
      }
    },
    updateCategory(id, { name, icon }) {
      let cat = this.categories.find(c => c.id === id)
      if (cat) {
        if (cat.isSystem) {
          throw new Error('系统分类不能修改')
        }
        if (name) cat.name = name
        if (icon) cat.icon = icon
        this.save()
        return
      }

      for (const parent of this.categories) {
        if (parent.children) {
          cat = parent.children.find(c => c.id === id)
          if (cat) {
            if (cat.isSystem) {
              throw new Error('系统分类不能修改')
            }
            if (name) cat.name = name
            if (icon) cat.icon = icon
            this.save()
            return
          }
        }
      }
    },
    getCategoryName(id) {
      for (const cat of this.categories) {
        if (cat.id === id) return cat.name
        if (cat.children) {
          const child = cat.children.find(c => c.id === id)
          if (child) return child.name
        }
      }
      return 'Unknown'
    },
    findCategoryByName(name, type, parentId = null) {
      if (parentId) {
        const parent = this.categories.find(c => c.id === parentId)
        return parent?.children?.find(c => c.name === name) || null
      }
      return this.categories.find(c => c.name === name && c.type === type) || null
    }
  }
})
