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
            
            <view class="transfer-row" @click="openCurrencyPicker('target')">
                <view class="row-label">
                    <text class="row-icon">🌍</text>
                    <text>转入币种</text>
                </view>
                <view class="row-right">
                    <text class="row-value">{{ form.targetCurrency }}</text>
                    <text class="chevron">></text>
                </view>
            </view>

            <view class="transfer-row input-row">
                <view class="row-label">
                    <text class="row-icon">💱</text>
                    <text>转入金额</text>
                </view>
                <view class="row-right">
                    <input
                        class="fee-input"
                        type="digit"
                        v-model="form.targetAmountStr"
                        placeholder="转入金额"
                        @input="onTargetAmountInput"
                    />
                    <text class="fee-unit">{{ form.targetCurrency }}</text>
                </view>
            </view>
            
            <!-- 手续费输入 -->
            <view class="transfer-divider">
                <text>💰</text>
            </view>
            
            <view class="transfer-row">
                <view class="row-label">
                    <text class="row-icon">💳</text>
                    <text>手续费</text>
                </view>
                <view class="row-right">
                    <input 
                        class="fee-input" 
                        type="digit" 
                        v-model="form.fee" 
                        placeholder="0"
                        @input="onFeeInput"
                    />
                    <text class="fee-unit">元</text>
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
             <view class="option-tag" @click="openCurrencyPicker('source')" v-if="currentTab !== 'transfer'">

                 <text class="tag-icon">🌍</text>

                 <text>{{ form.currency }}</text>

             </view>

             <view class="option-tag" @click="openCurrencyPicker('source')" v-if="currentTab === 'transfer'">

                 <text class="tag-icon">💸</text>

                 <text>转出 {{ form.currency }}</text>

             </view>

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
                <text class="currency">{{ displayCurrencySymbol }}</text>
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
    <!-- Currency Picker Modal -->

    <view v-if="showCurrencyPicker" class="picker-mask" @click="showCurrencyPicker = false">

        <view class="picker-modal neu-card" @click.stop>

            <view class="picker-title">选择币种</view>

            <view class="asset-list">

                <view

                    v-for="c in currencies"

                    :key="c.code"

                    class="asset-option"

                    @click="selectCurrency(c.code)"

                >

                    {{ c.name }} ({{ c.code }})

                </view>

            </view>

        </view>

    </view>

    

  </view>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'

import { useBillStore } from '@/store/bill'

import { CURRENCIES, getCurrencySymbol } from '@/utils/currency'


const categoryStore = useCategoryStore()
const assetStore = useAssetStore()
const billStore = useBillStore()

// 编辑模式相关
const isEditMode = ref(false)
const editBillId = ref('')

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

const showCurrencyPicker = ref(false)

const pickingAssetType = ref('source')

const pickingCurrencyType = ref('source')

const currencies = CURRENCIES

const form = reactive({
    amountStr: '0',
    remark: '',
    date: new Date().toISOString().split('T')[0],
    assetId: '',
    parentCategoryId: '', // 一级分类ID，用于层级展示
    categoryId: '', // 实际分类ID（可以是父级或子级）
    currency: 'CNY',
    targetCurrency: 'CNY',
    targetAmountStr: '',
    isIncludedInStats: true,
    // 转账相关字段
    targetAssetId: '',
    fee: '0' // 手续费
})

const categories = computed(() => {
    return categoryStore.categories.filter(c => c.type === currentTab.value && !c.hidden)
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

const displayCurrencySymbol = computed(() => {
    return getCurrencySymbol(form.currency)
})

const displayTransferInAmount = computed(() => {
    return form.targetAmountStr || '0'
})

// Watch categories change to ensure selection is valid
import { watch } from 'vue'
watch(categories, (newVal) => {
    if (newVal.length > 0) {
        // 编辑模式下，如果已经有分类选择，不要自动覆盖
        if (isEditMode.value && (selectedCategoryId.value || form.categoryId)) {
            // 检查当前选中的分类是否在新列表中
            const exists = newVal.find(c => c.id === selectedCategoryId.value)
            if (!exists && form.categoryId) {
                // 如果当前选中的分类不存在，但form中有categoryId，尝试找到对应的父分类
                const parentCat = newVal.find(c => c.children && c.children.some(child => child.id === form.categoryId))
                if (parentCat) {
                    selectedParentId.value = parentCat.id
                    selectedCategoryId.value = parentCat.id
                }
            }
            return
        }
        
        // 非编辑模式或没有选择时，选择第一个分类
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
    // 只有在非编辑模式下才自动选择第一个分类
    if (categories.value.length > 0 && !isEditMode.value) {
        selectCategory(categories.value[0])
    }
})

// 处理编辑模式
onLoad((options) => {
    if (options.id) {
        // 编辑模式
        isEditMode.value = true
        editBillId.value = options.id
        loadBillData(options.id)
    } else if (options.type) {
        // 新增模式，指定类型
        currentTab.value = options.type
    }
})

// 加载账单数据
const loadBillData = (id) => {
    const bill = billStore.bills.find(b => b.id === id)
    if (!bill) {
        uni.showToast({ title: '账单不存在', icon: 'none' })
        uni.navigateBack()
        return
    }
    
    console.log('加载账单数据:', bill)
    console.log('账单类型:', bill.type)
    console.log('账单分类:', bill.categoryId, '父分类:', bill.parentCategoryId)
    
    // 设置当前标签页
    currentTab.value = bill.type
    
    // 填充表单数据
    form.amountStr = Math.abs(bill.amount).toString()
    form.remark = bill.remark || ''
    form.date = new Date(bill.timestamp).toISOString().split('T')[0]
    form.assetId = bill.assetId
    form.parentCategoryId = bill.parentCategoryId
    form.categoryId = bill.categoryId
    form.currency = bill.currency || 'CNY'
    form.targetCurrency = bill.targetCurrency || bill.currency || 'CNY'
    form.targetAmountStr = bill.targetAmount !== undefined ? Math.abs(Number(bill.targetAmount || 0)).toString() : ''
    form.isIncludedInStats = bill.isIncludedInStats
    
    // 如果是转账，设置目标账户和手续费
    if (bill.type === 'transfer') {
        form.targetAssetId = bill.targetAssetId
        form.targetAmountStr = bill.targetAmount !== undefined ? Math.abs(Number(bill.targetAmount || 0)).toString() : ''

        form.targetCurrency = bill.targetCurrency || bill.currency || 'CNY'

        form.fee = bill.fee ? bill.fee.toString() : '0'
    }
    
    // 设置选中的分类
    if (bill.parentCategoryId) {
        selectedParentId.value = bill.parentCategoryId
        selectedCategoryId.value = bill.parentCategoryId
    } else if (bill.categoryId) {
        // 如果没有parentCategoryId，尝试找到父分类
        const parentCat = categoryStore.categories.find(c => 
            c.children && c.children.some(child => child.id === bill.categoryId)
        )
        if (parentCat) {
            selectedParentId.value = parentCat.id
            selectedCategoryId.value = parentCat.id
        } else {
            // 如果本身就是父分类
            selectedParentId.value = bill.categoryId
            selectedCategoryId.value = bill.categoryId
        }
    }
}

const switchTab = (val) => {
    currentTab.value = val
    if (val === 'transfer') {
        form.isIncludedInStats = true

        form.currency = form.currency || 'CNY'
        if (!form.targetCurrency) form.targetCurrency = 'CNY'
        if (!form.targetAssetId && assets.value.length > 1) {
            form.targetAssetId = assets.value.find(a => a.id !== form.assetId)?.id || ''
        }
        if (!form.fee) {
            form.fee = '0'
        }
    } else {
        form.isIncludedInStats = true
        form.fee = '0'
        form.targetAmountStr = ''
        form.targetCurrency = form.currency
        form.targetAssetId = ''
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

const openCurrencyPicker = (type) => {

    pickingCurrencyType.value = type

    showCurrencyPicker.value = true

}



const isSameTransferCurrency = () => {
    return currentTab.value === 'transfer' && form.currency === form.targetCurrency
}

const syncTargetAmountFromSource = () => {
    if (isSameTransferCurrency()) {
        form.targetAmountStr = form.amountStr === '0' ? '' : form.amountStr
    }
}

const syncSourceAmountFromTarget = () => {
    if (isSameTransferCurrency()) {
        form.amountStr = form.targetAmountStr || '0'
    }
}

const syncSameCurrencyAmount = () => {
    if (!isSameTransferCurrency()) return

    if (form.amountStr && form.amountStr !== '0') {
        form.targetAmountStr = form.amountStr
    } else if (form.targetAmountStr) {
        form.amountStr = form.targetAmountStr
    }
}

const selectCurrency = (code) => {



    if (pickingCurrencyType.value === 'target') {



        form.targetCurrency = code



    } else {



        form.currency = code



        if (currentTab.value === 'transfer') {



            form.isIncludedInStats = true



        }







        if (currentTab.value !== 'transfer') {



            form.targetCurrency = code



            form.isIncludedInStats = true



        }



    }



    syncSameCurrencyAmount()

    showCurrencyPicker.value = false



}




const onDateChange = (e) => {
    form.date = e.detail.value
}

const onTargetAmountInput = (e) => {
    let value = e.detail.value
    value = value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
    }
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    form.targetAmountStr = value
    syncSourceAmountFromTarget()
}

// 手续费输入处理
const onFeeInput = (e) => {
    let value = e.detail.value
    // 只允许数字和小数点
    value = value.replace(/[^\d.]/g, '')
    // 确保只有一个小数点
    const parts = value.split('.')
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
    }
    // 限制小数点后两位
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    form.fee = value
}

// Keypad Logic
const onKey = (key) => {
    if (key === 'del') {
        if (form.amountStr.length > 1) {
            form.amountStr = form.amountStr.slice(0, -1)
        } else {
            form.amountStr = '0'
        }
        syncTargetAmountFromSource()
        return
    }
    
    if (['+', '-'].includes(key)) {
        return
    }

    if (key === '.') {
        if (form.amountStr.includes('.')) return
        form.amountStr += '.'
        syncTargetAmountFromSource()
        return
    }

    if (form.amountStr === '0') {
        form.amountStr = key
    } else {
        if (form.amountStr.length < 10) {
             form.amountStr += key
        }
    }

    syncTargetAmountFromSource()
}

const resetForm = () => {

    form.amountStr = '0'

    form.remark = ''

    if (currentTab.value !== 'transfer') {

        form.isIncludedInStats = true

    }

    if (currentTab.value === 'transfer') {

        form.fee = '0'

        form.targetAmountStr = ''

    }

}


const submit = async () => {
    const val = parseFloat(form.amountStr)

    if (currentTab.value === 'transfer') {
        if (!form.assetId) {
             uni.showToast({ title: '请选择转出账户', icon: 'none' })
             return
        }
        if (!form.targetAssetId) {
             uni.showToast({ title: '请选择转入账户', icon: 'none' })
             return
        }
        if (!form.currency) {
             uni.showToast({ title: '请选择转出币种', icon: 'none' })
             return
        }
        if (!form.targetCurrency) {
             uni.showToast({ title: '请选择转入币种', icon: 'none' })
             return
        }
        if (!val || val <= 0) {
             uni.showToast({ title: '请输入转出金额', icon: 'none' })
             return
        }

        const targetVal = parseFloat(form.targetAmountStr)
        if (!targetVal || targetVal <= 0) {
             uni.showToast({ title: '请输入转入金额', icon: 'none' })
             return
        }

        const feeVal = form.fee === '' ? 0 : parseFloat(form.fee)
        if (Number.isNaN(feeVal) || feeVal < 0) {
             uni.showToast({ title: '请输入正确手续费', icon: 'none' })
             return
        }
    } else {
        if (!form.assetId) {
             uni.showToast({ title: '请选择账户', icon: 'none' })
             return
        }
        if (!form.currency) {
             uni.showToast({ title: '请选择币种', icon: 'none' })
             return
        }
        if (!form.categoryId) {
             uni.showToast({ title: '请选择分类', icon: 'none' })
             return
        }
        if (!val || val <= 0) {
             uni.showToast({ title: currentTab.value === 'income' ? '请输入收入金额' : '请输入支出金额', icon: 'none' })
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
        // 如果是编辑模式，保留原有的时分秒，只更新日期
        // 或者简单起见，如果日期没变，保留原时间戳；如果日期变了，设为该日期的当前时间
        // 这里采用：保留原时间戳的时分秒，更新年月日
        let timestamp
        if (isEditMode.value) {
            const originalBill = billStore.bills.find(b => b.id === editBillId.value)
            const originalDate = new Date(originalBill.timestamp)
            const selectedDate = new Date(form.date)
            
            timestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                originalDate.getHours(),
                originalDate.getMinutes(),
                originalDate.getSeconds(),
                originalDate.getMilliseconds()
            ).getTime()
        } else {
            const now = new Date()
            const selectedDate = new Date(form.date)
            timestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds(),
                now.getMilliseconds()
            ).getTime()
        }

        const billData = {
            amount: finalAmount,
            currency: form.currency,
            targetAmount: currentTab.value === 'transfer' ? Math.abs(parseFloat(form.targetAmountStr) || 0) : undefined,
            targetCurrency: currentTab.value === 'transfer' ? form.targetCurrency : form.currency,
            parentCategoryId: form.parentCategoryId, // 保留一级分类用于展示
            categoryId: form.categoryId, // 实际分类ID
            assetId: form.assetId,
            targetAssetId: currentTab.value === 'transfer' ? form.targetAssetId : undefined,
            type: currentTab.value,
            timestamp: timestamp,
            remark: form.remark,
            isIncludedInStats: form.isIncludedInStats,
            // 添加手续费字段
            fee: currentTab.value === 'transfer' ? parseFloat(form.fee) || 0 : undefined
        }

        if (isEditMode.value) {
            await billStore.updateBill(editBillId.value, billData)
            uni.showToast({ title: '已更新' })
        } else {
            await billStore.addBill(billData)
            uni.showToast({ title: '已保存' })
        }
        
        resetForm()
        // Optional: navigate back or stay? "再记" implies stay, "保存" implies close?
        // User image has both. "保存" usually closes.
        uni.navigateBack()
    } catch (e) {
        console.error(e)
        uni.showToast({ title: isEditMode.value ? '更新失败' : '保存失败', icon: 'none' })
    }
}

</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%; /* Match page height */
  /* height: calc(100vh - var(--window-top)); */ /* Try this for H5 if navbar issue persists */
  background: var(--app-bg);
  overflow: hidden;
}

/* Header Tabs */
.header-tabs {
    display: flex;
    justify-content: center;
    padding-top: 20px;
    padding-bottom: 10px;
    background: transparent;
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
        background: rgba(35, 48, 65, 0.84);
        box-shadow: 0 10px 22px rgba(35, 48, 65, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.18);
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
    background: var(--glass-bg-soft);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow-soft);
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
        border: 1px solid var(--glass-border);
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
        border: 2px solid rgba(255, 255, 255, 0.78);
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
        background: var(--glass-bg-strong);
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
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: 30px 30px 0 0;
    box-shadow: var(--glass-shadow);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
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
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    padding: 5px 12px;
    border-radius: 15px;
    margin-right: 10px;
    font-size: 12px;
    color: var(--color-text);
    box-shadow: var(--glass-shadow-soft);
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
    background: var(--glass-bg-soft);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 5px;
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
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
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 500;
    color: var(--color-text);
    box-shadow: var(--glass-shadow-soft);
    
    &:active {
        background: rgba(255, 255, 255, 0.78);
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
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    box-shadow: var(--glass-shadow);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
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

    align-items: flex-start;

    padding: 20px;

    overflow-y: auto;

}



.transfer-card {

    width: 100%;

    background: var(--glass-bg);
    border: 1px solid var(--glass-border);

    border-radius: 20px;

    padding: 20px;

    box-shadow: var(--glass-shadow);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);

    display: flex;

    flex-direction: column;

    justify-content: flex-start;

    min-height: 0;

    height: auto;

    box-sizing: border-box;

}

.transfer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-radius: 15px;
    background: var(--glass-bg-soft);
    border: 1px solid var(--glass-border);
    margin-bottom: 10px;
    &:active {
        background: rgba(255, 255, 255, 0.72);
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

.fee-input {

    width: 110px;

    text-align: right;

    font-size: 16px;

    color: var(--color-text);

    border: none;

    background: transparent;

    outline: none;

}

.fee-unit {
    font-size: 14px;
    color: var(--color-text-light);
    margin-left: 5px;
}
</style>
