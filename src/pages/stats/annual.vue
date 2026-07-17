<template>
  <view class="container">
    <view class="fixed-header">
      <view class="filter-bar">
        <text class="page-title">年度收支总结</text>
        <picker mode="date" fields="year" :value="yearText" @change="onYearChange">
          <view class="date-picker-btn neu-btn-small">
            <text>{{ yearText }}年</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>
      <view class="currency-tabs" v-if="currencies.length > 1">
        <text v-for="item in currencies" :key="item" :class="['currency-tab', selectedCurrency === item ? 'active' : '']" @click="selectedCurrency = item">{{ item }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <view class="content-wrapper">
        <view class="summary-grid">
          <view class="summary-card neu-card income-card">
            <text class="summary-label">全年收入</text>
            <text class="summary-value">{{ formatAmount(report.totals.income) }}</text>
          </view>
          <view class="summary-card neu-card expense-card">
            <text class="summary-label">全年支出</text>
            <text class="summary-value">{{ formatAmount(report.totals.expense) }}</text>
          </view>
          <view class="summary-card neu-card">
            <text class="summary-label">净收支</text>
            <text :class="['summary-value', report.totals.net >= 0 ? 'income-text' : 'expense-text']">{{ formatSignedAmount(report.totals.net) }}</text>
          </view>
          <view class="summary-card neu-card">
            <text class="summary-label">储蓄率</text>
            <text class="summary-value">{{ savingRateText }}</text>
          </view>
        </view>

        <view class="chart-card neu-card">
          <view class="section-title">月度收支</view>
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
                <view v-for="item in report.monthlyTrend" :key="item.key" class="bar-group">
                  <view class="bar-pair">
                    <view class="bar income-bar" :style="{ height: barHeight(item.income) }"></view>
                    <view class="bar expense-bar" :style="{ height: barHeight(item.expense) }"></view>
                  </view>
                  <text class="bar-label">{{ item.label.replace('月', '') }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="empty-tip">本年度暂无计入统计的收支数据</view>
          <view class="legend"><view><i class="legend-dot income-dot"></i><text>收入</text></view><view><i class="legend-dot expense-dot"></i><text>支出</text></view></view>
        </view>

        <view class="insight-grid neu-card">
          <view class="insight-item"><text class="insight-label">月均收入</text><text class="insight-value">{{ formatAmount(report.average.income) }}</text></view>
          <view class="insight-item"><text class="insight-label">月均支出</text><text class="insight-value">{{ formatAmount(report.average.expense) }}</text></view>
          <view class="insight-item"><text class="insight-label">收入最高</text><text class="insight-value">{{ report.topIncomeMonth ? report.topIncomeMonth.label : '--' }}</text></view>
          <view class="insight-item"><text class="insight-label">支出最高</text><text class="insight-value">{{ report.topExpenseMonth ? report.topExpenseMonth.label : '--' }}</text></view>
        </view>

        <view class="ranking-card neu-card">
          <view class="ranking-header"><text class="section-title">分类排行</text><view class="rank-tabs"><text :class="{ active: rankType === 'expense' }" @click="rankType = 'expense'">支出</text><text :class="{ active: rankType === 'income' }" @click="rankType = 'income'">收入</text></view></view>
          <view v-for="item in rankings" :key="item.id" class="ranking-item" @click="openCategory(item)">
            <view class="ranking-main"><text class="ranking-icon">{{ item.icon || '📦' }}</text><text class="ranking-name">{{ displayCategoryName(item.name) }}</text></view>
            <view class="ranking-right"><text class="ranking-amount">{{ formatAmount(item.amount) }}</text><text class="ranking-percent">{{ item.percent.toFixed(1) }}%</text></view>
            <view class="ranking-progress" :style="{ width: `${item.percent}%` }"></view>
          </view>
          <view v-if="rankings.length === 0" class="empty-tip">暂无分类数据</view>
        </view>

        <view class="month-list neu-card">
          <view class="section-title">月度明细</view>
          <view class="month-row month-head"><text>月份</text><text>收入</text><text>支出</text><text>净收支</text></view>
          <view v-for="item in report.monthlyTrend" :key="`month-${item.key}`" class="month-row"><text>{{ item.label }}</text><text class="income-text">+{{ formatAmount(item.income) }}</text><text class="expense-text">-{{ formatAmount(item.expense) }}</text><text :class="item.net >= 0 ? 'income-text' : 'expense-text'">{{ formatSignedAmount(item.net) }}</text></view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { formatCurrencyAmount } from '@/utils/currency'
import { decodeHtmlEntities } from '@/utils/text'
import { usePageShare } from '@/utils/share'
import { getStatCurrencies, buildAnnualSummaryReport } from '@/utils/statReports'

usePageShare({ title: '年度收支总结 - 记账本', path: '/pages/stats/annual' })

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const selectedYear = ref(new Date().getFullYear())
const selectedCurrency = ref('CNY')
const rankType = ref('expense')

onShow(() => { billStore.init(); categoryStore.init() })

const yearText = computed(() => String(selectedYear.value))
const currencies = computed(() => {
  const list = getStatCurrencies(billStore.bills, billStore)
  return list.length ? list : ['CNY']
})
watch(currencies, (list) => { if (!list.includes(selectedCurrency.value)) selectedCurrency.value = list[0] }, { immediate: true })
const report = computed(() => buildAnnualSummaryReport({ bills: billStore.bills, billStore, year: selectedYear.value, currency: selectedCurrency.value, categories: categoryStore.categories }))
const rankings = computed(() => rankType.value === 'income' ? report.value.incomeCategories : report.value.expenseCategories)
const savingRateText = computed(() => report.value.savingRate === null ? '--' : `${report.value.savingRate.toFixed(1)}%`)
const maxAmount = computed(() => Math.max(...report.value.monthlyTrend.flatMap(item => [item.income, item.expense]), 1))
const hasData = computed(() => report.value.totals.income !== 0 || report.value.totals.expense !== 0)
const formatAmount = (amount) => formatCurrencyAmount(Math.abs(amount || 0), selectedCurrency.value)
const formatSignedAmount = (amount) => `${amount >= 0 ? '+' : '-'}${formatAmount(amount)}`
const formatAxis = (amount) => Number(amount || 0).toFixed(0)
const barHeight = (amount) => `${Math.max(2, Number(amount || 0) / maxAmount.value * 130)}px`

const onYearChange = (event) => { selectedYear.value = Number(event.detail.value) }
const displayCategoryName = (name) => decodeHtmlEntities(name)
const openCategory = (item) => {
  uni.navigateTo({ url: `/pages/stats/list?id=${item.id}&filterType=parent&period=year&date=${selectedYear.value}&type=${rankType.value}&currency=${selectedCurrency.value}` })
}
</script>

<style lang="scss" scoped>
.container { height: 100%; background: var(--color-bg); display: flex; flex-direction: column; overflow: hidden; }
.fixed-header { flex-shrink: 0; background: var(--color-bg); padding-bottom: 10px; }
.filter-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; }
.page-title { color: var(--color-text); font-size: 18px; font-weight: bold; }
.date-picker-btn { display: flex; align-items: center; padding: 8px 16px; border-radius: 12px; font-size: 14px; color: var(--color-text); box-shadow: var(--shadow-light), var(--shadow-dark); .arrow { margin-left: 6px; color: var(--color-text-light); font-size: 10px; } }
.currency-tabs { display: flex; gap: 8px; padding: 0 20px 8px; overflow-x: auto; }
.currency-tab { padding: 5px 13px; border-radius: 14px; color: var(--color-text-light); background: rgba(255,255,255,.35); font-size: 12px; &.active { color: #fff; background: var(--color-primary); } }
.content-scroll { flex: 1; min-height: 0; }
.content-wrapper { padding: 10px 20px 30px; }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.summary-card { padding: 15px 12px; min-width: 0; }
.summary-label, .insight-label { display: block; color: var(--color-text-light); font-size: 11px; margin-bottom: 7px; }
.summary-value { display: block; color: var(--color-text); font-size: 17px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.income-text, .income-card .summary-value { color: var(--color-secondary); } .expense-text, .expense-card .summary-value { color: var(--color-primary); }
.chart-card, .ranking-card, .month-list { padding: 17px 14px; margin-bottom: 16px; }
.section-title { color: var(--color-text); font-weight: bold; font-size: 16px; }
.trend-chart { display: flex; height: 170px; margin-top: 18px; }
.chart-y-axis { width: 35px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-bottom: 22px; color: var(--color-text-light); font-size: 10px; }
.chart-main { position: relative; flex: 1; min-width: 0; margin-left: 8px; }
.grid-line { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(138,138,138,.22); &.top { top: 0; } &.middle { top: 50%; } &.bottom { bottom: 22px; } }
.bars-row { height: 100%; display: flex; align-items: flex-end; position: relative; z-index: 1; overflow: hidden; }.bar-group { flex: 1; min-width: 9px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }.bar-pair { height: 140px; display: flex; align-items: flex-end; gap: 2px; }.bar { width: 6px; min-height: 2px; border-radius: 4px 4px 0 0; }.income-bar { background: var(--color-secondary); }.expense-bar { background: var(--color-primary); }.bar-label { height: 22px; padding-top: 6px; color: var(--color-text-light); font-size: 9px; }
.legend { display: flex; justify-content: center; gap: 20px; margin-top: 12px; color: var(--color-text-light); font-size: 12px; }.legend > view { display: flex; align-items: center; gap: 5px; }.legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }.income-dot { background: var(--color-secondary); }.expense-dot { background: var(--color-primary); }
.insight-grid { padding: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 10px; margin-bottom: 16px; }.insight-value { color: var(--color-text); font-size: 14px; font-weight: bold; }
.ranking-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }.rank-tabs { display: flex; gap: 10px; color: var(--color-text-light); font-size: 13px; }.rank-tabs text.active { color: var(--color-primary); font-weight: bold; }.ranking-item { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(138,138,138,.12); overflow: hidden; }.ranking-main { display: flex; align-items: center; min-width: 0; }.ranking-icon { width: 28px; margin-right: 8px; }.ranking-name { color: var(--color-text); font-size: 14px; }.ranking-right { display: flex; flex-direction: column; align-items: flex-end; z-index: 1; }.ranking-amount { color: var(--color-text); font-size: 13px; font-weight: bold; }.ranking-percent { color: var(--color-text-light); font-size: 11px; }.ranking-progress { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--color-primary); opacity: .35; }.month-row { display: grid; grid-template-columns: .7fr 1fr 1fr 1fr; gap: 5px; padding: 10px 0; border-bottom: 1px solid rgba(138,138,138,.12); color: var(--color-text); font-size: 11px; text-align: right; }.month-row text:first-child { text-align: left; }.month-head { color: var(--color-text-light); font-size: 10px; }.empty-tip { text-align: center; padding: 35px 10px; color: var(--color-text-light); font-size: 13px; }
@media (max-width: 375px) { .summary-value { font-size: 14px; }.month-row { font-size: 10px; }.bar { width: 4px; } }
</style>
