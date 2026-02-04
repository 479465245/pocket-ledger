<template>
  <view class="container">
    <!-- Header: Tabs -->
    <view class="header-tabs">
        <view 
            v-for="t in tabs" 
            :key="t.value" 
            :class="['tab-item', currentTab === t.value ? 'active' : '']"
            @click="switchTab(t.value)"
        >
            {{ t.label }}
        </view>
    </view>

    <!-- Category Grid -->
    <scroll-view scroll-y class="category-area" v-if="currentTab !== 'transfer'" :scroll-top="scrollTop" scroll-with-animation>
        <view class="grid-container">
            <view 
                v-for="cat in categories" 
                :key="cat.id" 
                class="grid-item"
                @click="selectCategory(cat)"
            >
                <view :class="['icon-wrapper', selectedCategoryId === cat.id ? 'selected' : '']">
                    <text class="icon-text">{{ cat.icon || cat.name[0] }}</text>
                    <view v-if="cat.children && cat.children.length > 0" class="plus-badge">+</view>
                </view>
                <text :class="['cat-name', selectedCategoryId === cat.id ? 'selected-text' : '']">{{ cat.name }}</text>
            </view>
            <view class="grid-item" @click="goManageCategories">
                 <view class="icon-wrapper setting">
                    <text class="icon-text">⚙️</text>
                 </view>
                 <text class="cat-name">设置</text>
            </view>
        </view>

        <!-- Sub Categories Expansion -->
        <view v-if="subCategories.length > 0" class="sub-category-panel">
            <view class="sub-divider">
                <text class="divider-text">选择子分类</text>
            </view>
            <view class="grid-container">
                <view 
                    v-for="sub in subCategories" 
                    :key="sub.id" 
                    class="grid-item"
                    @click="selectSubCategory(sub)"
                >
                    <view :class="['icon-wrapper', form.categoryId === sub.id ? 'selected' : '']">
                        <text class="icon-text">{{ sub.icon || sub.name[0] }}</text>
                    </view>
                    <text :class="['cat-name', form.categoryId === sub.id ? 'selected-text' : '']">{{ sub.name }}</text>
                </view>
            </view>
        </view>
        
        <!-- Spacer for scrolling -->
        <view style="height: 50px;"></view>
    </scroll-view>

    <!-- Transfer Area -->
    <view class="transfer-area" v-if="currentTab === 'transfer'">
        <view class="transfer-card">
            <view class="transfer-row" @click="openAssetPicker('source')">
                <view class="row-label">
                    <text class="row-icon">📤</text>
                    <text>转出账户</text>
                </view>
                <view class="row-right">
                    <text class="row-value">{{ selectedAssetName }}</text>
                    <text class="chevron">></text>
                </view>
            </view>
            
            <view class="transfer-divider">
                <text>⬇️</text>
            </view>

            <view class="transfer-row" @click="openAssetPicker('target')">
                <view class="row-label">
                    <text class="row-icon">📥</text>
                    <text>转入账户</text>
                </view>
                <view class="row-right">
                    <text class="row-value">{{ assets.find(a => a.id === form.targetAssetId)?.name || '选择账户' }}</text>
                    <text class="chevron">></text>
                </view>
            </view>
        </view>
    </view>

    <!-- Bottom Panel -->
    <view class="bottom-panel neu-card-top">
        <!-- Input Row 1: Asset & Date & Stats -->
        <view class="options-row">
             <view class="option-tag" @click="openAssetPicker('source')" v-if="currentTab !== 'transfer'">
                 <text class="tag-icon">💳</text>
                 <text>{{ selectedAssetName }}</text>
             </view>
             <picker mode="date" :value="form.date" @change="onDateChange">
                 <view class="option-tag">
                     <text class="tag-icon">📅</text>
                     <text>{{ displayDate }}</text>
                 </view>
             </picker>
             <view class="option-tag" @click="form.isIncludedInStats = !form.isIncludedInStats">
                 <text class="tag-icon">{{ form.isIncludedInStats ? '📊' : '🚫' }}</text>
                 <text>{{ form.isIncludedInStats ? '计入统计' : '不计入' }}</text>
             </view>
        </view>
        
        <!-- Input Row 2: Remark & Amount -->
        <view class="input-display-row">
            <view class="remark-box">
                <input class="remark-input" v-model="form.remark" placeholder="请输入备注信息..." />
            </view>
            <view class="amount-box">
                <text class="currency">¥</text>
                <text class="amount-text">{{ displayAmount }}</text>
            </view>
        </view>

        <!-- Keypad -->
        <view class="keypad">
            <view class="key-row">
                <view class="key-cell" @click="onKey('1')">1</view>
                <view class="key-cell" @click="onKey('2')">2</view>
                <view class="key-cell" @click="onKey('3')">3</view>
                <view class="key-cell del-btn" @click="onKey('del')">⌫</view>
            </view>
            <view class="key-row">
                <view class="key-cell" @click="onKey('4')">4</view>
                <view class="key-cell" @click="onKey('5')">5</view>
                <view class="key-cell" @click="onKey('6')">6</view>
                <view class="key-cell placeholder"></view>
            </view>
            <view class="key-row">
                <view class="key-cell" @click="onKey('7')">7</view>
                <view class="key-cell" @click="onKey('8')">8</view>
                <view class="key-cell" @click="onKey('9')">9</view>
                <view class="key-cell placeholder"></view>
            </view>
            <view class="key-row">
                <view class="key-cell action-btn" @click="resetForm">再记</view>
                <view class="key-cell" @click="onKey('0')">0</view>
                <view class="key-cell" @click="onKey('.')">.</view>
                <view class="key-cell submit-btn" @click="submit">保存</view>
            </view>
        </view>
    </view>
    
    <!-- Asset Picker Modal -->
    <view v-if="showAssetPicker" class="picker-mask" @click="showAssetPicker = false">
        <view class="picker-modal neu-card" @click.stop>
            <view class="picker-title">选择账户</view>
            <view class="asset-list">
                <view 
                    v-for="a in assets" 
                    :key="a.id" 
                    class="asset-option"
                    @click="selectAsset(a)"
                >
                    {{ a.name }}
                </view>
            </view>
        </view>
    </view>
    
  </view>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'

const categoryStore = useCategoryStore()
const assetStore = useAssetStore()
const billStore = useBillStore()

const tabs = [
    { label: '支出', value: 'expense' },
    { label: '收入', value: 'income' },
    { label: '转账', value: 'transfer' }
]

const currentTab = ref('expense')
const scrollTop = ref(0)
const selectedCategoryId = ref('')
const selectedParentId = ref('') // To track which parent is expanded
const showAssetPicker = ref(false)
const pickingAssetType = ref('source')

const form = reactive({
    amountStr: '0',
    remark: '',
    date: new Date().toISOString().split('T')[0],
    assetId: '',
    parentCategoryId: '', // 一级分类ID，用于层级展示
    categoryId: '', // 实际分类ID（可以是父级或子级）
    isIncludedInStats: true
})

const categories = computed(() => {
    return categoryStore.categories.filter(c => c.type === currentTab.value)
})
const assets = computed(() => assetStore.assets)

const subCategories = computed(() => {
    if (!selectedParentId.value) return []
    // Use store directly to avoid filtered list issues
    const parent = categoryStore.categories.find(c => c.id === selectedParentId.value)
    const children = parent ? (parent.children || []) : []
    return children
})

const selectedAssetName = computed(() => {
    const a = assets.value.find(x => x.id === form.assetId)
    return a ? a.name : '账户'
})

const displayDate = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    if (form.date === today) return '今天'
    return form.date.substring(5) // MM-DD
})

const displayAmount = computed(() => {
    return form.amountStr
})

// Watch categories change to ensure selection is valid
import { watch } from 'vue'
watch(categories, (newVal) => {
    if (newVal.length > 0) {
        // If current selection is not in new list, select first
        const exists = newVal.find(c => c.id === selectedCategoryId.value)
        if (!exists) {
            selectCategory(newVal[0])
        }
    } else {
        selectedCategoryId.value = ''
        form.parentCategoryId = ''
        form.categoryId = ''
    }
})

onMounted(() => {
    categoryStore.init()
    assetStore.init()
    if (assets.value.length > 0) {
        form.assetId = assets.value[0].id
    }
    // Default select first category
    // Logic handled by watch or manual init
    if (categories.value.length > 0) {
        selectCategory(categories.value[0])
    }
})

const switchTab = (val) => {
    currentTab.value = val
    if (val === 'transfer') {
        form.isIncludedInStats = false
        // Default target asset logic
        if (!form.targetAssetId && assets.value.length > 1) {
             // Try to find one that is not source
             form.targetAssetId = assets.value.find(a => a.id !== form.assetId)?.id || ''
        }
    } else {
        form.isIncludedInStats = true
    }
}

const selectCategory = (cat) => {
    console.log('Select Category:', cat.name, cat.id)
    selectedCategoryId.value = cat.id
    selectedParentId.value = cat.id // Always set as parent context
    form.parentCategoryId = cat.id
    
    // 默认选择父分类作为categoryId，如果用户选择子分类会覆盖
    form.categoryId = cat.id
    
    console.log('Children:', cat.children)
}

const selectSubCategory = (sub) => {
    form.categoryId = sub.id  // 子分类ID覆盖父分类ID
    console.log('Select Sub Category:', sub.name, sub.id)
}

const goManageCategories = () => {
    uni.navigateTo({ url: '/pages/categories/index' })
}

const openAssetPicker = (type) => {
    pickingAssetType.value = type
    showAssetPicker.value = true
}

const selectAsset = (a) => {
    if (pickingAssetType.value === 'source') {
        form.assetId = a.id
    } else {
        form.targetAssetId = a.id
    }
    showAssetPicker.value = false
}

const onDateChange = (e) => {
    form.date = e.detail.value
}

// Keypad Logic
const onKey = (key) => {
    if (key === 'del') {
        if (form.amountStr.length > 1) {
            form.amountStr = form.amountStr.slice(0, -1)
        } else {
            form.amountStr = '0'
        }
        return
    }
    
    if (['+', '-'].includes(key)) {
        // Simple calculation support could be added here
        // For now, just ignoring operators or maybe implementing simple sum?
        // Requirement didn't strictly say calculator, but keypads usually imply it.
        // Let's keep it simple string for now, or just append if we want to support expr.
        // Given complexity, let's stick to simple number input first.
        return 
    }

    if (key === '.') {
        if (form.amountStr.includes('.')) return
        form.amountStr += '.'
        return
    }

    if (form.amountStr === '0') {
        form.amountStr = key
    } else {
        // Limit length
        if (form.amountStr.length < 10) {
             form.amountStr += key
        }
    }
}

const resetForm = () => {
    form.amountStr = '0'
    form.remark = ''
    if (currentTab.value !== 'transfer') {
        form.isIncludedInStats = true
    }
    // Keep asset and date and category
}

const submit = async () => {
    const val = parseFloat(form.amountStr)
    if (val === 0) {
        uni.showToast({ title: '金额不能为0', icon: 'none' })
        return
    }
    
    if (currentTab.value === 'transfer') {
        if (!form.assetId || !form.targetAssetId) {
             uni.showToast({ title: '请选择转出和转入账户', icon: 'none' })
             return
        }
        if (form.assetId === form.targetAssetId) {
             uni.showToast({ title: '转出和转入账户不能相同', icon: 'none' })
             return
        }
    }

    try {
        let finalAmount = val
        if (currentTab.value === 'expense' || currentTab.value === 'transfer') {
            finalAmount = -Math.abs(val)
        } else {
            finalAmount = Math.abs(val)
        }

        // Create timestamp with current time for proper sorting
        const now = new Date()
        const selectedDate = new Date(form.date)
        const timestamp = new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds()
        ).getTime()

        await billStore.addBill({
            amount: finalAmount,
            parentCategoryId: form.parentCategoryId, // 保留一级分类用于展示
            categoryId: form.categoryId, // 实际分类ID
            assetId: form.assetId,
            targetAssetId: currentTab.value === 'transfer' ? form.targetAssetId : undefined,
            type: currentTab.value,
            timestamp: timestamp,
            remark: form.remark,
            isIncludedInStats: form.isIncludedInStats
        })
        
        uni.showToast({ title: '已保存' })
        resetForm()
        // Optional: navigate back or stay? "再记" implies stay, "保存" implies close?
        // User image has both. "保存" usually closes.
        uni.navigateBack()
    } catch (e) {
        console.error(e)
        uni.showToast({ title: '保存失败', icon: 'none' })
    }
}

</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Match page height */
  /* height: calc(100vh - var(--window-top)); */ /* Try this for H5 if navbar issue persists */
  background-color: var(--color-bg);
  overflow: hidden;
}

/* Header Tabs */
.header-tabs {
    display: flex;
    justify-content: center;
    padding-top: 20px;
    padding-bottom: 10px;
    background: var(--color-bg);
    z-index: 10;
    flex-shrink: 0;
}

.tab-item {
    padding: 8px 20px;
    margin: 0 10px;
    font-size: 16px;
    color: var(--color-text-light);
    font-weight: bold;
    border-radius: 20px;
    transition: all 0.3s;
    
    &.active {
        color: #fff;
        background: var(--color-text); /* Black/Dark Grey */
        box-shadow: var(--shadow-light), var(--shadow-dark);
    }
}

/* Category Grid */
.category-area {
    flex: 1;
    height: 0; /* Important for flex child scroll-view */
    padding: 20px 10px;
}

.grid-container {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding-bottom: 20px;
}

.grid-item {
    width: 20%; /* 5 items per row */
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
}

.icon-wrapper {
    position: relative; /* Ensure badge is positioned relative to this */
    width: 50px;
    height: 50px;
    border-radius: 18px;
    background: #f0f4f8; /* Slightly different bg for icon */
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    font-size: 24px;
    color: var(--color-text-light);
    transition: all 0.2s;
    
    &.selected {
        background: #88B194; /* Greenish accent from user image */
        color: #fff;
        box-shadow: 0 4px 10px rgba(136, 177, 148, 0.4);
    }
    
    &.setting {
        background: transparent;
        border: 1px solid #ddd;
    }
    
    .plus-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 16px;
        height: 16px;
        background: var(--color-text);
        color: #fff;
        border-radius: 50%;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
    }
}

.sub-category-panel {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #e0e5ec;
    animation: fadeIn 0.3s ease;
}

.sub-divider {
    text-align: center;
    margin-bottom: 15px;
    
    .divider-text {
        font-size: 12px;
        color: var(--color-text-light);
        background: var(--color-bg);
        padding: 0 10px;
    }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.cat-name {
    font-size: 12px;
    color: var(--color-text-light);
    
    &.selected-text {
        color: var(--color-text);
        font-weight: bold;
    }
}

/* Bottom Panel */
.bottom-panel {
    background: #f8fcf8; /* Light Mint/Cream */
    border-radius: 30px 30px 0 0;
    box-shadow: 0 -5px 20px rgba(0,0,0,0.05);
    padding: 20px;
    padding-bottom: calc(20px + constant(safe-area-inset-bottom));
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
    flex-shrink: 0;
}

/* Options Row */
.options-row {
    display: flex;
    margin-bottom: 15px;
}

.option-tag {
    display: flex;
    align-items: center;
    background: #fff;
    padding: 5px 12px;
    border-radius: 15px;
    margin-right: 10px;
    font-size: 12px;
    color: var(--color-text);
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.tag-icon {
    margin-right: 5px;
}

/* Input Display Row */
.input-display-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 0 5px;
}

.remark-box {
    flex: 1;
}

.remark-input {
    font-size: 14px;
    color: var(--color-text);
}

.amount-box {
    display: flex;
    align-items: flex-end;
    color: #e74c3c; /* Red for expense */
}

.currency {
    font-size: 20px;
    margin-right: 5px;
    margin-bottom: 5px;
}

.amount-text {
    font-size: 36px;
    font-weight: bold;
}

/* Keypad */
.keypad {
    background: #eef5ef; /* Greenish tint bg */
    border-radius: 20px;
    padding: 5px;
}

.key-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    &:last-child { margin-bottom: 0; }
}

.key-cell {
    width: 23%;
    height: 55px;
    background: #fff;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 500;
    color: var(--color-text);
    box-shadow: 0 2px 0 rgba(0,0,0,0.05);
    
    &:active {
        background: #f0f0f0;
        transform: translateY(2px);
        box-shadow: none;
    }

    &.placeholder {
        visibility: hidden;
        pointer-events: none;
        box-shadow: none;
        background: transparent;
    }
}

.del-btn, .op-btn {
    font-size: 18px;
    color: var(--color-text-light);
}

.action-btn {
    font-size: 16px;
    color: var(--color-text);
}

.submit-btn {
    background: #88B194; /* Green */
    color: #fff;
    font-size: 16px;
    box-shadow: 0 2px 0 #6a8f75;
    
    &:active {
        background: #7da589;
    }
}

/* Picker Modal */
.picker-mask {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
}
.picker-modal {
    width: 80%;
    padding: 20px;
    background: #fff;
    border-radius: 20px;
}
.picker-title {
    text-align: center;
    font-weight: bold;
    margin-bottom: 15px;
}
.asset-option {
    padding: 15px;
    border-bottom: 1px solid #f5f5f5;
    text-align: center;
}

/* Transfer Area */
.transfer-area {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 20px;
    overflow-y: auto; /* Allow scrolling if content is tall */
}

.transfer-card {
    width: 100%;
    background: var(--color-bg);
    border-radius: 20px;
    padding: 20px;
    box-shadow: var(--shadow-light), var(--shadow-dark);
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 200px; /* Approximate height */
}

.transfer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-radius: 15px;
    background: #f0f4f8;
    margin-bottom: 10px;
    &:active {
        background: #e1e6eb;
    }
}

.transfer-divider {
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--color-text-light);
}

.row-label {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: bold;
    color: var(--color-text);
}

.row-icon {
    margin-right: 10px;
    font-size: 18px;
}

.row-right {
    display: flex;
    align-items: center;
}

.row-value {
    font-size: 16px;
    color: var(--color-text);
    margin-right: 5px;
}

.chevron {
    color: var(--color-text-light);
    font-size: 14px;
}
</style>
