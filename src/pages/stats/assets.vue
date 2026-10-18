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
        <view class="summary-item">
          <text class="summary-label">期初余额</text>
          <text class="summary-value">{{ formatAmount(report.total.opening) }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">期末余额</text>
          <text class="summary-value">{{ formatAmount(report.total.closing) }}</text>
        </view>
        <view class="summary-item" :class="report.total.change >= 0 ? 'income' : 'expense'">
          <text class="summary-label">期间变化</text>
          <text class="summary-value">{{ formatSignedAmount(report.total.change) }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll">
      <view class="content-wrapper">
        <view class="notice neu-card">余额按真实资产流水计算，包含转账、退款、手续费和未计入统计的实际账单；多币种请分别查看。</view>

        <view class="chart-card neu-card">
          <view class="section-title">资产变化</view>
          <view v-if="hasSeriesData" class="trend-chart">
            <view class="chart-y-axis">
              <text>{{ formatAxis(maxSeriesValue) }}</text>
              <text>{{ formatAxis(maxSeriesValue / 2) }}</text>
              <text>0</text>
            </view>
            <view class="chart-main">
              <view class="grid-line top"></view>
              <view class="grid-line middle"></view>
              <view class="grid-line bottom"></view>
              <view class="series-row">
                <view v-for="(value, index) in report.total.series" :key="report.buckets[index].key" class="series-item">
                  <view class="series-bar" :style="{ height: barHeight(value) }"></view>
                  <text class="bar-label">{{ report.buckets[index].label }}</text>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="empty-tip">本周期暂无余额变化</view>
        </view>

        <view class="account-list">
          <view v-for="item in report.accounts" :key="item.asset.id" class="account-card neu-card" @click="openAsset(item.asset)">
            <view class="account-head">
              <view class="account-title">
                <view class="account-icon">{{ getAssetIcon(item.asset.type) }}</view>
                <view>
                  <text class="account-name">{{ item.asset.name }}</text>
                  <text class="account-status">{{ item.asset.includeInTotal !== false ? '计入总资产' : '不计入总资产' }}</text>
                </view>
              </view>
              <text class="account-arrow">›</text>
            </view>
            <view class="account-values">
              <view>
                <text class="value-label">期末余额</text>
                <text class="closing-value">{{ formatAmount(item.closing) }}</text>
              </view>
              <view class="change-box" :class="item.change >= 0 ? 'positive' : 'negative'">
                <text class="value-label">期间变化</text>
                <text>{{ formatSignedAmount(item.change) }}</text>
              </view>
            </view>
          </view>
          <view v-if="report.accounts.length === 0" class="empty-tip">暂无资产账户</view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useAssetStore } from '@/store/asset'
import { formatCurrencyAmount } from '@/utils/currency'
import { usePageShare } from '@/utils/share'
import { getStatCurrencies, buildAssetBalanceReport } from '@/utils/statReports'

usePageShare({ title: '账户余额和资产变化 - 记账本', path: '/pages/stats/assets' })

const billStore = useBillStore()
const assetStore = useAssetStore()
const periodType = ref('month')
const currentDate = ref(new Date())
const selectedCurrency = ref('CNY')

onShow(() => {
  billStore.init()
  assetStore.init()
})

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
  const list = getStatCurrencies(billStore.bills, billStore, assetStore.assets)
  return list.length ? list : ['CNY']
})

watch(currencies, (list) => {
  if (!list.includes(selectedCurrency.value)) selectedCurrency.value = list[0]
}, { immediate: true })

const report = computed(() => buildAssetBalanceReport({
  bills: billStore.bills,
  assets: assetStore.assets,
  billStore,
  period: periodType.value,
  date: pickerValue.value,
  currency: selectedCurrency.value
}))

const maxSeriesValue = computed(() => Math.max(...report.value.total.series, 1))
const hasSeriesData = computed(() => report.value.total.series.some((value, index) => {
  const previousValue = index === 0 ? report.value.total.opening : report.value.total.series[index - 1]
  return value !== previousValue
}))
const formatAmount = (amount) => formatCurrencyAmount(Math.abs(amount || 0), selectedCurrency.value)
const formatSignedAmount = (amount) => `${amount >= 0 ? '+' : '-'}${formatAmount(amount)}`
const formatAxis = (amount) => Number(amount || 0).toFixed(0)
const barHeight = (amount) => `${Math.max(2, Number(amount || 0) / maxSeriesValue.value * 130)}px`
const getAssetIcon = (type) => ({ cash: '💵', digital: '📱', bank: '🏦', credit: '💳', investment: '📈' }[type] || '💰')

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

const openAsset = (asset) => {
  uni.navigateTo({
    url: `/pages/stats/list?assetId=${asset.id}&assetName=${encodeURIComponent(asset.name)}`
  })
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
.summary-card { margin: 10px 20px; padding: 16px 8px; display: flex; justify-content: space-around; }
.summary-item { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.summary-label, .value-label { color: var(--color-text-light); font-size: 11px; margin-bottom: 6px; }
.summary-value { color: var(--color-text); font-size: 14px; font-weight: bold; max-width: 105px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.income .summary-value, .positive { color: var(--color-secondary); } .expense .summary-value, .negative { color: var(--color-primary); }
.content-scroll { flex: 1; min-height: 0; }
.content-wrapper { padding: 10px 20px 30px; }
.notice { padding: 12px 14px; margin-bottom: 16px; color: var(--color-text-light); font-size: 12px; line-height: 1.6; }
.chart-card { padding: 18px 14px; margin-bottom: 16px; }
.section-title { color: var(--color-text); font-weight: bold; font-size: 16px; margin-bottom: 20px; }
.trend-chart { display: flex; height: 170px; }
.chart-y-axis { width: 35px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; padding-bottom: 22px; color: var(--color-text-light); font-size: 10px; }
.chart-main { position: relative; flex: 1; min-width: 0; margin-left: 8px; }
.grid-line { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(138,138,138,.22); &.top { top: 0; } &.middle { top: 50%; } &.bottom { bottom: 22px; } }
.series-row { height: 100%; display: flex; align-items: flex-end; position: relative; z-index: 1; overflow: hidden; }
.series-item { flex: 1; min-width: 9px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.series-bar { width: 8px; min-height: 2px; border-radius: 5px 5px 0 0; background: linear-gradient(to top, var(--color-primary), var(--color-secondary)); }
.bar-label { height: 22px; padding-top: 6px; color: var(--color-text-light); font-size: 9px; white-space: nowrap; }
.account-card { padding: 15px; margin-bottom: 12px; }
.account-head { display: flex; align-items: center; justify-content: space-between; }
.account-title { display: flex; align-items: center; min-width: 0; }
.account-icon { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #FFF4E8; margin-right: 11px; font-size: 20px; }
.account-name { display: block; color: var(--color-text); font-size: 15px; font-weight: bold; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-status { display: block; color: var(--color-text-light); font-size: 11px; margin-top: 3px; }
.account-arrow { color: var(--color-text-light); font-size: 20px; }
.account-values { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgba(138,138,138,.12); }
.closing-value { display: block; color: var(--color-text); font-size: 17px; font-weight: bold; }
.change-box { display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; font-weight: bold; }
.change-box .value-label { font-weight: normal; }
.empty-tip { text-align: center; padding: 40px 10px; color: var(--color-text-light); font-size: 13px; }
@media (max-width: 375px) { .summary-value { max-width: 90px; font-size: 12px; } .account-name { max-width: 150px; } }
</style>
