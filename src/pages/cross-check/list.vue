<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">{{ config.title }}</text>
      <text class="subtitle">{{ config.desc }}</text>
    </view>

    <view v-if="items.length === 0" class="empty-card">
      <text class="empty-title">这里暂时没有问题</text>
      <text class="empty-desc">返回主页会重新计算数量。</text>
    </view>

    <view v-for="item in items" :key="item.id" class="item-card">
      <template v-if="type === 'missing'">
        <text class="tag">外部流水</text>
        <text class="main-line">{{ formatAmount(item.external.amount) }} ｜ {{ formatDate(item.external.timestamp) }}</text>
        <text class="sub-line">资产：{{ item.external.assetName || session.assetName }}</text>
        <text class="sub-line">是否计入统计：{{ item.external.isIncludedInStats === false ? '否' : '是' }}</text>
        <text class="sub-line">备注：{{ item.external.remark || '-' }}</text>
        <button class="primary-btn" @click="addMissing(item.external)">新增到账本</button>
      </template>

      <template v-else-if="type === 'extra'">
        <text class="tag">本地账单</text>
        <text class="main-line">{{ formatAmount(item.local.amount) }} ｜ {{ formatDate(item.local.timestamp) }}</text>
        <text class="sub-line">资产：{{ item.local.assetName }}</text>
        <text class="sub-line">是否计入统计：{{ item.local.isIncludedInStats === false ? '否' : '是' }}</text>
        <text class="sub-line">备注：{{ item.local.remark || '-' }}</text>
        <view class="actions">
          <button class="secondary-btn" @click="editBill(item.local.id)">修改</button>
          <button class="danger-btn" @click="deleteBill(item.local.id)">删除</button>
        </view>
      </template>

      <template v-else-if="type === 'assetMismatch'">
        <text class="tag warning">资产不一致</text>
        <text class="main-line">{{ formatAmount(item.local.amount) }} ｜ {{ formatDate(item.local.timestamp) }}</text>
        <view class="compare-box">
          <text>本地资产：{{ item.local.assetName }}</text>
          <text>外部资产：{{ item.external.assetName || session.assetName }}</text>
        </view>
        <text class="sub-line">本地是否计入统计：{{ item.local.isIncludedInStats === false ? '否' : '是' }}</text>
        <text class="sub-line">外部是否计入统计：{{ item.external.isIncludedInStats === false ? '否' : '是' }}</text>
        <text class="sub-line">本地备注：{{ item.local.remark || '-' }}</text>
        <text class="sub-line">外部备注：{{ item.external.remark || '-' }}</text>
        <view class="actions">
          <button class="secondary-btn" @click="editBill(item.local.id)">修改</button>
          <button class="danger-btn" @click="deleteBill(item.local.id)">删除</button>
        </view>
      </template>

      <template v-else>
        <text class="tag warning">疑似重复</text>
        <text class="main-line">外部：{{ formatAmount(item.external.amount) }} ｜ {{ formatDate(item.external.timestamp) }}</text>
        <text class="sub-line">是否计入统计：{{ item.external.isIncludedInStats === false ? '否' : '是' }}</text>
        <text class="sub-line">{{ item.external.remark || '-' }}</text>
        <view v-for="local in item.locals" :key="local.id" class="duplicate-local">
          <text class="main-line small">本地：{{ formatAmount(local.amount) }} ｜ {{ local.assetName }}</text>
          <text class="sub-line">是否计入统计：{{ local.isIncludedInStats === false ? '否' : '是' }}</text>
          <text class="sub-line">{{ local.remark || '-' }}</text>
          <view class="actions">
            <button class="secondary-btn" @click="editBill(local.id)">修改</button>
            <button class="danger-btn" @click="deleteBill(local.id)">删除</button>
          </view>
        </view>
      </template>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import {
  calculateCrossCheckReport,
  formatDate,
  getProblemConfig,
  loadCrossCheckSession
} from '@/utils/crossCheck'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '交叉校验列表 - 记账本', path: '/pages/cross-check/home' })

const assetStore = useAssetStore()
const billStore = useBillStore()
const categoryStore = useCategoryStore()
const type = ref('missing')
const session = ref(null)
const report = ref(calculateCrossCheckReport({ session: null }))

const config = computed(() => getProblemConfig(type.value))
const items = computed(() => {
  if (type.value === 'missing') return report.value.missingItems
  if (type.value === 'extra') return report.value.extraItems
  if (type.value === 'assetMismatch') return report.value.assetMismatchItems
  if (type.value === 'duplicate') return report.value.duplicateItems
  return []
})

onLoad((options) => {
  type.value = options.type || 'missing'
})

onShow(() => {
  assetStore.init()
  billStore.init()
  categoryStore.init()
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

const formatAmount = (amount) => {
  const value = Number(amount || 0)
  return `${value >= 0 ? '+' : '-'}¥${Math.abs(value).toFixed(2)}`
}

const editBill = (id) => {
  uni.navigateTo({ url: `/pages/bill/add?id=${id}` })
}

const deleteBill = (id) => {
  uni.showModal({
    title: '删除账单',
    content: '确定删除这条本地账单吗？',
    success: async (res) => {
      if (!res.confirm) return
      await billStore.deleteBill(id)
      uni.showToast({ title: '已删除' })
      recalculate()
    }
  })
}

const findOrCreateAssetId = (name) => {
  const assetName = name || session.value.assetName
  const existing = assetStore.findByName(assetName)
  if (existing) return existing.id
  return assetStore.addAsset({ name: assetName, type: 'digital', initialBalance: 0 }).id
}

const getDefaultCategory = (billType) => {
  const typeName = billType === 'income' ? 'income' : 'expense'
  const parent = categoryStore.categories.find(category => category.type === typeName && !category.hidden)
  if (!parent) return { parentCategoryId: null, categoryId: null }
  return { parentCategoryId: parent.id, categoryId: parent.id }
}

const addMissing = async (external) => {
  const finalType = external.type === 'refund' ? 'income' : external.type
  const category = getDefaultCategory(finalType)
  try {
    await billStore.addBill({
      amount: Number(external.amount || 0),
      assetId: findOrCreateAssetId(external.assetName || session.value.assetName),
      parentCategoryId: category.parentCategoryId,
      categoryId: category.categoryId,
      type: finalType,
      timestamp: external.timestamp,
      remark: external.remark || `交叉校验新增：${external.orderNo || ''}`,
      isIncludedInStats: external.isIncludedInStats !== false,
      importProvider: external.provider,
      externalOrderNo: external.orderNo,
      externalUniqueKey: [external.provider, external.date, external.amount, external.remark, external.orderNo].filter(Boolean).join('|')
    })
    uni.showToast({ title: '已新增' })
    recalculate()
  } catch (error) {
    console.error(error)
    uni.showToast({ title: '新增失败', icon: 'none' })
  }
}
</script>

<style scoped>
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: var(--color-bg, #FFF9F0); }
.header { margin-bottom: 18px; }
.title { display: block; margin-bottom: 6px; font-size: 24px; font-weight: 800; color: #333; }
.subtitle, .sub-line, .empty-desc { display: block; color: #777; font-size: 13px; line-height: 20px; }
.item-card, .empty-card { margin-bottom: 14px; padding: 16px; border-radius: 18px; background: #FFF9F0; box-shadow: 5px 5px 15px rgba(0,0,0,.08), -5px -5px 15px rgba(255,255,255,.75); }
.tag { display: inline-block; padding: 4px 8px; margin-bottom: 10px; border-radius: 999px; background: #e8f4ff; color: #2678c7; font-size: 12px; font-weight: 700; }
.tag.warning { background: #fff4dc; color: #a66a00; }
.main-line { display: block; margin-bottom: 8px; color: #333; font-size: 17px; font-weight: 800; }
.main-line.small { font-size: 15px; }
.compare-box { display: flex; flex-direction: column; gap: 4px; padding: 10px; margin-bottom: 8px; border-radius: 12px; background: rgba(255,255,255,.72); color: #333; font-size: 13px; }
.actions { display: flex; gap: 10px; margin-top: 12px; }
.primary-btn, .secondary-btn, .danger-btn { min-height: 40px; border: 0; border-radius: 12px; font-size: 14px; font-weight: 700; }
.primary-btn { width: 100%; margin-top: 12px; background: var(--color-primary, #FF8D5D); color: #fff; }
.secondary-btn, .danger-btn { flex: 1; }
.secondary-btn { background: #fff3e7; color: var(--color-primary, #FF8D5D); }
.danger-btn { background: #ffecec; color: #d64545; }
.duplicate-local { padding: 12px; margin-top: 10px; border-radius: 14px; background: rgba(255,255,255,.72); }
.empty-title { display: block; margin-bottom: 6px; font-size: 17px; font-weight: 700; color: #333; }
</style>
