<template>
  <view class="container">
    <view class="fixed-header">
      <!-- Back & Title -->
      <view class="header-bar">
        <text class="back-btn" @click="goBack">‹</text>
        <text class="title">{{ parentCategory?.name || '分类统计' }}</text>
        <text class="placeholder"></text>
      </view>

      <!-- Total & Type Switch -->
      <view class="summary-card neu-card">
        <view class="type-tabs">
          <text :class="['tab', currentType === 'expense' ? 'active' : '']" @click="currentType = 'expense'">支出</text>
          <text class="divider">|</text>
          <text :class="['tab', currentType === 'income' ? 'active' : '']" @click="currentType = 'income'">收入</text>
        </view>
        <view class="total-row">
          <text class="currency">¥</text>
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
              <text class="value">¥{{ totalAmount }}</text>
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
          <view v-for="(item, index) in categoryStats" :key="item.id" class="stat-item neu-card" @click="onItemClick(item)">
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
              <text class="item-amount">{{ item.amount.toFixed(2) }}</text>
              <text class="chevron">></text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'

const props = defineProps({
  parentId: String,
  period: String,
  date: String,
  type: String
})

const billStore = useBillStore()
const categoryStore = useCategoryStore()

const currentType = ref(props.type || 'expense')
const periodType = ref(props.period || 'month')
const pickerValue = ref(props.date || new Date().toISOString().slice(0, 7))

const parentCategory = computed(() => 
  categoryStore.categories.find(c => c.id === props.parentId)
)

const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA']

const totalAmount = computed(() => {
  return categoryStats.value.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
})

const categoryStats = computed(() => {
  const map = {}
  const bills = billStore.bills.filter(bill => {
    const billDate = new Date(bill.timestamp)
    const pickerDate = new Date(pickerValue.value)
    
    let match = false
    if (periodType.value === 'month') {
      match = billDate.getFullYear() === pickerDate.getFullYear() && 
              billDate.getMonth() === pickerDate.getMonth()
    } else {
      match = billDate.getFullYear() === pickerDate.getFullYear()
    }
    
    return match && bill.type === currentType.value && bill.parentCategoryId === props.parentId
  })
  
  // 调试信息
  console.log('categoryStats debug:', {
    parentId: props.parentId,
    currentType: currentType.value,
    periodType: periodType.value,
    pickerValue: pickerValue.value,
    totalBills: billStore.bills.length,
    filteredBills: bills.length,
    firstFewBills: bills.slice(0, 3)
  })
  
  const total = bills.reduce((sum, bill) => sum + Math.abs(bill.amount), 0)
  if (total === 0) return []
  
  // Get parent category info to look up children
  const parent = categoryStore.categories.find(c => c.id === props.parentId)
  
  bills.forEach(bill => {
    let key, name, icon, isOther = false
    
    // Determine if it's a sub-category or "Other" (Parent directly)
    // If subCategoryId exists and is different from parentId, it's a sub-category
    const subId = (bill.subCategoryId && bill.subCategoryId !== props.parentId) ? bill.subCategoryId : null
    
    if (subId) {
        key = subId
        const subCat = parent?.children?.find(c => c.id === subId)
        if (subCat) {
            name = subCat.name
            icon = subCat.icon
        } else {
            console.warn('Sub category not found:', subId, 'for parent:', props.parentId)
            name = '未知子类'
            icon = '❓'
        }
    } else {
        key = 'other'
        name = parent ? parent.name : '其他' // Use parent name instead of '其他'
        icon = parent ? parent.icon : '📦' // Use parent icon or generic
        isOther = true
    }
    
    if (!map[key]) {
      map[key] = {
        id: key, // This will be 'other' or subId
        name,
        icon,
        amount: 0,
        isOther
      }
    }
    map[key].amount += Math.abs(bill.amount)
  })
  
  // 调试分组结果
  console.log('Grouping result:', {
    totalGroups: Object.keys(map).length,
    groups: Object.values(map)
  })
  
  const sorted = Object.values(map).sort((a, b) => b.amount - a.amount)
  
  const result = sorted.map((item, index) => ({
    ...item,
    percent: (item.amount / total) * 100,
    color: PALETTE[index % PALETTE.length]
  }))
  
  // 调试最终结果
  console.log('Final category stats:', {
    totalAmount: total,
    itemCount: result.length,
    items: result
  })
  
  return result
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
        amount: '¥' + Math.round(item.amount),
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

const onItemClick = (item) => {
  // Go to Bill List (Filter by Category)
  const filterType = item.isOther ? 'parent_other' : 'sub'
  const targetId = item.isOther ? props.parentId : item.id
  uni.navigateTo({
    url: `/pages/stats/list?id=${targetId}&filterType=${filterType}&period=${periodType.value}&date=${pickerValue.value}&type=${currentType.value}`
  })
}

const goBack = () => {
  uni.navigateBack()
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

.header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    
    .back-btn {
        font-size: 24px;
        color: var(--color-text);
        padding: 5px;
    }
    
    .title {
        font-size: 18px;
        font-weight: bold;
        color: var(--color-text);
        flex: 1;
        text-align: center;
    }
    
    .placeholder {
        width: 30px;
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
    align-items: baseline;
    
    .currency {
        font-size: 18px;
        color: var(--color-text-light);
        margin-right: 4px;
    }
    
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
    box-shadow: var(--shadow-dark);
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
    box-shadow: var(--shadow-light), var(--shadow-dark);
    
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
            box-shadow: var(--shadow-light), var(--shadow-dark);
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
        .lbl-detail {
            font-size: 9px;
        }
    }
}
</style>