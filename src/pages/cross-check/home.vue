<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">交叉校验操作主页</text>
      <text class="subtitle">{{ session?.assetName || '-' }} ｜ {{ session?.startDate || '-' }} ~ {{ session?.endDate || '-' }}</text>
    </view>

    <view v-if="!session" class="empty-card">
      <text class="empty-title">暂无校验数据</text>
      <button class="primary-btn" @click="goConfig">去创建交叉校验</button>
    </view>

    <template v-else>
      <view class="amount-grid">
        <view class="amount-card">
          <text class="amount-label">当前资产总额</text>
          <text class="amount-value">¥ {{ formatMoney(currentAssetBalance) }}</text>
        </view>
        <view class="amount-card">
          <text class="amount-label">本地流水统计</text>
          <text class="amount-value">¥ {{ formatMoney(report.localRangeTotal) }}</text>
        </view>
        <view class="amount-card wide">
          <text class="amount-label">导入数据统计金额</text>
          <text class="amount-value">¥ {{ formatMoney(report.externalRangeTotal) }}</text>
        </view>
      </view>

      <view class="summary-card">
        <text class="section-title">发现以下差异</text>
        <view class="meta-row">
          <text>外部流水 {{ report.summary.externalCount }} 条</text>
          <text>本地账单 {{ report.summary.localCount }} 条</text>
          <text>已匹配 {{ report.summary.matchedCount }} 条</text>
          <text>外部计入统计 {{ report.summary.externalStatsCount || 0 }} 条</text>
          <text>本地计入统计 {{ report.summary.localStatsCount || 0 }} 条</text>
        </view>

        <view class="problem-list">
          <view class="problem-item" @click="goList('missing')">
            <view>
              <text class="problem-title">本地缺失</text>
              <text class="problem-desc">外部流水中存在，但本地账本未找到</text>
            </view>
            <text class="problem-count">{{ report.summary.missingCount }}</text>
          </view>
          <view class="problem-item" @click="goList('extra')">
            <view>
              <text class="problem-title">本地多余</text>
              <text class="problem-desc">本地账本中存在，但外部流水未找到</text>
            </view>
            <text class="problem-count">{{ report.summary.extraCount }}</text>
          </view>
          <view class="problem-item" @click="goList('assetMismatch')">
            <view>
              <text class="problem-title">资产不一致</text>
              <text class="problem-desc">日期和金额能对上，但资产不一致</text>
            </view>
            <text class="problem-count">{{ report.summary.assetMismatchCount }}</text>
          </view>
          <view class="problem-item" @click="goList('duplicate')">
            <view>
              <text class="problem-title">疑似重复</text>
              <text class="problem-desc">多条本地账单可能对应同一条外部流水</text>
            </view>
            <text class="problem-count">{{ report.summary.duplicateCount }}</text>
          </view>
        </view>
      </view>
    </template>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { calculateCrossCheckReport, loadCrossCheckSession } from '@/utils/crossCheck'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '账单交叉校验 - 记账本', path: '/pages/cross-check/home' })

const assetStore = useAssetStore()
const billStore = useBillStore()
const session = ref(null)
const report = ref(calculateCrossCheckReport({ session: null }))

const currentAssetBalance = computed(() => assetStore.getAsset(session.value?.assetId)?.currentBalance || 0)

onShow(() => {
  assetStore.init()
  billStore.init()
  session.value = loadCrossCheckSession()
  recalculate()
})

const recalculate = () => {
  report.value = calculateCrossCheckReport({
    session: session.value,
    bills: billStore.bills,
    assets: assetStore.assets
  })
}

const formatMoney = (value) => Number(value || 0).toFixed(2)
const goConfig = () => uni.redirectTo({ url: '/pages/settings/cross-check' })
const goList = (type) => uni.navigateTo({ url: `/pages/cross-check/list?type=${type}` })
</script>

<style scoped>
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: linear-gradient(180deg, #FFF9F0 0%, #FFF3E7 100%); }
.header { margin-bottom: 18px; padding: 4px 2px; }
.title { display: block; font-size: 25px; font-weight: 900; color: #333; margin-bottom: 7px; }
.subtitle { display: block; color: #777; font-size: 13px; line-height: 20px; }
.amount-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.amount-card, .summary-card, .empty-card { border-radius: 22px; background: rgba(255,249,240,.96); box-shadow: 8px 8px 18px rgba(217,212,204,.78), -8px -8px 18px rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.65); }
.amount-card { box-sizing: border-box; width: calc(50% - 6px); padding: 16px; text-align: center; }
.amount-card.wide { width: 100%; }
.amount-label { display: block; margin-bottom: 8px; color: #777; font-size: 12px; }
.amount-value { display: block; color: #333; font-size: 21px; font-weight: 900; line-height: 28px; }
.summary-card, .empty-card { padding: 18px; }
.empty-card { text-align: center; }
.section-title { display: block; margin-bottom: 12px; font-size: 18px; font-weight: 900; color: #333; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.meta-row text { padding: 5px 9px; border-radius: 999px; background: rgba(255,255,255,.72); color: #777; font-size: 12px; line-height: 16px; }
.problem-list { display: flex; flex-direction: column; gap: 12px; }
.problem-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: 16px; background: rgba(255,255,255,.72); box-shadow: inset 2px 2px 6px rgba(217,212,204,.45), inset -2px -2px 6px rgba(255,255,255,.75); }
.problem-title, .problem-desc { display: block; }
.problem-title { margin-bottom: 5px; font-size: 16px; font-weight: 800; color: #333; }
.problem-desc { color: #777; font-size: 12px; line-height: 18px; }
.problem-count { flex-shrink: 0; min-width: 42px; height: 42px; line-height: 42px; text-align: center; border-radius: 21px; color: #fff; background: var(--color-primary, #FF8D5D); font-size: 18px; font-weight: 900; box-shadow: 3px 3px 8px rgba(255,141,93,.25); }
.empty-title { display: block; margin-bottom: 16px; color: #333; font-size: 17px; font-weight: 800; }
.primary-btn { width: 100%; min-height: 44px; border: 0; border-radius: 15px; background: var(--color-primary, #FF8D5D); color: #fff; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 5px 5px 12px rgba(217,125,82,.22), -5px -5px 12px rgba(255,255,255,.8); }
</style>
