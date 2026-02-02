<template>
  <view class="container">
    <view class="header-wrapper">
        <view class="header neu-card">
            <view class="type-switch">
                <text :class="['type-btn', currentType === 'expense' ? 'active' : '']" @click="currentType = 'expense'">支出</text>
                <text :class="['type-btn', currentType === 'income' ? 'active' : '']" @click="currentType = 'income'">收入</text>
            </view>
            <view class="total-amount">
                <text class="currency">¥</text>
                <text class="value">{{ totalAmount }}</text>
            </view>
        </view>
    </view>

    <scroll-view scroll-y class="chart-scroll">
        <view class="chart-area">
            <!-- Simple Bar Chart Representation -->
            <view v-for="item in categoryStats" :key="item.id" class="stat-item">
                <view class="stat-info">
                    <text class="cat-name">{{ item.name }}</text>
                    <text class="cat-amount">{{ item.amount.toFixed(2) }}</text>
                </view>
                <view class="progress-bg neu-inset">
                    <view class="progress-bar" :style="{ width: item.percent + '%' }"></view>
                </view>
            </view>
            
            <view v-if="categoryStats.length === 0" class="empty-tip">本月无数据</view>
        </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'

const billStore = useBillStore()
const categoryStore = useCategoryStore()

const currentType = ref('expense')

onShow(() => {
    billStore.init()
    categoryStore.init()
})

const currentMonthBills = computed(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime()
    
    return billStore.bills.filter(b => 
        b.timestamp >= start && 
        b.timestamp <= end && 
        b.type === currentType.value
    )
})

const totalAmount = computed(() => {
    return currentMonthBills.value.reduce((acc, cur) => acc + Math.abs(cur.amount), 0).toFixed(2)
})

const categoryStats = computed(() => {
    const map = {}
    const total = parseFloat(totalAmount.value) || 1 // Avoid divide by zero
    
    currentMonthBills.value.forEach(bill => {
        // Aggregate by Parent Category
        const pid = bill.parentCategoryId
        if (!map[pid]) {
            map[pid] = {
                id: pid,
                name: categoryStore.getCategoryName(pid), // This might return child name if not careful, but getCategoryName handles ID lookup
                amount: 0
            }
            // Fix name lookup if getCategoryName returns unknown or child
            const parent = categoryStore.categories.find(c => c.id === pid)
            if (parent) map[pid].name = parent.name
        }
        map[pid].amount += Math.abs(bill.amount)
    })
    
    return Object.values(map)
        .sort((a, b) => b.amount - a.amount)
        .map(item => ({
            ...item,
            percent: (item.amount / total) * 100
        }))
})
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-wrapper {
    padding: 20px;
    flex-shrink: 0;
}

.header {
    padding: 20px;
    /* margin-bottom: 30px; */ /* Moved to wrapper padding or just space */
    display: flex;
    flex-direction: column;
    align-items: center;
}

.type-switch {
    display: flex;
    background: var(--color-bg);
    padding: 5px;
    border-radius: 20px;
    box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
    margin-bottom: 20px;
    
    .type-btn {
        padding: 8px 25px;
        border-radius: 15px;
        color: var(--color-text-light);
        font-size: 14px;
        transition: all 0.3s;
        
        &.active {
            background: var(--color-bg);
            color: var(--color-primary);
            box-shadow: var(--shadow-light), var(--shadow-dark);
            font-weight: bold;
        }
    }
}

.total-amount {
    font-size: 36px;
    font-weight: bold;
    color: var(--color-text);
    
    .currency { font-size: 20px; margin-right: 5px; }
}

.chart-scroll {
    flex: 1;
    overflow-y: hidden;
}

.chart-area {
    padding: 20px; /* Add padding here instead of container */
    padding-top: 0;
}

.stat-item {
    margin-bottom: 25px;
}

.stat-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--color-text);
}

.progress-bg {
    height: 12px;
    border-radius: 6px;
    background: var(--color-bg);
    box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
    overflow: hidden;
    position: relative;
}

.progress-bar {
    height: 100%;
    background: var(--color-primary);
    border-radius: 6px;
}

.empty-tip {
    text-align: center;
    color: var(--color-text-light);
    margin-top: 50px;
}
</style>
