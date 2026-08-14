<template>
  <scroll-view scroll-y class="container">
    <view class="content">
      <template v-if="refundError">
        <view class="empty-state neu-card">
          <text class="empty-icon">↩</text>
          <text class="empty-title">无法创建退款</text>
          <text class="empty-desc">{{ refundError }}</text>
          <button class="back-button" @click="goBack">返回</button>
        </view>
      </template>

      <template v-else>
        <view class="summary neu-card">
          <text class="eyebrow">{{ isEditMode ? '退款账单' : '原账单' }}</text>
          <view class="summary-header">
            <view>
              <text class="title">{{ categoryName }}</text>
              <text class="meta">{{ assetName }} · {{ originalDate }}</text>
            </view>
            <text class="amount">{{ originalAmount }}</text>
          </view>
          <text class="summary-tip">退款将冲销资产余额，不会计入收支统计。</text>
        </view>

        <view class="form-card neu-card">
          <view class="form-row">
            <text class="label">退款金额</text>
            <view class="amount-field">
              <text class="currency">{{ currencySymbol }}</text>
              <input
                class="amount-input"
                type="digit"
                :value="amountText"
                placeholder="0.00"
                @input="onAmountInput"
              />
            </view>
          </view>
          <text class="field-tip">最多可退 {{ maximumAmount }}</text>

          <picker mode="date" :value="refundDate" @change="onDateChange">
            <view class="form-row date-row">
              <text class="label">退款日期</text>
              <view class="date-value">
                <text>{{ refundDate }}</text>
                <text class="chevron">›</text>
              </view>
            </view>
          </picker>
        </view>

        <button class="submit-button" @click="submitRefund">{{ isEditMode ? '保存退款' : '确认退款' }}</button>
      </template>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { formatCurrencyAmount, getCurrencySymbol } from '@/utils/currency'
import { getRefundTimestamp, validateRefundAmount } from '@/utils/refund'

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()

const originalBillId = ref('')
const refundBillId = ref('')
const amountText = ref('')
const refundDate = ref('')

const isEditMode = computed(() => !!refundBillId.value)
const refundBill = computed(() => billStore.getBill(refundBillId.value))
const originalBill = computed(() => {
  const sourceId = isEditMode.value
    ? refundBill.value?.originalBillId
    : originalBillId.value
  return billStore.getBill(sourceId)
})
const refundError = computed(() => {
  if (isEditMode.value && (!refundBill.value || refundBill.value.type !== 'refund')) {
    return '退款账单不存在'
  }

  const bill = originalBill.value
  if (!originalBillId.value || !bill) return '原账单不存在'
  if (bill.type === 'transfer') return '转账记录不支持退款'
  if (bill.type === 'adjustment') return '资产调整记录不支持退款'
  if (bill.type === 'refund') return '退款记录不能再次退款'
  if (bill.installment?.groupId) return '分期账单请通过分期页面处理退款'
  if (!isEditMode.value && bill.isRefunded) return '该账单已退款'
  return ''
})
const currency = computed(() => originalBill.value?.currency || 'CNY')
const currencySymbol = computed(() => getCurrencySymbol(currency.value))
const maximumAmount = computed(() => formatCurrencyAmount(Math.abs(Number(originalBill.value?.amount || 0)), currency.value))
const categoryName = computed(() => categoryStore.getCategoryName(originalBill.value?.categoryId || originalBill.value?.parentCategoryId))
const assetName = computed(() => assetStore.getAsset(originalBill.value?.assetId)?.name || '未知账户')
const originalAmount = computed(() => formatCurrencyAmount(Math.abs(Number(originalBill.value?.amount || 0)), currency.value))
const originalDate = computed(() => formatDate(originalBill.value?.timestamp))

onLoad((options) => {
  categoryStore.init()
  assetStore.init()
  billStore.init()
  originalBillId.value = options.id || ''
  refundBillId.value = options.refundId || ''

  if (isEditMode.value && refundBill.value) {
    originalBillId.value = refundBill.value.originalBillId || ''
  }

  if (originalBill.value && !refundError.value) {
    amountText.value = String(Math.abs(Number(
      isEditMode.value ? refundBill.value.amount : originalBill.value.amount
    )))
    refundDate.value = formatDate(isEditMode.value ? refundBill.value.timestamp : Date.now())
    if (isEditMode.value) uni.setNavigationBarTitle({ title: '编辑退款' })
  }
})

const formatDate = (timestamp) => {
  const date = new Date(timestamp || Date.now())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const onAmountInput = (event) => {
  amountText.value = event.detail.value
}

const onDateChange = (event) => {
  refundDate.value = event.detail.value
}

const submitRefund = async () => {
  if (refundError.value) {
    uni.showToast({ title: refundError.value, icon: 'none' })
    return
  }

  try {
    const amount = validateRefundAmount(amountText.value, originalBill.value.amount)
    const payload = { amount, timestamp: getRefundTimestamp(refundDate.value) }
    if (isEditMode.value) {
      await billStore.updateRefund(refundBillId.value, payload)
      uni.showToast({ title: '退款已更新', icon: 'success' })
    } else {
      await billStore.createRefund(originalBillId.value, payload)
      uni.showToast({ title: '退款已生成', icon: 'success' })
    }
    setTimeout(goBack, 350)
  } catch (error) {
    uni.showToast({ title: error.message || '退款失败', icon: 'none' })
  }
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background: var(--app-bg); }
.content { padding: 18px 16px calc(30px + env(safe-area-inset-bottom)); }
.neu-card { background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow-soft); }
.summary, .form-card, .empty-state { border-radius: 22px; }
.summary { padding: 20px; }
.eyebrow, .meta, .summary-tip, .field-tip, .empty-desc { display: block; color: var(--color-text-light); font-size: 13px; }
.eyebrow { margin-bottom: 8px; color: var(--color-primary); font-weight: 700; }
.summary-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.title { display: block; color: var(--color-text); font-size: 20px; font-weight: 800; }
.meta { margin-top: 5px; }
.amount { color: var(--color-primary); font-size: 22px; font-weight: 900; white-space: nowrap; }
.summary-tip { margin-top: 16px; line-height: 1.5; }
.form-card { margin-top: 16px; padding: 4px 18px; }
.form-row { min-height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.form-row + .form-row { border-top: 1px solid rgba(138, 138, 138, 0.14); }
.label { color: var(--color-text); font-weight: 700; }
.amount-field, .date-value { display: flex; align-items: center; justify-content: flex-end; min-width: 0; }
.currency { margin-right: 5px; color: var(--color-primary); font-size: 18px; font-weight: 800; }
.amount-input { width: 126px; color: var(--color-text); font-size: 22px; font-weight: 800; text-align: right; }
.field-tip { padding: 0 0 14px; text-align: right; }
.date-row { padding: 0; }
.date-value { gap: 10px; color: var(--color-text); }
.chevron { color: var(--color-text-light); font-size: 25px; line-height: 1; }
.submit-button, .back-button { width: 100%; border-radius: 16px; font-weight: 800; }
.submit-button { margin-top: 24px; height: 50px; color: #fff; background: var(--color-primary); box-shadow: 0 8px 16px rgba(255, 141, 93, 0.24); }
.empty-state { margin-top: 64px; padding: 30px 24px; text-align: center; }
.empty-icon { display: block; color: var(--color-primary); font-size: 42px; }
.empty-title { display: block; margin-top: 12px; color: var(--color-text); font-size: 20px; font-weight: 800; }
.empty-desc { margin-top: 8px; line-height: 1.5; }
.back-button { margin-top: 24px; height: 44px; color: var(--color-primary); background: rgba(255, 141, 93, 0.12); }
@media screen and (min-width: 600px) { .content { max-width: 520px; margin: 0 auto; } }
</style>
