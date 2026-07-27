<template>
  <view v-if="modelValue" class="refund-mask" @click="close">
    <view class="refund-modal" @click.stop>
      <text class="refund-title">确认退款</text>
      <text class="refund-desc">退款金额将冲销资产余额，但不会计入收支统计。</text>

      <view class="refund-amount-field">
        <text class="refund-label">退款金额</text>
        <view class="refund-input-wrap">
          <text class="refund-currency">{{ currencySymbol }}</text>
          <input
            class="refund-input"
            type="digit"
            :value="amountText"
            :focus="modelValue"
            placeholder="0.00"
            @input="onAmountInput"
          />
        </view>
      </view>

      <text class="refund-limit">最多可退 {{ currencySymbol }} {{ maximumAmountText }}</text>
      <text v-if="errorMessage" class="refund-error">{{ errorMessage }}</text>

      <view class="refund-actions">
        <button class="refund-action cancel" @click="close">取消</button>
        <button class="refund-action confirm" @click="confirm">确认退款</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getCurrencySymbol } from '@/utils/currency'
import { validateRefundAmount } from '@/utils/refund'

const props = defineProps({
  modelValue: Boolean,
  maxAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'CNY'
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])
const amountText = ref('')
const errorMessage = ref('')
const currencySymbol = computed(() => getCurrencySymbol(props.currency))
const maximumAmountText = computed(() => Number(props.maxAmount || 0).toFixed(2))

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  amountText.value = maximumAmountText.value
  errorMessage.value = ''
})

const onAmountInput = (event) => {
  let value = event.detail.value.replace(/[^\d.]/g, '')
  const parts = value.split('.')
  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
  if (parts[1]?.length > 2) value = parts[0] + '.' + parts[1].slice(0, 2)
  amountText.value = value
  errorMessage.value = ''
}

const close = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  try {
    emit('confirm', validateRefundAmount(amountText.value, props.maxAmount))
  } catch (error) {
    errorMessage.value = error.message || '退款金额不正确'
  }
}
</script>

<style lang="scss" scoped>
.refund-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background: rgba(44, 42, 38, 0.36);
}

.refund-modal {
  width: 100%;
  max-width: 360px;
  padding: 22px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 24px;
  box-sizing: border-box;
  background: rgba(255, 249, 240, 0.96);
  box-shadow: 0 18px 42px rgba(74, 74, 74, 0.2);
}

.refund-title {
  display: block;
  color: var(--color-text);
  font-size: 19px;
  font-weight: 800;
}

.refund-desc,
.refund-limit,
.refund-error {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
}

.refund-desc,
.refund-limit {
  color: var(--color-text-light);
}

.refund-amount-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  margin-top: 18px;
  padding: 0 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(136, 177, 148, 0.24);
}

.refund-label {
  color: var(--color-text);
  font-size: 14px;
  font-weight: 700;
}

.refund-input-wrap {
  display: flex;
  align-items: baseline;
  min-width: 0;
  flex: 1;
  justify-content: flex-end;
}

.refund-currency {
  margin-right: 4px;
  color: var(--color-primary);
  font-size: 16px;
}

.refund-input {
  width: 150px;
  max-width: 100%;
  height: 44px;
  color: var(--color-primary);
  font-size: 25px;
  font-weight: 800;
  line-height: 44px;
  text-align: right;
}

.refund-error {
  color: #d55a48;
}

.refund-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.refund-action {
  flex: 1;
  height: 44px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 800;
  line-height: 44px;
}

.refund-action.cancel {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(138, 138, 138, 0.14);
}

.refund-action.confirm {
  color: #fff;
  background: var(--color-primary);
  box-shadow: 0 4px 10px rgba(255, 141, 93, 0.25);
}
</style>
