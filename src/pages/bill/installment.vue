<template>
  <scroll-view scroll-y class="container">
    <view v-if="loaded" class="content">
      <view class="summary neu-card">
        <text class="title">分期账单</text>
        <text class="summary-amount">¥ {{ form.totalAmount }}</text>
        <text class="summary-tip">共 {{ form.periods }} 期 · 每期约 ¥{{ periodAmount }}</text>
      </view>

      <view class="card neu-card">
        <view class="row input-row">
          <text class="label">消费总额</text>
          <input class="input" type="digit" v-model="form.totalAmount" />
        </view>
        <view class="row input-row">
          <text class="label">分期期数</text>
          <view class="inline-input">
            <input class="input" type="number" v-model="form.periods" />
            <text class="unit">期</text>
          </view>
        </view>
        <view class="row input-row">
          <text class="label">总手续费</text>
          <view class="inline-input">
            <input class="input" type="digit" v-model="form.fee" />
            <text class="unit">元</text>
          </view>
        </view>
        <view class="row" @click="openAssetPicker">
          <text class="label">账户</text>
          <text class="value">{{ selectedAssetName }} ›</text>
        </view>
        <view class="row" @click="openCategoryPicker">
          <text class="label">分类</text>
          <text class="value">{{ selectedCategoryName }} ›</text>
        </view>
        <view class="row date-row">
          <text class="label">首期日期</text>
          <picker mode="date" :value="form.firstDate" @change="form.firstDate = $event.detail.value">
            <text class="value">{{ form.firstDate }} ›</text>
          </picker>
        </view>
        <view class="row input-row remark-row">
          <text class="label">备注</text>
          <input class="input remark-input" v-model="form.remark" placeholder="请输入备注" />
        </view>
      </view>

      <view class="card neu-card">
        <text class="section-title">分期明细</text>
        <view v-for="bill in installmentBills" :key="bill.id" class="period-row">
          <view>
            <text class="period-title">第 {{ bill.installment.period }}/{{ bill.installment.totalPeriods }} 期</text>
            <text class="period-date">{{ formatDate(bill.timestamp) }}</text>
          </view>
          <view class="period-right">
            <text class="period-amount">¥{{ Math.abs(Number(bill.amount || 0)).toFixed(2) }}</text>
            <text class="period-stat">{{ bill.isIncludedInStats !== false ? `统计 ¥${bill.statAmount.toFixed(2)}` : '不计入统计' }}</text>
          </view>
        </view>
      </view>

      <view class="actions">
        <button class="save-btn" @click="save">保存整组分期</button>
        <button class="delete-btn" @click="remove">删除整组分期</button>
      </view>
    </view>

    <view v-else class="empty">正在加载分期账单...</view>

    <view v-if="showAssetPicker" class="picker-mask" @click="showAssetPicker = false">
      <view class="picker-modal neu-card" @click.stop>
        <text class="picker-title">选择账户</text>
        <view v-for="asset in assets" :key="asset.id" class="picker-option" @click="selectAsset(asset)">{{ asset.name }}</view>
      </view>
    </view>

    <view v-if="showCategoryPicker" class="picker-mask" @click="showCategoryPicker = false">
      <view class="picker-modal neu-card" @click.stop>
        <text class="picker-title">选择分类</text>
        <view v-for="category in expenseCategories" :key="category.id" class="picker-option" @click="selectCategory(category)">
          {{ category.name }}
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '分期账单 - 记账本', path: '/pages/index/index' })

const assetStore = useAssetStore()
const billStore = useBillStore()
const categoryStore = useCategoryStore()
const loaded = ref(false)
const groupId = ref('')
const showAssetPicker = ref(false)
const showCategoryPicker = ref(false)
const assets = computed(() => assetStore.assets)
const expenseCategories = computed(() => categoryStore.categories.filter(category => category.type === 'expense' && !category.hidden))
const installmentBills = computed(() => billStore.getInstallmentBills(groupId.value))
const form = reactive({
  totalAmount: '0',
  periods: '2',
  fee: '0',
  firstDate: '',
  assetId: '',
  parentCategoryId: '',
  categoryId: '',
  currency: 'CNY',
  remark: ''
})

const selectedAssetName = computed(() => assetStore.getAsset(form.assetId)?.name || '选择账户')
const selectedCategoryName = computed(() => categoryStore.getCategoryName(form.categoryId || form.parentCategoryId) || '选择分类')
const periodAmount = computed(() => {
  const total = Number(form.totalAmount || 0) + Number(form.fee || 0)
  return (total / Math.max(1, Number(form.periods || 1))).toFixed(2)
})

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const load = (id) => {
  const bill = billStore.getBill(id)
  if (!bill?.installment?.groupId) {
    uni.showToast({ title: '分期账单不存在', icon: 'none' })
    uni.navigateBack()
    return
  }

  groupId.value = bill.installment.groupId
  const bills = billStore.getInstallmentBills(groupId.value)
  if (bills.length !== Number(bill.installment.totalPeriods || 0)) {
    uni.showToast({ title: '分期数据不完整，请先检查备份或导入数据', icon: 'none' })
  }
  const first = bills[0]
  form.totalAmount = String(first.installment.totalAmount)
  form.periods = String(first.installment.totalPeriods)
  form.fee = String(first.installment.fee || 0)
  form.firstDate = formatDate(first.timestamp)
  form.assetId = first.assetId
  form.parentCategoryId = first.parentCategoryId || ''
  form.categoryId = first.categoryId || ''
  form.currency = first.currency || 'CNY'
  form.remark = first.remark || ''
  loaded.value = true
}

onLoad((options = {}) => {
  categoryStore.init()
  assetStore.init()
  billStore.init()
  load(options.id)
})

const openAssetPicker = () => { showAssetPicker.value = true }
const selectAsset = (asset) => {
  form.assetId = asset.id
  form.currency = asset.currency || form.currency
  showAssetPicker.value = false
}
const openCategoryPicker = () => { showCategoryPicker.value = true }
const selectCategory = (category) => {
  form.parentCategoryId = category.id
  form.categoryId = category.id
  showCategoryPicker.value = false
}

const save = async () => {
  const totalAmount = Number(form.totalAmount)
  const periods = Number(form.periods)
  const fee = Number(form.fee || 0)
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return uni.showToast({ title: '请输入正确总金额', icon: 'none' })
  if (!Number.isInteger(periods) || periods < 2) return uni.showToast({ title: '分期期数至少为2期', icon: 'none' })
  if (!Number.isFinite(fee) || fee < 0) return uni.showToast({ title: '请输入正确手续费', icon: 'none' })
  if (!form.assetId || !form.categoryId) return uni.showToast({ title: '请选择账户和分类', icon: 'none' })

  try {
    await billStore.updateInstallment(groupId.value, {
      totalAmount,
      periods,
      fee,
      firstDate: `${form.firstDate}T00:00:00`,
      assetId: form.assetId,
      parentCategoryId: form.parentCategoryId,
      categoryId: form.categoryId,
      currency: form.currency,
      remark: form.remark
    })
    uni.showToast({ title: '分期已更新' })
  } catch (error) {
    uni.showToast({ title: error.message || '更新失败', icon: 'none' })
  }
}

const remove = () => {
  uni.showModal({
    title: '删除分期账单',
    content: '将删除全部期数，且无法恢复，确定继续吗？',
    success: async (result) => {
      if (!result.confirm) return
      await billStore.deleteInstallment(groupId.value)
      uni.showToast({ title: '已删除' })
      uni.navigateBack()
    }
  })
}
</script>

<style lang="scss" scoped>
.container { height: 100vh; background: var(--color-bg); box-sizing: border-box; }
.content { padding: 18px 16px calc(30px + env(safe-area-inset-bottom)); }
.neu-card { background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow-soft); }
.summary { padding: 22px; margin-bottom: 16px; text-align: center; border-radius: 22px; }
.title, .section-title { display: block; font-weight: 800; color: var(--color-text); }
.summary-amount { display: block; margin-top: 10px; font-size: 32px; font-weight: 900; color: var(--color-primary); }
.summary-tip, .period-date, .period-stat, .advanced-tip { display: block; color: var(--color-text-light); font-size: 12px; }
.card { margin-bottom: 16px; padding: 8px 16px; border-radius: 20px; }
.row { min-height: 48px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(138,138,138,.12); }
.row:last-child { border-bottom: none; }
.label { color: var(--color-text-light); font-size: 14px; }
.value { color: var(--color-text); font-size: 14px; }
.input { width: 170px; text-align: right; color: var(--color-text); font-size: 15px; }
.inline-input { display: flex; align-items: center; }
.unit { margin-left: 6px; color: var(--color-text-light); font-size: 13px; }
.remark-input { flex: 1; margin-left: 16px; }
.section-title { padding: 10px 0 12px; }
.period-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px solid rgba(138,138,138,.12); }
.period-title, .period-amount { display: block; color: var(--color-text); font-size: 14px; font-weight: 700; }
.period-right { text-align: right; }
.period-amount { color: var(--color-primary); }
.actions { padding-bottom: 20px; }
.actions button { width: 100%; margin-top: 12px; border-radius: 16px; padding: 13px; font-weight: 800; }
.save-btn { background: var(--color-secondary); color: #fff; }
.delete-btn { background: rgba(231,76,60,.12); color: #d9534f; }
.empty { padding: 80px 20px; text-align: center; color: var(--color-text-light); }
.picker-mask { position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.28); }
.picker-modal { width: 82%; max-height: 70vh; padding: 20px; border-radius: 20px; overflow-y: auto; }
.picker-title { display: block; text-align: center; font-weight: 800; margin-bottom: 10px; }
.picker-option { padding: 14px 8px; border-bottom: 1px solid rgba(138,138,138,.12); text-align: center; }
</style>
