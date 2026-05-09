<template>
  <view class="container">
    <view class="fixed-header">
        <!-- Period Switch & Date Picker -->
        <view class="filter-bar">
            <view class="period-switch neu-inset">
                <view :class="['period-btn', periodType === 'month' ? 'active' : '']" @click="setPeriod('month')">月</view>
                <view :class="['period-btn', periodType === 'year' ? 'active' : '']" @click="setPeriod('year')">年</view>
            </view>
            <picker :mode="periodType === 'month' ? 'date' : 'date'" :fields="periodType" :value="pickerValue" @change="onDateChange">
                <view class="date-picker-btn neu-btn-small">
                    <text>{{ displayDate }}</text>
                    <text class="arrow">▼</text>
                </view>
            </picker>
        </view>

        <!-- Total & Type Switch -->
        <view class="summary-card neu-card">
            <view class="type-tabs">
                <text :class="['tab', currentType === 'expense' ? 'active' : '']" @click="currentType = 'expense'">支出</text>
                <text class="divider">|</text>
                <text :class="['tab', currentType === 'income' ? 'active' : '']" @click="currentType = 'income'">收入</text>
            </view>
            <view class="total-row multi-total">
                <text class="amount multi-amount">{{ totalAmount }}</text>
            </view>
        </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
        <view class="content-wrapper">
            <!-- Pie Chart -->
            <view class="chart-container" v-if="categoryStats.length > 0">
                <view class="pie-chart" :style="{ background: pieGradient }"></view>
                <!-- Center Hole for Donut Chart effect -->
                <view class="pie-hole neu-card">
                    <view class="center-total">
                        <text class="label">总计</text>
                        <text class="value">{{ totalAmount }}</text>
                    </view>
                </view>
                
                <!-- Labels Overlay -->
                <view class="chart-labels">
                    <!-- SVG for Leader Lines -->
                    <svg class="lines-svg" viewBox="-180 -160 360 320" style="width: 360px; height: 320px;">
                        <path 
                            v-for="label in chartLabels" 
                            :key="'line-'+label.id" 
                            :d="label.linePath"
                            fill="none"
                            :stroke="label.color"
                            stroke-width="1.5"
                            stroke-dasharray="4,3"
                            opacity="0.7"
                        />
                    </svg>

                    <!-- Text Labels -->
                    <view 
                        v-for="label in chartLabels" 
                        :key="label.id" 
                        class="chart-label neu-card-small"
                        :style="label.style"
                    >
                        <text class="lbl-name">{{ label.name }}</text>
                        <text class="lbl-detail">{{ label.percent }} {{ label.amount }}</text>
                    </view>
                </view>
            </view>

            <!-- List -->
            <view class="stat-list">
                <view v-for="(item, index) in categoryStats" :key="item.statKey || item.id" class="stat-item neu-card" @click="onItemClick(item)">
                    <view class="item-left">
                        <view class="color-dot" :style="{ background: item.color }"></view>
                        <view class="icon-box">
                            <text>{{ item.icon || '📦' }}</text>
                        </view>
                        <view class="name-box">
                            <text class="name">{{ item.name }}</text>
                            <text class="percent">{{ item.percent.toFixed(1) }}%</text>
                        </view>
                    </view>
                    <view class="item-right">
                        <text class="item-amount">{{ item.displayAmount }}</text>
                        <text class="chevron">></text>
                    </view>
                    <!-- Progress Bar (Optional, below) -->
                    <view class="progress-line" :style="{ width: item.percent + '%', background: item.color }"></view>
                </view>
                
                <view v-if="categoryStats.length === 0" class="empty-tip">
                    <text>本周期无数据</text>
                </view>
            </view>
        </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { formatCurrencyAmount } from '@/utils/currency'

const billStore = useBillStore()
const categoryStore = useCategoryStore()

const currentType = ref('expense')
const periodType = ref('month') // 'month' or 'year'
const currentDate = ref(new Date())

// Colors for chart
const PALETTE = [
    '#FF8D5D', '#FFB380', '#FFD1A3', '#FFAB91', '#FFCCBC', 
    '#BCAAA4', '#A1887F', '#8D6E63', '#6D4C41', '#5D4037'
]
// Alternate colorful palette if preferred
// const PALETTE = ['#FF8D5D', '#4FC3F7', '#AED581', '#FFD54F', '#BA68C8', '#E57373', '#90A4AE', '#4DB6AC']

onShow(() => {
    billStore.init()
    categoryStore.init()
})

// Date Logic
const displayDate = computed(() => {
    const y = currentDate.value.getFullYear()
    const m = currentDate.value.getMonth() + 1
    if (periodType.value === 'month') {
        return `${y}年${m}月`
    } else {
        return `${y}年`
    }
})

const pickerValue = computed(() => {
    const y = currentDate.value.getFullYear()
    const m = String(currentDate.value.getMonth() + 1).padStart(2, '0')
    if (periodType.value === 'month') {
        return `${y}-${m}`
    } else {
        return `${y}`
    }
})

const setPeriod = (type) => {
    periodType.value = type
}

const onDateChange = (e) => {
    const val = e.detail.value
    if (periodType.value === 'month') {
        // val is YYYY-MM
        const [y, m] = val.split('-').map(Number)
        currentDate.value = new Date(y, m - 1, 1)
    } else {
        // val is YYYY
        const y = Number(val)
        currentDate.value = new Date(y, 0, 1)
    }
}

// Data Logic
const filteredBills = computed(() => {
    const y = currentDate.value.getFullYear()
    const m = currentDate.value.getMonth()
    
    let start, end
    
    if (periodType.value === 'month') {
        start = new Date(y, m, 1).getTime()
        end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
    } else {
        start = new Date(y, 0, 1).getTime()
        end = new Date(y, 11, 31, 23, 59, 59, 999).getTime()
    }
    
    return billStore.bills.filter(b => 
        b.timestamp >= start && 
        b.timestamp <= end && 
        billStore.getStatType(b) === currentType.value &&
        b.isIncludedInStats !== false
    )
})

const formatAmountMap = (amountMap = {}) => {
    const entries = Object.entries(amountMap).filter(([, amount]) => Number(amount || 0) !== 0)
    if (entries.length === 0) return formatCurrencyAmount(0, 'CNY')
    return entries.map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join(' / ')
}

const totalAmountMap = computed(() => {
    const map = {}
    filteredBills.value.forEach(bill => {
        const currency = bill.currency || 'CNY'
        map[currency] = (map[currency] || 0) + billStore.getStatAmount(bill)
    })
    return map
})

const totalAmount = computed(() => formatAmountMap(totalAmountMap.value))

const categoryStats = computed(() => {
    const map = {}
    const totalForPercent = filteredBills.value.reduce((acc, bill) => acc + billStore.getStatAmount(bill), 0) || 1
    
    filteredBills.value.forEach(bill => {
        const currency = bill.currency || 'CNY'
        const pid = bill.parentCategoryId || (bill.type === 'transfer' ? 'credit-card-repayment' : 'unknown')
        const key = `${pid}__${currency}`
        if (!map[key]) {
            const cat = categoryStore.categories.find(c => c.id === pid)
            map[key] = {
                statKey: key,
                id: pid,
                currency,
                name: cat ? cat.name : (pid === 'credit-card-repayment' ? '信用卡还款' : '未知分类'),
                icon: cat ? cat.icon : (pid === 'credit-card-repayment' ? '💳' : '❓'),
                amount: 0,
                amountMap: {},
                hasChildren: cat ? (cat.children && cat.children.length > 0) : false
            }
        }
        const amount = billStore.getStatAmount(bill)
        map[key].amount += amount
        map[key].amountMap[currency] = (map[key].amountMap[currency] || 0) + amount
    })
    
    const sorted = Object.values(map).sort((a, b) => b.amount - a.amount)
    
    return sorted.map((item, index) => ({
        ...item,
        percent: (item.amount / totalForPercent) * 100,
        displayAmount: formatAmountMap(item.amountMap),
        color: PALETTE[index % PALETTE.length]
    }))
})

// Pie Chart Gradient
const pieGradient = computed(() => {
    if (categoryStats.value.length === 0) return 'none'
    
    let gradient = 'conic-gradient('
    let currentPercent = 0
    
    categoryStats.value.forEach((item, index) => {
        const start = currentPercent
        const end = currentPercent + item.percent
        gradient += `${item.color} ${start}% ${end}%, `
        currentPercent = end
    })
    
    // Remove last comma and close
    gradient = gradient.slice(0, -2) + ')'
    return gradient
})

// Chart Labels
const chartLabels = computed(() => {
    if (categoryStats.value.length === 0) return []
    
    const labels = []
    let currentPercent = 0
    
    // 优化布局参数
    const R = 65       // 饼图半径，稍微减小以适应移动端
    const R_elbow = 85 // 转折点距离
    const X_end = 95   // 水平延伸距离，确保在375px屏幕内
    
    categoryStats.value.forEach(item => {
        const p = item.percent
        if (p > 3) { // 只显示大于3%的标签，避免过于拥挤
            const midPercent = currentPercent + p / 2
            const angle = midPercent / 100 * 2 * Math.PI
            
            const isRight = Math.sin(angle) >= 0
            
            // 计算标签位置
            const x1 = R * Math.sin(angle)
            const y1 = - R * Math.cos(angle)
            
            const x2 = R_elbow * Math.sin(angle)
            const y2 = - R_elbow * Math.cos(angle)
            
            const x3 = isRight ? X_end : -X_end
            const y3 = y2 
            
            // 创建SVG路径
            const linePath = `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}`
            
            // 优化样式，确保标签在两侧且不与饼图重叠
            const style = {
                top: y3 + 'px',
                left: x3 + 'px',
                transform: isRight ? 'translate(8px, -50%)' : 'translate(-108%, -50%)',
                textAlign: isRight ? 'left' : 'right',
                alignItems: isRight ? 'flex-start' : 'flex-end',
                zIndex: 10,
                maxWidth: '80px' // 限制最大宽度，避免在小屏幕上溢出
            }
            
            labels.push({
                id: item.id,
                name: item.name,
                percent: p.toFixed(1) + '%',
                amount: item.displayAmount,
                color: item.color,
                linePath,
                style,
                isRight
            })
        }
        currentPercent += p
    })
    
    return labels
})

// Navigation
const onItemClick = (item) => {
    if (item.hasChildren) {
        // Go to Level 2 Stats
        uni.navigateTo({
            url: `/pages/stats/category?parentId=${item.id}&period=${periodType.value}&date=${pickerValue.value}&type=${currentType.value}&currency=${item.currency || ''}`
        })
    } else {
        // Go to Bill List (Filter by Parent, since no children)
        uni.navigateTo({
            url: `/pages/stats/list?id=${item.id}&filterType=parent&period=${periodType.value}&date=${pickerValue.value}&type=${currentType.value}&currency=${item.currency || ''}`
        })
    }
}
</script>

<style lang="scss" scoped>
.container {
  height: 100%;
  background: var(--app-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fixed-header {
    flex-shrink: 0;
    background: transparent;
    padding-bottom: 10px;
    z-index: 10;
}

.filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
}

.period-switch {
    display: flex;
    padding: 4px;
    border-radius: 12px;
    
    .period-btn {
        padding: 6px 16px;
        font-size: 14px;
        color: var(--color-text-light);
        border-radius: 8px;
        transition: all 0.2s;
        
        &.active {
            background: var(--glass-bg-strong);
            border: 1px solid var(--glass-border);
            color: var(--color-primary);
            box-shadow: var(--glass-shadow-soft);
            font-weight: bold;
        }
    }
}

.date-picker-btn {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 12px;
    font-size: 14px;
    color: var(--color-text);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow-soft);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    
    .arrow {
        margin-left: 6px;
        font-size: 10px;
        color: var(--color-text-light);
    }
}

.summary-card {
    margin: 10px 20px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.type-tabs {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    
    .tab {
        font-size: 16px;
        color: var(--color-text-light);
        padding: 0 10px;
        
        &.active {
            color: var(--color-text);
            font-weight: bold;
        }
    }
    
    .divider {
        color: var(--color-text-light);
        opacity: 0.3;
    }
}

.total-row {
    .currency { font-size: 20px; margin-right: 5px; color: var(--color-text); }
    .amount { font-size: 32px; font-weight: bold; color: var(--color-text); }
}

.content-scroll {
    flex: 1;
    overflow-y: hidden;
}

.content-wrapper {
    padding: 20px;
    padding-top: 0;
}

.chart-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 30px;
    position: relative;
    height: 320px;
    max-width: 100%;
    overflow: visible;
}

.pie-chart {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    /* Gradient handled by inline style */
    box-shadow: var(--glass-shadow);
    flex-shrink: 0;
}

.pie-hole {
    position: absolute;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: var(--glass-shadow-soft);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    display: flex;
    justify-content: center;
    align-items: center;
}

.center-total {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .label {
        font-size: 12px;
        color: var(--color-text-light);
        margin-bottom: 4px;
    }
    .value {
        font-size: 20px;
        font-weight: bold;
        color: var(--color-text);
    }
}

.chart-labels {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none; /* Let clicks pass through to chart/hole if needed */
    transform: translate(-50%, -50%);
}

.chart-label {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: var(--glass-bg-strong);
    padding: 4px 8px;
    border-radius: 8px;
    box-shadow: var(--glass-shadow-soft);
    pointer-events: none;
    white-space: nowrap;
    backdrop-filter: blur(2px);
    border: 1px solid var(--glass-border);
    
    .lbl-name {
        font-size: 11px;
        color: var(--color-text);
        font-weight: 600;
        line-height: 1.3;
        max-width: 70px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .lbl-detail {
        font-size: 10px;
        color: var(--color-text-light);
        line-height: 1.2;
        opacity: 0.9;
    }
}

.stat-list {
    padding-bottom: 40px;
}

.stat-item {
    padding: 15px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
}

.item-left {
    display: flex;
    align-items: center;
    z-index: 1;
}

.color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 10px;
}

.icon-box {
    width: 36px;
    height: 36px;
    background: var(--glass-bg-strong);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
}

.name-box {
    display: flex;
    flex-direction: column;
}

.name {
    font-size: 14px;
    color: var(--color-text);
    font-weight: bold;
}

.percent {
    font-size: 12px;
    color: var(--color-text-light);
}

.item-right {
    display: flex;
    align-items: center;
    z-index: 1;
}

.item-amount {
    font-size: 16px;
    font-weight: bold;
    color: var(--color-text);
    margin-right: 8px;
}

.chevron {
    color: var(--color-text-light);
    font-size: 14px;
}

.progress-line {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    opacity: 0.3;
}

.empty-tip {
    text-align: center;
    color: var(--color-text-light);
    margin-top: 20px;
}

/* 响应式设计 - 适配不同屏幕尺寸 */
@media (max-width: 375px) {
    .chart-container {
        height: 300px;
    }
    
    .pie-chart {
        width: 180px;
        height: 180px;
    }
    
    .pie-hole {
        width: 100px;
        height: 100px;
    }
}

@media (max-width: 320px) {
    .chart-container {
        height: 280px;
    }
    
    .pie-chart {
        width: 160px;
        height: 160px;
    }
    
    .pie-hole {
        width: 90px;
        height: 90px;
    }
    
    .chart-label {
        .lbl-name {
            font-size: 10px;
            max-width: 60px;
        }
        .lbl-detail {
            font-size: 9px;
        }
    }
}
</style>
