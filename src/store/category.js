import { defineStore } from 'pinia'
import { generateId } from '@/utils/uuid'

const STORAGE_KEY = 'account_book_categories'

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
        this.categories = JSON.parse(stored)
        // Migration for existing data without type/icon if needed (simple check)
        if (this.categories.length > 0 && !this.categories[0].type) {
            this.categories.forEach(c => {
                c.type = 'expense' // Default to expense for old data
                c.icon = c.icon || c.name[0]
                if(c.children) {
                    c.children.forEach(sub => {
                        sub.type = 'expense'
                        sub.icon = sub.icon || sub.name[0]
                    })
                }
            })
            this.save()
        }
      } else {
        this.categories = defaultCategories
        this.save()
      }
    },
    save() {
      uni.setStorageSync(STORAGE_KEY, JSON.stringify(this.categories))
    },
    addCategory(name, parentId = null, icon = 'default', type = 'expense') {
      const newCat = {
        id: generateId(),
        name,
        icon,
        type,
        parentId,
        children: [] 
      }
      
      if (parentId) {
        const parent = this.categories.find(c => c.id === parentId)
        if (parent) {
          if (!parent.children) parent.children = []
          // Subcategory inherits parent type
          newCat.type = parent.type
          parent.children.push(newCat)
        }
      } else {
        this.categories.push(newCat)
      }
      this.save()
    },
    // Safe delete with migration check
    deleteCategory(id, migrationTargetId = null) {
      // Implementation pending user interaction logic in UI
      // Ideally returns a warning if children exist
    },
    updateCategory(id, { name, icon }) {
        // Find in Level 1
        let cat = this.categories.find(c => c.id === id)
        if (cat) {
            if (name) cat.name = name
            if (icon) cat.icon = icon
            this.save()
            return
        }
        
        // Find in Level 2
        for (const parent of this.categories) {
            if (parent.children) {
                cat = parent.children.find(c => c.id === id)
                if (cat) {
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
    }
  }
})
