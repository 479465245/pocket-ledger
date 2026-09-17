<template>
  <view class="container">
    <view class="fixed-header">
      <!-- Total & Type Switch -->
      <view class="summary-card neu-card">
        <view class="type-tabs">
          <text :class="['tab', currentType === 'expense' ? 'active' : '']" @click="currentType = 'expense'">支出</text>
          <text class="divider">|</text>
          <text :class="['tab', currentType === 'income' ? 'active' : '']" @click="currentType = 'income'">收入</text>
        </view>
        <view class="total-row">
          <text class="amount">{{ totalAmount }}</text>
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
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { decodeHtmlEntities } from '@/utils/text'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { formatCurrencyAmount } from '@/utils/currency'
import { usePageShare } from '@/utils/share'
import { getCategoryStatGroup } from '@/utils/statCategory'

usePageShare({ title: '分类统计 - 记账本', path: '/pages/stats/index' })

const routeParams = ref({
  parentId: '',
  period: 'month',
  date: new Date().toISOString().slice(0, 7),
  type: 'expense',
  currency: ''
})

const billStore = useBillStore()
const categoryStore = useCategoryStore()

const currentType = ref('expense')
const periodType = ref('month')
const pickerValue = ref(new Date().toISOString().slice(0, 7))

const parentCategory = computed(() =>
  categoryStore.categories.find(c => c.id === routeParams.value.parentId)
)

const pageTitle = computed(() => decodeHtmlEntities(parentCategory.value?.name || '分类详情'))

const updateNavigationTitle = () => {
  uni.setNavigationBarTitle({ title: pageTitle.value })
}

onLoad((options = {}) => {
  routeParams.value = {
    parentId: options.parentId || '',
    period: options.period || 'month',
    date: options.date || new Date().toISOString().slice(0, 7),
    type: options.type || 'expense',
    currency: options.currency || ''
  }

  currentType.value = routeParams.value.type
  periodType.value = routeParams.value.period
  pickerValue.value = routeParams.value.date

  billStore.init()
  categoryStore.init()
  updateNavigationTitle()
})

watch(pageTitle, updateNavigationTitle)

const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA']

const totalAmount = computed(() => {
  const map = {}
  categoryStats.value.forEach(item => {
    Object.entries(item.amountMap || {}).forEach(([currency, amount]) => {
      map[currency] = (map[currency] || 0) + Number(amount || 0)
    })
  })
  const entries = Object.entries(map).filter(([, amount]) => Number(amount || 0) !== 0)
  if (entries.length === 0) return formatCurrencyAmount(0, 'CNY')
  return entries.map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join(' / ')
})

const formatAmountMap = (amountMap = {}) => {
  const entries = Object.entries(amountMap).filter(([, amount]) => Number(amount || 0) !== 0)
  if (entries.length === 0) return formatCurrencyAmount(0, routeParams.value.currency || 'CNY')
  return entries.map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join(' / ')
}

const categoryStats = computed(() => {
  const map = {}
  const bills = billStore.bills.filter(bill => {
    const billDate = new Date(bill.timestamp)
    const pickerDate = new Date(pickerValue.value)
    const billCurrency = bill.currency || 'CNY'
    
    let match = false
    if (periodType.value === 'month') {
      match = billDate.getFullYear() === pickerDate.getFullYear() && 
              billDate.getMonth() === pickerDate.getMonth()
    } else {
      match = billDate.getFullYear() === pickerDate.getFullYear()
    }
    
    return match &&
      billStore.getStatType(bill) === currentType.value &&
      bill.isIncludedInStats !== false &&
      bill.parentCategoryId === routeParams.value.parentId &&
      (!routeParams.value.currency || billCurrency === routeParams.value.currency)
  })
  
  const total = bills.reduce((sum, bill) => sum + billStore.getStatAmount(bill), 0)
  if (total === 0) return []
  
  const parent = categoryStore.categories.find(c => c.id === routeParams.value.parentId)
  
  bills.forEach(bill => {
    const currency = bill.currency || 'CNY'
    const group = getCategoryStatGroup(bill, parent)
    const key = `${group.id}__${currency}`
    
    if (!map[key]) {
      map[key] = {
        statKey: key,
        id: group.id,
        currency,
        name: decodeHtmlEntities(group.name),
        icon: group.icon,
        amount: 0,
        amountMap: {},
        isOther: group.isOther
      }
    }
    const amount = billStore.getStatAmount(bill)
    map[key].amount += amount
    map[key].amountMap[currency] = (map[key].amountMap[currency] || 0) + amount
  })
  
  const sorted = Object.values(map).sort((a, b) => b.amount - a.amount)
  
  return sorted.map((item, index) => ({
    ...item,
    percent: (item.amount / total) * 100,
    displayAmount: formatAmountMap(item.amountMap),
    color: PALETTE[index % PALETTE.length]
  }))
})

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
  
  gradient = gradient.slice(0, -2) + ')'
  return gradient
})

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

const onItemClick = (item) => {
  // Go to Bill List (Filter by Category)
  const filterType = item.isOther ? 'parent_other' : 'sub'
  const targetId = item.isOther ? routeParams.value.parentId : item.id
  uni.navigateTo({
    url: `/pages/stats/list?id=${targetId}&filterType=${filterType}&period=${periodType.value}&date=${pickerValue.value}&type=${currentType.value}&currency=${item.currency || routeParams.value.currency || ''}`
  })
}

</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
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
            color: var(--color-primary);
            font-weight: bold;
        }
    }
    
    .divider {
        color: var(--color-text-light);
        opacity: 0.5;
    }
}

.total-row {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    
    .amount {
        font-size: 32px;
        font-weight: bold;
        color: var(--color-text);
    }
}

.content-scroll {
    flex: 1;
    overflow: hidden;
}

.content-wrapper {
    padding: 0 20px 20px;
}

.chart-container {
    position: relative;
    height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
}

.pie-chart {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: #eee;
    box-shadow: 6px 6px 16px #a3b1c6;
}

.pie-hole {
    position: absolute;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;
    
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

.stat-list {
    padding-bottom: 40px;
}

.stat-item {
    padding: 15px;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .item-left {
        display: flex;
        align-items: center;
        flex: 1;
        
        .color-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 12px;
        }
        
        .icon-box {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--color-bg);
            box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;
            margin-right: 12px;
            font-size: 16px;
        }
        
        .name-box {
            flex: 1;
            
            .name {
                font-size: 15px;
                color: var(--color-text);
                display: block;
                margin-bottom: 2px;
            }
            
            .percent {
                font-size: 12px;
                color: var(--color-text-light);
            }
        }
    }
    
    .item-right {
        display: flex;
        align-items: center;
        
        .item-amount {
            font-size: 16px;
            color: var(--color-text);
            font-weight: 500;
            margin-right: 8px;
        }
        
        .chevron {
            font-size: 14px;
            color: var(--color-text-light);
        }
    }
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
