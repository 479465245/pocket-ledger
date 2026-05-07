<template>
  <view class="container">
    <!-- Header with Tabs -->
    <view class="header-area">
        <view class="page-title">分类管理</view>
        <view class="tabs">
            <view 
                :class="['tab-item', currentTab === 'expense' ? 'active' : '']" 
                @click="currentTab = 'expense'"
            >
                支出
            </view>
            <view 
                :class="['tab-item', currentTab === 'income' ? 'active' : '']" 
                @click="currentTab = 'income'"
            >
                收入
            </view>
        </view>
    </view>

    <!-- Category List -->
    <scroll-view scroll-y class="category-list">
      <view v-if="filteredCategories.length === 0" class="empty-state">
          暂无分类
      </view>
      
      <view v-for="cat in filteredCategories" :key="cat.id" class="category-group neu-card">
        <!-- Level 1 Swipe Wrapper -->
        <view class="swipe-wrapper">
            <view class="swipe-actions">
                <view class="action-btn edit-btn" @click.stop="openAddDialog(cat.parentId, cat)">修改</view>
                <view class="action-btn del-btn" @click.stop="confirmDeletePrompt(cat)">删除</view>
            </view>
            
            <view 
                class="swipe-content" 
                :style="{ transform: `translateX(${swipeOffset[cat.id] || 0}px)` }"
                @touchstart="touchStart($event, cat.id)"
                @touchmove="touchMove($event, cat.id)"
                @touchend="touchEnd($event, cat.id)"
                @click="toggleExpand(cat.id)"
            >
                <view class="level-1">
                  <view class="cat-info">
                     <view class="icon-box">
                        <text>{{ cat.icon || cat.name[0] }}</text>
                     </view>
                     <text class="cat-name">{{ cat.name }}</text>
                  </view>
                  <view class="actions">
                     <text class="add-sub" @click.stop="openAddDialog(cat.id)">+</text>
                     <text class="expand-icon">{{ expanded[cat.id] ? '▼' : '▶' }}</text>
                  </view>
                </view>
            </view>
        </view>
        
        <!-- Level 2 -->
        <view v-if="expanded[cat.id]" class="level-2-list">
           <view v-for="sub in cat.children" :key="sub.id" class="swipe-wrapper level-2-wrapper">
              <view class="swipe-actions">
                  <view class="action-btn edit-btn" @click.stop="openAddDialog(sub.parentId, sub)">修改</view>
                  <view class="action-btn del-btn" @click.stop="confirmDeletePrompt(sub)">删除</view>
              </view>
              
              <view 
                  class="swipe-content"
                  :style="{ transform: `translateX(${swipeOffset[sub.id] || 0}px)` }"
                  @touchstart="touchStart($event, sub.id)"
                  @touchmove="touchMove($event, sub.id)"
                  @touchend="touchEnd($event, sub.id)"
              >
                  <view class="level-2-item">
                      <view class="sub-info">
                          <text class="sub-icon">{{ sub.icon || sub.name[0] }}</text>
                          <text class="sub-name">{{ sub.name }}</text>
                      </view>
                  </view>
              </view>
           </view>
        </view>
      </view>
      
      <view class="spacer"></view>
    </scroll-view>

    <button class="neu-btn add-main-btn" @click="openAddDialog(null)">
        + 添加{{ currentTab === 'expense' ? '支出' : '收入' }}类别
    </button>

    <!-- Add Dialog -->
    <view v-if="showAddDialog" class="modal-mask">
       <view class="modal neu-card">
          <view class="modal-title">
              {{ isEditMode ? '修改分类' : (addForm.parentId ? '添加二级分类' : '添加一级分类') }}
          </view>
          
          <view class="form-item">
              <text class="label">名称</text>
              <input class="neu-input" v-model="addForm.name" placeholder="输入分类名称" />
          </view>
          
          <view class="form-item">
              <text class="label">图标</text>
              <view class="selected-icon" @click="showIconPicker = !showIconPicker">
                  <text>{{ addForm.icon }}</text>
              </view>
          </view>
          
          <!-- Simple Icon Picker Area -->
          <view v-if="showIconPicker" class="icon-picker-area">
              <scroll-view scroll-y class="icon-scroll">
                  <view class="icon-grid">
                      <view 
                        v-for="(icon, idx) in emojiIcons" 
                        :key="idx" 
                        class="icon-option"
                        @click="selectIcon(icon)"
                      >
                          {{ icon }}
                      </view>
                  </view>
              </scroll-view>
          </view>

          <view class="modal-actions">
              <button class="neu-btn cancel" @click="closeAddDialog">取消</button>
              <button class="neu-btn confirm" @click="confirmAdd">确定</button>
          </view>
       </view>
    </view>

    <!-- Delete/Migrate Dialog -->
    <view v-if="showDeleteDialog" class="modal-mask">
       <view class="modal neu-card">
          <view class="modal-title">删除分类 "{{ targetCategory?.name }}"</view>
          <text class="warning-text">该分类下可能包含子分类或账单，请选择处理方式：</text>
          
          <radio-group @change="onDeleteOptionChange" class="radio-group">
             <label class="radio-item">
                <radio value="migrate" checked="true" color="#FF8D5D" />
                <text>迁移到其他分类</text>
             </label>
             <label class="radio-item">
                <radio value="delete" color="#FF8D5D" />
                <text>直接删除 (包含账单)</text>
             </label>
          </radio-group>

          <view v-if="deleteOption === 'migrate'" class="migrate-selector">
             <text class="label">目标分类:</text>
             <picker mode="selector" :range="migrationCandidates" range-key="name" @change="onMigrationTargetChange">
                <view class="neu-input picker-trigger">{{ migrationTargetName || '请选择' }}</view>
             </picker>
          </view>

          <view class="modal-actions">
              <button class="neu-btn cancel" @click="showDeleteDialog = false">取消</button>
              <button class="neu-btn delete-confirm" @click="confirmDelete">执行</button>
          </view>
       </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCategoryStore } from '@/store/category'
import { useBillStore } from '@/store/bill'

const categoryStore = useCategoryStore()
const billStore = useBillStore()

const currentTab = ref('expense')
const expanded = ref({})
const showAddDialog = ref(false)
const showIconPicker = ref(false)
const showDeleteDialog = ref(false)
const isEditMode = ref(false)
const editId = ref(null)

// Swipe Logic State
const swipeOffset = ref({})
const startX = ref(0)
const startY = ref(0)
const currentSwipeId = ref(null)
const BUTTON_WIDTH = 140 // 2 buttons * 70px

const addForm = reactive({ name: '', parentId: null, icon: '🏷️' })
const targetCategory = ref(null)
const deleteOption = ref('migrate')
const migrationTargetId = ref('')

// Basic emoji set
const emojiIcons = [
  '🍕', '🍔', '🍟', '🍱', '🍜', '🍲', '☕', '🍵', '🍺', '🍷',
  '🚗', '🚌', '🚇', '✈️', '🏠', '🏢', '🏥', '🏫', '🏪',
  '🛍️', '👗', '👟', '🕶️', '💄', '💍', '🎮', '🎳', '🎤', '🎬',
  '📚', '✏️', '💼', '💻', '📱', '💰', '🧧', '🎁', '🐶', '🐱',
  '👶', '💊', '🔧', '🚿', '🧺', '💡', '🎉', '🛡️', '🏷️', '⚙️'
]

onShow(() => {
    categoryStore.init()
    billStore.init()
})

const filteredCategories = computed(() => {
    return categoryStore.categories.filter(c => c.type === currentTab.value)
})

const migrationCandidates = computed(() => {
    if (!targetCategory.value) return []
    // Candidates must be same type and not self
    // If target is Level 1, candidates are other Level 1
    // If target is Level 2, candidates are other Level 2? 
    // For simplicity, let's say we migrate to a Level 1 category.
    return categoryStore.categories.filter(c => c.id !== targetCategory.value.id && c.type === currentTab.value)
})

const migrationTargetName = computed(() => {
    const c = categoryStore.categories.find(cat => cat.id === migrationTargetId.value)
    return c ? c.name : ''
})

const toggleExpand = (id) => {
    expanded.value[id] = !expanded.value[id]
}

const openAddDialog = (parentId, categoryToEdit = null) => {
    if (categoryToEdit) {
        isEditMode.value = true
        editId.value = categoryToEdit.id
        addForm.parentId = categoryToEdit.parentId // Should be null for L1, set for L2
        addForm.name = categoryToEdit.name
        addForm.icon = categoryToEdit.icon
    } else {
        isEditMode.value = false
        editId.value = null
        addForm.parentId = parentId
        addForm.name = ''
        addForm.icon = parentId ? '🏷️' : (currentTab.value === 'expense' ? '💸' : '💰')
    }
    showAddDialog.value = true
    showIconPicker.value = false
}

const closeAddDialog = () => {
    showAddDialog.value = false
}

const selectIcon = (icon) => {
    addForm.icon = icon
    showIconPicker.value = false
}

const confirmAdd = () => {
    if (!addForm.name) {
        uni.showToast({ title: '请输入名称', icon: 'none' })
        return
    }
    
    if (isEditMode.value) {
        categoryStore.updateCategory(editId.value, {
            name: addForm.name,
            icon: addForm.icon
        })
        uni.showToast({ title: '已更新' })
    } else {
        categoryStore.addCategory(
            addForm.name, 
            addForm.parentId, 
            addForm.icon,
            currentTab.value // Only used if parentId is null
        )
        // Auto expand parent
        if (addForm.parentId) {
            expanded.value[addForm.parentId] = true
        }
    }
    closeAddDialog()
}

const confirmDeletePrompt = (cat) => {
    targetCategory.value = cat
    deleteOption.value = 'migrate'
    migrationTargetId.value = ''
    showDeleteDialog.value = true
    // Reset swipe
    if (swipeOffset.value[cat.id]) {
        swipeOffset.value[cat.id] = 0
    }
}

// Swipe Handlers
const currentStartOffset = ref(0)

const touchStart = (e, id) => {
    if (e.touches.length > 1) return
    startX.value = e.touches[0].clientX
    startY.value = e.touches[0].clientY
    currentStartOffset.value = swipeOffset.value[id] || 0
    
    // Reset others if swiping new one
    if (currentSwipeId.value && currentSwipeId.value !== id) {
        swipeOffset.value[currentSwipeId.value] = 0
    }
    currentSwipeId.value = id
}

const touchMove = (e, id) => {
    if (e.touches.length > 1) return
    const moveX = e.touches[0].clientX
    const moveY = e.touches[0].clientY
    const deltaX = moveX - startX.value
    const deltaY = moveY - startY.value
    
    // If vertical scroll dominates, ignore horizontal
    if (Math.abs(deltaY) > Math.abs(deltaX)) return

    let targetOffset = currentStartOffset.value + deltaX
    if (targetOffset < -BUTTON_WIDTH) targetOffset = -BUTTON_WIDTH
    if (targetOffset > 0) targetOffset = 0
    
    swipeOffset.value[id] = targetOffset
}

const touchEnd = (e, id) => {
    const offset = swipeOffset.value[id] || 0
    if (offset < -BUTTON_WIDTH / 2) {
        // Open
        swipeOffset.value[id] = -BUTTON_WIDTH
    } else {
        // Close
        swipeOffset.value[id] = 0
    }
}


const onDeleteOptionChange = (e) => {
    deleteOption.value = e.detail.value
}

const onMigrationTargetChange = (e) => {
    const index = e.detail.value
    migrationTargetId.value = migrationCandidates.value[index].id
}

const confirmDelete = () => {
    if (deleteOption.value === 'migrate' && !migrationTargetId.value) {
        uni.showToast({ title: '请选择目标分类', icon: 'none' })
        return
    }

    try {
        categoryStore.deleteCategory(
            targetCategory.value.id,
            deleteOption.value === 'migrate' ? migrationTargetId.value : null,
            billStore
        )
        showDeleteDialog.value = false
        uni.showToast({ title: '操作完成' })
    } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' })
    }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 0;
  background-color: #FFF9F0;
  /* Flex Layout for No-Global-Scroll */
  height: 100%; /* Match page height */
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.header-area {
  padding: 40rpx 40rpx 20rpx;
  flex-shrink: 0; /* Fixed height */
}

.page-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 20px;
}

.tabs {
    display: flex;
    margin-bottom: 10px;
}

.tab-item {
    padding: 8px 20px;
    margin-right: 15px;
    font-size: 16px;
    color: var(--color-text-light);
    border-radius: 20px;
    transition: all 0.3s;
    
    &.active {
        color: #fff;
        background: var(--color-text);
        box-shadow: var(--shadow-light), var(--shadow-dark);
    }
}

.category-list {
  flex: 1; /* Takes remaining space */
  height: 0; /* Crucial for scroll-view in flex */
  padding: 0 40rpx;
  box-sizing: border-box;
}

.empty-state {
    text-align: center;
    color: var(--color-text-light);
    margin-top: 50px;
}

.category-group {
    margin-bottom: 15px;
    padding: 15px;
    border-radius: 15px;
}

.swipe-wrapper {
    position: relative;
    width: 100%;
    height: 70px; /* Fixed height for Level 1 */
    background: #FFF9F0; /* Match card bg */
    border-radius: 15px;
    overflow: hidden; /* Ensure actions are hidden by default */
}

.level-2-wrapper {
    height: 50px; /* Fixed height for Level 2 */
    margin-bottom: 5px;
    border-radius: 10px;
}

.swipe-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10; /* Higher than actions */
    background: #FFF9F0; /* Crucial to cover actions */
    transition: transform 0.1s linear;
    display: flex;
    align-items: center;
    padding: 0 15px;
    box-sizing: border-box;
    /* Shadow for depth when sliding */
    box-shadow: 2px 0 5px rgba(0,0,0,0.05); 
}

.swipe-actions {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    display: flex;
    z-index: 1; /* Lower than content */
    width: 140px; /* Match BUTTON_WIDTH */
}

.action-btn {
    width: 70px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
}

.edit-btn {
    background-color: #FFB74D;
}

.del-btn {
    background-color: #E57373;
}

.level-1 {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cat-info {
    display: flex;
    align-items: center;
}

.icon-box {
    width: 35px;
    height: 35px;
    border-radius: 12px;
    background: #f0f4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-size: 18px;
}

.cat-name {
    font-weight: bold;
    font-size: 16px;
    color: var(--color-text);
}

.actions {
    display: flex;
    align-items: center;
}

.add-sub {
    font-size: 22px;
    color: var(--color-primary);
    margin-right: 15px;
    padding: 0 10px;
    font-weight: bold;
}

.expand-icon {
    font-size: 12px;
    color: var(--color-text-light);
    width: 20px;
    text-align: center;
}

.level-2-list {
    /* Overridden above */
}

.level-2-item {
    padding: 8px 0;
    font-size: 14px;
    color: var(--color-text);
}

.sub-info {
    display: flex;
    align-items: center;
}

.sub-icon {
    margin-right: 8px;
    font-size: 14px;
}

.add-main-btn {
  margin: 20rpx 40rpx;
  margin-bottom: calc(40rpx + constant(safe-area-inset-bottom));
  margin-bottom: calc(40rpx + env(safe-area-inset-bottom));
  flex-shrink: 0; /* Fixed at bottom */
  background: #E0E5EC;
  box-shadow: 6px 6px 12px #b8b9be, -6px -6px 12px #ffffff;
  border-radius: 20rpx;
  color: #6D7587;
  font-weight: bold;
  border: none;
}

/* Ensure content inside scroll-view has padding at bottom so button doesn't cover it */
.spacer {
  height: 120rpx; 
}

/* Modal */
.modal-mask {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
}
.modal {
    width: 80%;
    padding: 25px;
    background: var(--color-bg);
    border-radius: 20px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}
.modal-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 20px;
    text-align: center;
}

.form-item {
    margin-bottom: 20px;
}

.label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--color-text-light);
}

.neu-input {
    width: 100%;
    height: 40px;
    background: #f0f4f8;
    border-radius: 10px;
    padding: 0 10px;
    font-size: 14px;
}

.selected-icon {
    width: 50px;
    height: 50px;
    background: #f0f4f8;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    border: 2px solid transparent;
    &:active {
        border-color: var(--color-primary);
    }
}

.icon-picker-area {
    height: 200px;
    background: #f9f9f9;
    border-radius: 10px;
    margin-bottom: 20px;
    padding: 10px;
}

.icon-scroll {
    height: 100%;
}

.icon-grid {
    display: flex;
    flex-wrap: wrap;
}

.icon-option {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin: 5px;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    
    &:active {
        background: #e0e0e0;
    }
}

.modal-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    
    button {
        width: 45%;
        font-size: 14px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .cancel { color: var(--color-text-light); background: #f0f4f8; }
    .confirm { color: #fff; background: var(--color-primary); }
    .delete-confirm { color: #fff; background: #e74c3c; }
}

.warning-text {
    font-size: 14px;
    color: #e74c3c;
    margin-bottom: 15px;
    display: block;
}
.radio-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    
    .radio-item {
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        font-size: 14px;
    }
}
.migrate-selector {
    margin-bottom: 20px;
    .picker-trigger {
        display: flex;
        align-items: center;
        background: #fff;
    }
}
</style>