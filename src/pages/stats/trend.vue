<template>
  <view class="container">
    <view class="fixed-header">
      <view class="filter-bar">
        <view class="period-switch neu-inset">
          <view :class="['period-btn', periodType === 'month' ? 'active' : '']" @click="setPeriod('month')">月</view>
          <view :class="['period-btn', periodType === 'year' ? 'active' : '']" @click="setPeriod('year')">年</view>
        </view>
        <picker mode="date" :fields="periodType" :value="pickerValue" @change="onDateChange">
          <view class="date-picker-btn neu-btn-small">
            <text>{{ displayDate }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>

      <view class="currency-tabs" v-if="currencies.length > 1">
        <text
          v-for="item in currencies"
          :key="item"
          :class="['currency-tab', selectedCurrency === item ? 'active' : '']"
          @click="selectedCurrency = item"
        >{{ item }}</text>
      </view>

      <view class="summary-card neu-card">
        <view class="summary-item income">
          <text class="summary-label">收入</text>
          <text class="summary-value">{{ formatAmount(summary.income) }}</text>
        </view>
        <view class="summary-item expense">
          <text class="summary-label">支出</text>
          <text class="summary-value">{{ formatAmount(summary.expense) }}</text>
        </view>
        <view class="summary-item" :class="summary.net >= 0 ? 'income' : 'expense'">
          <text class="summary-label">净收支</text>
          <text class="summary-value">{{ formatSignedAmount(summary.net) }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <view class="content-wrapper">
        <view class="chart-card neu-card">
          <view class="section-title">收支趋势</view>
          <view v-if="hasData" class="trend-chart">
            <view class="chart-y-axis">
              <text>{{ formatAxis(maxAmount) }}</text>
              <text>{{ formatAxis(maxAmount / 2) }}</text>
              <text>0</text>
            </view>
            <view class="chart-main">
              <view class="grid-line top"></view>
              <view class="grid-line middle"></view>
              <view class="grid-line bottom"></view>
              <view class="bars-row">
                <view v-for="item in trend" :key="item.key" class="bar-group">
                  <view class="bar-pair">
                    <view class="bar income-bar" :style="{ height: barHeight(item.income) }"></view>
                    <view class="bar expense-bar" :style="{ height: barHeight(item.expense) }"></view>
                  </view>
                  <text class="bar-label">{{ item.label }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="empty-tip">本周期暂无计入统计的收支数据</view>
          <view class="legend">
            <view><i class="legend-dot income-dot"></i><text>收入</text></view>
            <view><i class="legend-dot expense-dot"></i><text>支出</text></view>
          </view>
        </view>

        <view class="detail-list">
          <view v-for="item in trend" :key="`detail-${item.key}`" class="detail-item neu-card">
            <text class="detail-date">{{ item.label }}</text>
            <view class="detail-values">
              <text class="income-text">+{{ formatAmount(item.income) }}</text>
              <text class="expense-text">-{{ formatAmount(item.expense) }}</text>
              <text :class="item.net >= 0 ? 'income-text' : 'expense-text'">{{ formatSignedAmount(item.net) }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { formatCurrencyAmount } from '@/utils/currency'
import { usePageShare } from '@/utils/share'
import { getStatCurrencies, buildIncomeExpenseTrend } from '@/utils/statReports'

usePageShare({ title: '收支趋势 - 记账本', path: '/pages/stats/trend' })

const billStore = useBillStore()
const periodType = ref('month')
const currentDate = ref(new Date())
const selectedCurrency = ref('CNY')

onShow(() => billStore.init())

const displayDate = computed(() => {
  const year = currentDate.value.getFullYear()
  return periodType.value === 'month'
    ? `${year}年${currentDate.value.getMonth() + 1}月`
    : `${year}年`
})

const pickerValue = computed(() => {
  const year = currentDate.value.getFullYear()
  if (periodType.value === 'year') return String(year)
  return `${year}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}`
})

const currencies = computed(() => {
  const list = getStatCurrencies(billStore.bills, billStore)
  return list.length ? list : ['CNY']
})

watch(currencies, (list) => {
  if (!list.includes(selectedCurrency.value)) selectedCurrency.value = list[0]
}, { immediate: true })

const trend = computed(() => buildIncomeExpenseTrend({
  bills: billStore.bills,
  billStore,
  period: periodType.value,
  date: pickerValue.value,
  currency: selectedCurrency.value
}))

const summary = computed(() => trend.value.reduce((result, item) => ({
  income: result.income + item.income,
  expense: result.expense + item.expense,
  net: result.net + item.net
}), { income: 0, expense: 0, net: 0 }))

const maxAmount = computed(() => Math.max(...trend.value.flatMap(item => [item.income, item.expense]), 1))
const hasData = computed(() => summary.value.income !== 0 || summary.value.expense !== 0)

const formatAmount = (amount) => formatCurrencyAmount(Math.abs(amount || 0), selectedCurrency.value)
const formatSignedAmount = (amount) => `${amount >= 0 ? '+' : '-'}${formatAmount(amount)}`
const formatAxis = (amount) => Number(amount || 0).toFixed(0)
const barHeight = (amount) => `${Math.max(2, Number(amount || 0) / maxAmount.value * 130)}px`

const setPeriod = (type) => {
  periodType.value = type
}

const onDateChange = (event) => {
  const value = event.detail.value
  if (periodType.value === 'year') {
    currentDate.value = new Date(Number(value), 0, 1)
  } else {
    const [year, month] = value.split('-').map(Number)
    currentDate.value = new Date(year, month - 1, 1)
  }
}
</script>

<style lang="scss" scoped>
.container { height: 100%; background: var(--color-bg); display: flex; flex-direction: column; overflow: hidden; }
.fixed-header { flex-shrink: 0; background: var(--color-bg); padding-bottom: 10px; }
.filter-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; }
.period-switch { display: flex; padding: 4px; border-radius: 12px; }
.period-btn { padding: 6px 16px; font-size: 14px; color: var(--color-text-light); border-radius: 8px; &.active { color: var(--color-primary); font-weight: bold; box-shadow: var(--shadow-light), var(--shadow-dark); } }
.date-picker-btn { display: flex; align-items: center; padding: 8px 16px; border-radius: 12px; font-size: 14px; color: var(--color-text); box-shadow: var(--shadow-light), var(--shadow-dark); .arrow { margin-left: 6px; font-size: 10px; color: var(--color-text-light); } }
.currency-tabs { display: flex; gap: 8px; padding: 0 20px 8px; overflow-x: auto; }
.currency-tab { padding: 5px 13px; border-radius: 14px; color: var(--color-text-light); background: rgba(255,255,255,.35); font-size: 12px; &.active { color: #fff; background: var(--color-primary); } }
.summary-card { margin: 10px 20px; padding: 16px; display: flex; justify-content: space-around; }
.summary-item { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.summary-label { color: var(--color-text-light); font-size: 12px; margin-bottom: 6px; }
.summary-value { color: var(--color-text); font-size: 15px; font-weight: bold; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.income-text, .income .summary-value { color: var(--color-secondary); }
.expense-text, .expense .summary-value { color: var(--color-primary); }
.content-scroll { flex: 1; min-height: 0; }
.content-wrapper { padding: 10px 20px 30px; }
.chart-card { padding: 18px 14px; margin-bottom: 16px; }
.section-title { color: var(--color-text); font-weight: bold; font-size: 16px; margin-bottom: 20px; }
.trend-chart { display: flex; height: 170px; }
.chart-y-axis { width: 35px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-bottom: 22px; color: var(--color-text-light); font-size: 10px; }
.chart-main { position: relative; flex: 1; min-width: 0; margin-left: 8px; }
.grid-line { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(138,138,138,.22); &.top { top: 0; } &.middle { top: 50%; } &.bottom { bottom: 22px; } }
.bars-row { height: 100%; display: flex; align-items: flex-end; position: relative; z-index: 1; overflow: hidden; }
.bar-group { flex: 1; min-width: 9px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.bar-pair { height: 140px; display: flex; align-items: flex-end; gap: 2px; }
.bar { width: 5px; min-height: 2px; border-radius: 4px 4px 0 0; }
.income-bar { background: var(--color-secondary); }
.expense-bar { background: var(--color-primary); }
.bar-label { height: 22px; padding-top: 6px; color: var(--color-text-light); font-size: 9px; white-space: nowrap; }
.legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; color: var(--color-text-light); font-size: 12px; }
.legend > view { display: flex; align-items: center; gap: 5px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.income-dot { background: var(--color-secondary); } .expense-dot { background: var(--color-primary); }
.detail-item { display: flex; justify-content: space-between; align-items: center; padding: 14px; margin-bottom: 10px; }
.detail-date { color: var(--color-text); font-size: 13px; font-weight: bold; }
.detail-values { display: flex; gap: 10px; font-size: 11px; }
.empty-tip { text-align: center; padding: 45px 10px; color: var(--color-text-light); font-size: 13px; }
@media (max-width: 375px) { .bar { width: 4px; } .detail-values { gap: 5px; font-size: 10px; } .summary-value { max-width: 90px; } }
</style>
