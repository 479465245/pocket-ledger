<template>
  <view class="container">
    <scroll-view scroll-y class="bill-scroll">
        <view class="bill-list">
            <view v-if="filteredBills.length === 0" class="empty-tip">暂无账单</view>
            <view v-for="bill in filteredBills" :key="bill.id" class="neu-card bill-item" :class="getBillStateClass(bill)" @longpress="deleteBill(bill.id)">
                <view class="bill-left">
                    <view class="icon-box">
                        <text class="category-icon">{{ bill.type === 'transfer' ? '⇄' : bill.type === 'refund' ? '↩' : '¥' }}</text>
                    </view>
                    <view class="bill-info">
                        <view class="category-row">
                            <text class="category-name">{{ getCategoryName(bill) }}</text>
                            <text v-if="bill.type === 'refund'" class="state-badge refund">退款单</text>
                            <text v-else-if="bill.isRefunded" class="state-badge refunded">已退款</text>
                        </view>
                        <text class="bill-date">{{ formatDate(bill.timestamp) }} | {{ getAssetName(bill.assetId) }}</text>
                        <text class="bill-remark" v-if="bill.remark">{{ bill.remark }}</text>
                    </view>
                </view>
                <view class="bill-right">
                    <text :class="['bill-amount', getAmountClass(bill)]">
                        {{ getDisplayAmount(bill) }}
                    </text>
                </view>
            </view>
        </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

const params = ref({})

onLoad((options) => {
    params.value = options
    billStore.init()
    categoryStore.init()
    assetStore.init()
    
    // Set Title based on context
    setTimeout(() => {
        let title = '账单明细'
        if (params.value.id) {
            const name = categoryStore.getCategoryName(params.value.id)
            if (name === 'Unknown') {
                console.warn('Unknown category ID in title:', params.value.id)
                title = '分类明细' // 使用通用标题
            } else if (params.value.filterType === 'parent_other') {
                title = `${name} (其他) 明细`
            } else {
                title = `${name}明细`
            }
        }
        uni.setNavigationBarTitle({ title })
    }, 100)
})

const filteredBills = computed(() => {
    const { id, filterType, period, date, type } = params.value
    
    let start, end
    if (period === 'month') {
        const [y, m] = date.split('-').map(Number)
        start = new Date(y, m - 1, 1).getTime()
        end = new Date(y, m, 0, 23, 59, 59, 999).getTime()
    } else {
        const y = Number(date)
        start = new Date(y, 0, 1).getTime()
        end = new Date(y, 11, 31, 23, 59, 59, 999).getTime()
    }

    return billStore.bills.filter(b => {
        // Time & Type Filter
        if (b.timestamp < start || b.timestamp > end) return false
        if (b.type !== type) return false
        if (b.isIncludedInStats === false) return false

        // Category Filter
        if (filterType === 'parent') {
            return b.parentCategoryId === id
        } else if (filterType === 'sub') {
            return b.categoryId === id
        } else if (filterType === 'parent_other') {
            return b.parentCategoryId === id && (!b.categoryId || b.categoryId === id)
        }
        
        return false
    }).sort((a, b) => b.timestamp - a.timestamp)
})

const getCategoryName = (bill) => {
    if (bill.type === 'transfer') return '转账'
    // 优先使用categoryId获取分类名称
    if (bill.categoryId) {
        const name = categoryStore.getCategoryName(bill.categoryId)
        if (name !== 'Unknown') {
            return name
        }
        console.warn('Unknown category:', bill.categoryId, 'for bill:', bill.id)
    }
    // 如果categoryId无效，回退到parentCategoryId
    const parentName = categoryStore.getCategoryName(bill.parentCategoryId)
    if (parentName === 'Unknown') {
        console.warn('Unknown parentCategory:', bill.parentCategoryId, 'for bill:', bill.id)
    }
    return parentName
}

const getAssetName = (id) => {
    const asset = assetStore.getAsset(id)
    return asset ? asset.name : '未知资产'
}

const formatDate = (ts) => {
    return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getDisplayAmount = (bill) => {
    const amount = Number(bill.amount || 0).toFixed(2)
    return Number(bill.amount) > 0 ? `+${amount}` : amount
}

const getAmountClass = (bill) => {
    return Number(bill.amount) >= 0 ? 'income' : 'expense'
}

const getBillStateClass = (bill) => {
    if (bill.type === 'refund') return 'is-refund'
    if (bill.isRefunded) return 'is-refunded'
    return ''
}

const deleteBill = (id) => {
    uni.showModal({
        title: '删除账单',
        content: '确定要删除这条账单吗？',
        success: (res) => {
            if (res.confirm) {
                billStore.deleteBill(id)
            }
        }
    })
}
</script>

<style lang="scss" scoped>
.container {
  height: 100%;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fixed-header {
    flex-shrink: 0;
    background: var(--color-bg);
    padding-bottom: 10px;
    z-index: 10;
}

.nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    padding-top: 20px; 
}

.back-btn {
    font-size: 24px;
    color: var(--color-text);
    width: 40px;
}

.page-title {
    font-size: 18px;
    font-weight: bold;
    color: var(--color-text);
}

.placeholder {
    width: 40px;
}

.bill-scroll {
    flex: 1;
    overflow-y: hidden;
}

.bill-list {
    padding: 20px;
}

.empty-tip {
    text-align: center;
    color: var(--color-text-light);
    margin-top: 50px;
}

.bill-item {
  padding: 15px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bill-left {
    display: flex;
    align-items: center;
}

.icon-box {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #FFF9F0;
    box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    color: var(--color-primary);
    font-weight: bold;
}

.bill-info {
  display: flex;
  flex-direction: column;
}
.category-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-text);
}
.bill-date {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
}
.bill-remark {
    font-size: 12px;
    color: var(--color-text-light);
    margin-top: 2px;
    font-style: italic;
}
.bill-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}
.bill-amount {
  font-size: 18px;
  font-weight: bold;
}
.expense { color: var(--color-text); }
.income { color: var(--color-primary); }
</style>
