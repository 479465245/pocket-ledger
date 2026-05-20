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
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: var(--color-bg, #FFF9F0); }
.header { margin-bottom: 18px; }
.title { display: block; font-size: 24px; font-weight: 800; color: #333; margin-bottom: 6px; }
.subtitle { color: #777; font-size: 13px; }
.amount-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.amount-card, .summary-card, .empty-card { border-radius: 18px; background: #FFF9F0; box-shadow: 5px 5px 15px rgba(0,0,0,.08), -5px -5px 15px rgba(255,255,255,.75); }
.amount-card { box-sizing: border-box; width: calc(50% - 6px); padding: 16px; }
.amount-card.wide { width: 100%; }
.amount-label { display: block; margin-bottom: 8px; color: #777; font-size: 12px; }
.amount-value { display: block; color: #333; font-size: 21px; font-weight: 800; }
.summary-card, .empty-card { padding: 18px; }
.section-title { display: block; margin-bottom: 12px; font-size: 17px; font-weight: 800; color: #333; }
.meta-row { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-bottom: 14px; color: #777; font-size: 12px; }
.problem-list { display: flex; flex-direction: column; gap: 12px; }
.problem-item { display: flex; align-items: center; justify-content: space-between; padding: 14px; border-radius: 14px; background: rgba(255,255,255,.72); }
.problem-title, .problem-desc { display: block; }
.problem-title { margin-bottom: 5px; font-size: 16px; font-weight: 700; color: #333; }
.problem-desc { color: #777; font-size: 12px; line-height: 18px; }
.problem-count { min-width: 42px; height: 42px; line-height: 42px; text-align: center; border-radius: 21px; color: #fff; background: var(--color-primary, #FF8D5D); font-size: 18px; font-weight: 800; }
.empty-title { display: block; margin-bottom: 16px; color: #333; font-size: 17px; font-weight: 700; }
.primary-btn { width: 100%; min-height: 44px; border: 0; border-radius: 14px; background: var(--color-primary, #FF8D5D); color: #fff; font-weight: 700; }
</style>
