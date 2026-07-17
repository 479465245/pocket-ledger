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
        <view class="report-entry-list">
            <view class="report-entry neu-card" @click="openReport('/pages/stats/trend')">
                <view class="report-entry-icon trend-icon">↗</view>
                <view class="report-entry-info">
                    <text class="report-entry-title">收支趋势</text>
                    <text class="report-entry-desc">按日或按月查看收入、支出和净收支变化</text>
                </view>
                <text class="report-entry-arrow">›</text>
            </view>
            <view class="report-entry neu-card" @click="openReport('/pages/stats/annual')">
                <view class="report-entry-icon annual-icon">★</view>
                <view class="report-entry-info">
                    <text class="report-entry-title">年度收支总结</text>
                    <text class="report-entry-desc">查看全年收支、储蓄率和分类排行</text>
                </view>
                <text class="report-entry-arrow">›</text>
            </view>
            <view class="report-entry neu-card" @click="openReport('/pages/stats/assets')">
                <view class="report-entry-icon asset-icon">▣</view>
                <view class="report-entry-info">
                    <text class="report-entry-title">账户余额和资产变化</text>
                    <text class="report-entry-desc">查看各账户统计余额及期间变化</text>
                </view>
                <text class="report-entry-arrow">›</text>
            </view>
        </view>

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
                    <!-- Leader Lines: use view instead of svg for WeChat Mini Program -->
                    <block v-for="label in chartLabels" :key="'lines-' + label.id">
                        <view
                            v-for="(line, lineIndex) in label.lineStyles"
                            :key="lineIndex"
                            class="leader-line"
                            :style="line"
                        ></view>
                    </block>

<!-- Text Labels -->
                    <view
                        v-for="label in chartLabels"
                        :key="label.id"
                        class="chart-label neu-card-small"
                        :style="label.style"
                    >
                        <text class="lbl-name">{{ label.name }}</text>
                        <text class="lbl-amount">{{ label.amount }}</text>
                        <text class="lbl-percent">{{ label.percent }}</text>
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
                        <text class="chevron">›</text>
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
import { decodeHtmlEntities } from '@/utils/text'
import { formatCurrencyAmount } from '@/utils/currency'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '账单统计 - 记账本', path: '/pages/stats/index' })

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
        const pid = bill.parentCategoryId || 'unknown'
        const key = `${pid}__${currency}`
        if (!map[key]) {
            const cat = categoryStore.categories.find(c => c.id === pid)
            map[key] = {
                statKey: key,
                id: pid,
                currency,
                name: decodeHtmlEntities(cat ? cat.name : '未知分类'),
                icon: cat ? cat.icon : '❓',
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



    const rawLabels = []

    let currentPercent = 0



    // 移动端空间有限：外置标签只展示主要分类，其余在下方列表完整展示

    const R = 100
    const R_elbow = 118
    const X_end = 105
    const LABEL_GAP = 8
    const LABEL_WIDTH = 82

    const MIN_PERCENT = 3

    const MAX_LABELS = 8

    const MIN_GAP = 44

    const TOP_LIMIT = -132

    const BOTTOM_LIMIT = 132



    categoryStats.value.forEach(item => {

        const p = item.percent

        const midPercent = currentPercent + p / 2

        const angle = midPercent / 100 * 2 * Math.PI

        currentPercent += p



        if (p <= MIN_PERCENT || rawLabels.length >= MAX_LABELS) return



        const isRight = Math.sin(angle) >= 0

        const x1 = R * Math.sin(angle)

        const y1 = -R * Math.cos(angle)

        const x2 = R_elbow * Math.sin(angle)

        const y2 = -R_elbow * Math.cos(angle)

        const x3 = isRight ? X_end : -X_end



        rawLabels.push({

            id: item.statKey || item.id,

            name: decodeHtmlEntities(item.name),

            percent: p.toFixed(1) + '%',

            amount: item.displayAmount,

            color: item.color,

            isRight,

            x1,

            y1,

            x2,

            y2,

            x3,

            y3: y2

        })

    })



    const resolveSide = (sideLabels) => {

        const labels = [...sideLabels].sort((a, b) => a.y3 - b.y3)



        labels.forEach((label, index) => {

            const minY = index === 0 ? TOP_LIMIT : labels[index - 1].y3 + MIN_GAP

            label.y3 = Math.max(TOP_LIMIT, Math.min(BOTTOM_LIMIT, label.y3))

            if (label.y3 < minY) label.y3 = minY

        })



        const overflow = labels.length ? labels[labels.length - 1].y3 - BOTTOM_LIMIT : 0

        if (overflow > 0) {

            labels.forEach(label => {

                label.y3 -= overflow

            })

        }



        labels.forEach((label, index) => {

            const minY = index === 0 ? TOP_LIMIT : labels[index - 1].y3 + MIN_GAP

            if (label.y3 < minY) label.y3 = minY

        })



        return labels

    }



    const adjusted = [

        ...resolveSide(rawLabels.filter(label => !label.isRight)),

        ...resolveSide(rawLabels.filter(label => label.isRight))

    ]



    return adjusted.map(label => {
        const labelEdgeX = label.isRight ? label.x3 + LABEL_GAP : label.x3 - LABEL_GAP
        const buildLineStyle = (fromX, fromY, toX, toY) => {
            const dx = toX - fromX
            const dy = toY - fromY
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx) * 180 / Math.PI
            return {
                position: 'absolute',
                left: fromX + 'px',
                top: fromY + 'px',
                width: length + 'px',
                height: '2px',
                backgroundColor: label.color,
                opacity: 0.8,
                transform: 'rotate(' + angle + 'deg)',
                transformOrigin: '0 50%',
                zIndex: 2
            }
        }
        const lineStyles = [
            buildLineStyle(label.x1, label.y1, label.x2, label.y2),
            buildLineStyle(label.x2, label.y2, labelEdgeX, label.y3)
        ]
        const style = {
            top: label.y3 + 'px',
            left: labelEdgeX + 'px',
            transform: label.isRight ? 'translate(0, -50%)' : 'translate(-100%, -50%)',
            textAlign: label.isRight ? 'left' : 'right',
            alignItems: label.isRight ? 'flex-start' : 'flex-end',
            zIndex: 6,
            maxWidth: LABEL_WIDTH + 'px'
        }



        return {

            id: label.id,

            name: decodeHtmlEntities(label.name),

            percent: label.percent,

            amount: label.amount,

            color: label.color,
            lineStyles,

            style,

            isRight: label.isRight

        }

    })

})

const openReport = (url) => {
    uni.navigateTo({ url })
}

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
            background: var(--color-bg);
            color: var(--color-primary);
            box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;
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
    background: var(--color-bg);
    box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;

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
    box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;
    flex-shrink: 0;
}

.pie-hole {
    position: absolute;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: var(--color-bg);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;
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
    pointer-events: none;
    transform: translate(-50%, -50%);
    overflow: visible;
    z-index: 5;
}

.leader-line {
    position: absolute;
    display: block;
    border-radius: 2px;
    pointer-events: none;
}



.chart-label {

    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.95);
    padding: 4px 8px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    pointer-events: none;
    white-space: nowrap;
    backdrop-filter: blur(2px);
    border: 1px solid rgba(255,255,255,0.3);

    .lbl-name {
        font-size: 11px;
        color: var(--color-text);
        font-weight: 600;
        line-height: 1.3;
        max-width: 70px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .lbl-amount {
        font-size: 10px;
        color: var(--color-text-light);
        line-height: 1.2;
        opacity: 0.9;
        max-width: 70px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .lbl-percent {
        font-size: 10px;
        color: var(--color-primary);
        line-height: 1.2;
        font-weight: 600;
        opacity: 0.95;
    }
}

.report-entry-list {
    margin-bottom: 20px;
}

.report-entry {
    display: flex;
    align-items: center;
    padding: 14px;
    margin-bottom: 12px;
}

.report-entry-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-size: 20px;
    font-weight: bold;
}

.trend-icon {
    color: var(--color-primary);
    background: rgba(255, 141, 93, 0.16);
}

.asset-icon {
    color: var(--color-secondary);
    background: rgba(136, 177, 148, 0.18);
}

.report-entry-info {
    flex: 1;
    min-width: 0;
}

.report-entry-title {
    display: block;
    color: var(--color-text);
    font-size: 15px;
    font-weight: bold;
}

.report-entry-desc {
    display: block;
    margin-top: 4px;
    color: var(--color-text-light);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.report-entry-arrow {
    margin-left: 8px;
    color: var(--color-text-light);
    font-size: 22px;
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
    background: #FFF9F0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    box-shadow: inset -6px -6px 16px #ffffff, inset 6px 6px 16px #a3b1c6;
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
        .lbl-amount,
        .lbl-percent {
            font-size: 9px;
        }
    }
}
</style>
