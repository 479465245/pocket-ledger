<template>
  <view class="container">
    <view v-if="isAssetMode" class="filter-panel">
      <view class="filter-summary" @click="showFilter = !showFilter">
        <view>
          <text class="filter-title">日期筛选</text>
          <text class="filter-desc">{{ filterSummaryText }}</text>
        </view>
        <text class="filter-toggle">{{ showFilter ? '收起' : '筛选' }}</text>
      </view>

      <view class="asset-total-row">
        <view class="asset-total-item expense">
          <text class="asset-total-label">支出总计</text>
          <text class="asset-total-value">{{ assetTotalSummary.expenseText }}</text>
        </view>
        <view class="asset-total-item income">
          <text class="asset-total-label">收入总计</text>
          <text class="asset-total-value">{{ assetTotalSummary.incomeText }}</text>
        </view>
      </view>

      <button class="asset-add-btn" @click="goAddBill">+ 记一笔</button>

      <view v-if="showFilter" class="filter-body">
        <view class="date-inputs">
          <view class="date-input-wrapper">
            <text class="date-label">开始日期</text>
            <picker mode="date" :value="startDate" @change="startDate = $event.detail.value">
              <view class="date-picker">{{ startDate || '不限' }}</view>
            </picker>
          </view>
          <view class="date-input-wrapper">
            <text class="date-label">结束日期</text>
            <picker mode="date" :value="endDate" @change="endDate = $event.detail.value">
              <view class="date-picker">{{ endDate || '不限' }}</view>
            </picker>
          </view>
        </view>
        <view class="filter-actions">
          <button class="filter-btn ghost" @click="clearDateFilter">清空</button>
          <button class="filter-btn primary" @click="applyDateFilter">确定</button>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="bill-scroll">
      <view class="bill-list">
        <view v-if="filteredBills.length === 0" class="empty-state">
          <view class="empty-illustration">🧾</view>
          <text class="empty-title">暂无账单</text>
          <text class="empty-desc">这个范围里还没有流水。</text>
        </view>

        <view v-for="group in groupedBills" :key="group.dateKey" class="day-group">
          <view class="day-header">
            <view>
              <text class="day-title">{{ group.title }}</text>
              <text class="day-subtitle">{{ group.bills.length }} 笔记录</text>
            </view>
            <text class="day-total">{{ group.totalText }}</text>
          </view>

          <view v-for="bill in group.bills" :key="bill.id" class="bill-item-wrapper">
            <view
              class="bill-item-container"
              :class="{ 'show-actions': activeBillId === bill.id }"
              @touchstart="onTouchStart"
              @touchmove="onTouchMove"
              @touchend="onTouchEnd($event, bill.id)"
              @touchcancel="onTouchCancel"
            >
              <view class="bill-item" :class="getBillStateClass(bill)">
                <view class="bill-left">
                  <view :class="['icon-box', getIconClass(bill)]">
                    <text class="category-icon">{{ getBillIcon(bill) }}</text>
                  </view>
                  <view class="bill-info">
                    <view class="category-row">
                      <text class="category-name">{{ getCategoryName(bill) }}</text>
                      <text v-if="bill.type === 'refund'" class="state-badge refund">退款</text>
                      <text v-else-if="bill.isRefunded" class="state-badge refunded">已退</text>
                    </view>
                    <text class="bill-date">{{ getBillMetaText(bill) }}</text>
                    <text class="bill-remark" v-if="bill.remark">{{ decodeDisplayText(bill.remark) }}</text>
                  </view>
                </view>
                <view class="bill-right">
                  <text :class="['bill-amount', getAmountClass(bill)]">{{ getDisplayAmount(bill) }}</text>
                  <text v-if="isAssetMode" class="balance-snapshot">余 {{ getAssetBalanceSnapshotText(bill) }}</text>
                </view>
              </view>
              <view class="action-buttons">
                <button class="action-btn edit-btn" @click.stop="editBill(bill.id)">编辑</button>
                <button class="action-btn refund-btn" @click.stop="refundBill(bill.id)">退款</button>
                <button class="action-btn delete-btn" @click.stop="deleteBill(bill.id)">删除</button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'
import { formatCurrencyAmount } from '@/utils/currency'
import { decodeHtmlEntities } from '@/utils/text'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '账单明细 - 记账本', path: '/pages/index/index' })

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

const params = ref({})
const showFilter = ref(false)
const startDate = ref('')
const endDate = ref('')
const appliedStartDate = ref('')
const appliedEndDate = ref('')
const activeBillId = ref(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isMoving = ref(false)

const isAssetMode = computed(() => !!params.value.assetId)
const filterSummaryText = computed(() => {
  if (!appliedStartDate.value && !appliedEndDate.value) return '全部日期'
  return `${appliedStartDate.value || '不限'} 至 ${appliedEndDate.value || '不限'}`
})

onLoad((options) => {
  params.value = options
  initStores()

  setTimeout(() => {
    let title = '账单明细'
    if (params.value.assetId) {
      const assetName = params.value.assetName
        ? decodeURIComponent(params.value.assetName)
        : getAssetName(params.value.assetId)
      title = `${decodeDisplayText(assetName)}账单`
    } else if (params.value.id) {
      const name = categoryStore.getCategoryName(params.value.id)
      if (decodeDisplayText(name) === 'Unknown') {
        title = '分类明细'
      } else if (params.value.filterType === 'parent_other') {
        title = `${decodeDisplayText(name)} (其他) 明细`
      } else {
        title = `${decodeDisplayText(name)}明细`
      }
    }
    uni.setNavigationBarTitle({ title })
  }, 100)
})

onShow(() => {
  initStores()
  activeBillId.value = null
  resetTouchState()
})

const initStores = () => {
  billStore.init()
  categoryStore.init()
  assetStore.init()
}

const filteredBills = computed(() => {
  const { id, filterType, period, date, type, assetId } = params.value

  if (assetId) {
    const start = appliedStartDate.value ? new Date(`${appliedStartDate.value} 00:00:00`).getTime() : null
    const end = appliedEndDate.value ? new Date(`${appliedEndDate.value} 23:59:59.999`).getTime() : null

    return billStore.bills.filter(b => {
      if (!(b.assetId === assetId || (b.type === 'transfer' && b.targetAssetId === assetId))) return false
      if (start !== null && b.timestamp < start) return false
      if (end !== null && b.timestamp > end) return false
      return true
    }).sort((a, b) => b.timestamp - a.timestamp)
  }

  let start, end
  if (period === 'month') {
    const [y, m] = date.split('-').map(Number)
    start = new Date(y, m - 1, 1).getTime()
    end = new Date(y, m, 0, 23, 59, 59, 999).getTime()
  } else {
    const y = Number(date)
    start = new Date(y, 0, 1).getTime()
    end = new Date(y, 11, 31, 23, 59, 59, 999).getTime()
  }

  return billStore.bills.filter(b => {
    if (b.timestamp < start || b.timestamp > end) return false
    if (billStore.getStatType(b) !== type) return false
    if (params.value.currency && (b.currency || 'CNY') !== params.value.currency) return false
    if (b.isIncludedInStats === false) return false

    if (filterType === 'parent') {
      return b.parentCategoryId === id
    } else if (filterType === 'sub') {
      return b.categoryId === id
    } else if (filterType === 'parent_other') {
      return b.parentCategoryId === id && (!b.categoryId || b.categoryId === id)
    }

    return false
  }).sort((a, b) => b.timestamp - a.timestamp)
})

const assetTotalSummary = computed(() => {
  const incomeMap = {}
  const expenseMap = {}

  filteredBills.value.forEach(bill => {
    const scoped = getAssetScopedAmount(bill)
    const currency = scoped.currency || 'CNY'
    const amount = Number(scoped.amount || 0)
    if (amount > 0) {
      incomeMap[currency] = (incomeMap[currency] || 0) + amount
    } else if (amount < 0) {
      expenseMap[currency] = (expenseMap[currency] || 0) + Math.abs(amount)
    }
  })

  const formatMap = (map) => {
    const entries = Object.entries(map)
    if (!entries.length) return formatCurrencyAmount(0, 'CNY')
    return entries.map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join(' / ')
  }

  return {
    incomeText: formatMap(incomeMap),
    expenseText: formatMap(expenseMap)
  }
})

const groupedBills = computed(() => {
  const groups = []
  const map = new Map()

  filteredBills.value.forEach(bill => {
    const dateKey = formatDateKey(bill.timestamp)
    const scoped = getAssetScopedAmount(bill)
    const key = `${dateKey}__${scoped.currency || 'CNY'}`
    if (!map.has(key)) {
      const group = {
        dateKey: key,
        title: formatDayTitle(bill.timestamp),
        bills: [],
        total: 0,
        currency: scoped.currency || 'CNY'
      }
      map.set(key, group)
      groups.push(group)
    }

    const group = map.get(key)
    group.bills.push(bill)
    group.total += scoped.amount
  })

  return groups.map(group => ({
    ...group,
    totalText: formatCurrencyAmount(group.total, group.currency)
  }))
})

const clearDateFilter = () => {
  startDate.value = ''
  endDate.value = ''
  appliedStartDate.value = ''
  appliedEndDate.value = ''
  showFilter.value = false
}

const applyDateFilter = () => {
  if (startDate.value && endDate.value && new Date(startDate.value) > new Date(endDate.value)) {
    uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
    return
  }
  appliedStartDate.value = startDate.value
  appliedEndDate.value = endDate.value
  showFilter.value = false
}

const resetTouchState = () => {
  touchStartX.value = 0
  touchStartY.value = 0
  isMoving.value = false
}

const onTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  isMoving.value = false
}

const onTouchMove = (e) => {
  const deltaX = e.touches[0].clientX - touchStartX.value
  const deltaY = e.touches[0].clientY - touchStartY.value
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    isMoving.value = true
    e.preventDefault?.()
  }
}

const onTouchEnd = (e, billId) => {
  if (!isMoving.value) {
    resetTouchState()
    return
  }
  const deltaX = e.changedTouches[0].clientX - touchStartX.value
  if (deltaX < -50) {
    activeBillId.value = billId
  } else if (deltaX > 50) {
    activeBillId.value = null
  }
  resetTouchState()
}

const onTouchCancel = () => {
  activeBillId.value = null
  resetTouchState()
}

const decodeDisplayText = (value) => decodeHtmlEntities(value)

const getCategoryName = (bill) => {
  if (bill.type === 'transfer') return params.value.assetId ? '转账' : '信用卡还款'
  if (bill.type === 'adjustment') return '资产调整'
  if (bill.type === 'refund') return `退款 · ${getCategoryNameById(bill.categoryId || bill.parentCategoryId)}`
  return getCategoryNameById(bill.categoryId || bill.parentCategoryId)
}

const getCategoryNameById = (id) => {
  const name = categoryStore.getCategoryName(id)
  return name === 'Unknown' ? '未分类' : decodeDisplayText(name)
}

const getAssetName = (id) => {
  const asset = assetStore.getAsset(id)
  return asset ? decodeDisplayText(asset.name) : '未知资产'
}

const formatDateKey = (ts) => {
  const date = new Date(ts || Date.now())
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDayTitle = (ts) => {
  const date = new Date(ts || Date.now())
  const today = new Date()
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const key = formatDateKey(ts)

  if (key === formatDateKey(today.getTime())) return '今天'
  if (key === formatDateKey(yesterday.getTime())) return '昨天'

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const dateText = `${date.getMonth() + 1}月${date.getDate()}日`
  const yearText = date.getFullYear() !== today.getFullYear() ? ` ${date.getFullYear()}年` : ''
  return `${dateText}${yearText} ${weekdays[date.getDay()]}`
}

const formatDate = (ts) => new Date(ts).toLocaleDateString()

const getBillMetaText = (bill) => {
  let text
  if (bill.type === 'transfer') {
    text = `${getAssetName(bill.assetId)} → ${getAssetName(bill.targetAssetId)}`
  } else {
    text = getAssetName(bill.assetId)
  }

  if (bill.installment?.groupId) {
    text += ` · 第 ${bill.installment.period}/${bill.installment.totalPeriods} 期`
  }
  return text
}

const getAssetScopedAmount = (bill) => {
  const assetId = params.value.assetId
  if (assetId && bill.type === 'transfer' && bill.targetAssetId === assetId) {
    return {
      amount: Number(bill.targetAmount ?? Math.abs(Number(bill.amount || 0))),
      currency: bill.targetCurrency || bill.currency || 'CNY'
    }
  }

  return {
    amount: Number(bill.amount || 0),
    currency: bill.currency || 'CNY'
  }
}

const getDisplayAmount = (bill) => {
  const scoped = getAssetScopedAmount(bill)
  return formatCurrencyAmount(scoped.amount, scoped.currency)
}

const getAssetBalanceSnapshotText = (bill) => {
  const assetId = params.value.assetId
  if (assetId && bill.type === 'transfer' && bill.targetAssetId === assetId) {
    if (bill.targetBalanceSnapshot === undefined) return '--'
    return formatCurrencyAmount(bill.targetBalanceSnapshot, bill.targetBalanceCurrency || bill.targetCurrency || bill.currency || 'CNY')
  }

  if (bill.balanceSnapshot === undefined) return '--'
  return formatCurrencyAmount(bill.balanceSnapshot, bill.balanceCurrency || bill.currency || 'CNY')
}

const getAmountClass = (bill) => {
  return getAssetScopedAmount(bill).amount >= 0 ? 'income' : 'expense'
}

const getBillIcon = (bill) => {
  if (bill.type === 'transfer') return '⇄'
  if (bill.type === 'refund') return '↩'
  if (bill.type === 'adjustment') return '⚖️'
  return getAssetScopedAmount(bill).amount >= 0 ? '入' : '支'
}

const getIconClass = (bill) => {
  if (bill.type === 'transfer') return 'transfer-icon'
  if (bill.type === 'refund') return 'refund-icon'
  if (bill.type === 'adjustment') return 'adjustment-icon'
  return getAssetScopedAmount(bill).amount >= 0 ? 'income-icon' : 'expense-icon'
}

const getBillStateClass = (bill) => {
  if (bill.type === 'refund') return 'is-refund'
  if (bill.isRefunded) return 'is-refunded'
  return ''
}

const goAddBill = () => {
  const assetId = params.value.assetId
  const query = assetId ? `?assetId=${assetId}` : ''
  activeBillId.value = null
  uni.navigateTo({ url: `/pages/bill/add${query}` })
}

const editBill = (id) => {
  const bill = billStore.getBill(id)
  if (!bill) {
    uni.showToast({ title: '账单不存在', icon: 'none' })
    return
  }
  activeBillId.value = null
  const url = bill.installment?.groupId
    ? `/pages/bill/installment?id=${id}`
    : bill.type === 'refund'
      ? `/pages/bill/refund?refundId=${id}`
    : '/pages/bill/add?id=' + id + '&type=' + bill.type
  uni.navigateTo({ url })
}

const refundBill = (id) => {
  activeBillId.value = null
  uni.navigateTo({ url: `/pages/bill/refund?id=${id}` })
}
const deleteBill = (id) => {
  uni.showModal({
    title: '删除账单',
    content: '确定要删除这条账单吗？',
    success: async (res) => {
      if (!res.confirm) return
      await billStore.deleteBill(id)
      activeBillId.value = null
      uni.showToast({ title: '已删除', icon: 'success' })
    }
  })
}
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-panel {
  margin: 14px 16px 4px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 249, 240, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow: 5px 5px 14px rgba(163, 177, 198, 0.22), -5px -5px 14px rgba(255, 255, 255, 0.78);
}

.filter-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-title {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text);
}

.filter-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-light);
}

.filter-toggle {
  padding: 7px 12px;
  border-radius: 14px;
  background: var(--color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.asset-total-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.asset-total-item {
  flex: 1;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  min-width: 0;
}

.asset-total-label,
.asset-total-value {
  display: block;
}

.asset-total-label {
  margin-bottom: 4px;
  color: var(--color-text-light);
  font-size: 11px;
}

.asset-total-value {
  font-size: 14px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-total-item.expense .asset-total-value {
  color: var(--color-primary);
}

.asset-total-item.income .asset-total-value {
  color: #5b9469;
}

.asset-add-btn {
  width: 100%;
  min-height: 46px;
  margin-top: 12px;
  border: none;
  border-radius: 16px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.filter-body {
  margin-top: 14px;
}

.date-inputs {
  display: flex;
  gap: 12px;
}

.date-input-wrapper {
  flex: 1;
}

.date-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--color-text-light);
}

.date-picker {
  padding: 11px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--color-text);
  font-size: 13px;
  text-align: center;
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.filter-btn {
  flex: 1;
  min-height: 40px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
}

.filter-btn.ghost {
  background: #fff3e7;
  color: var(--color-text);
}

.filter-btn.primary {
  background: var(--color-primary);
  color: #fff;
}

.bill-scroll {
  flex: 1;
  overflow-y: hidden;
}

.bill-list {
  padding: 16px 16px 60px;
}

.empty-state {
  margin-top: 46px;
  padding: 28px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.42);
  text-align: center;
  box-shadow: inset 3px 3px 10px rgba(163, 177, 198, 0.22), inset -3px -3px 10px rgba(255, 255, 255, 0.75);
}

.empty-illustration {
  font-size: 36px;
  margin-bottom: 10px;
}

.empty-title {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}

.empty-desc {
  display: block;
  font-size: 13px;
  color: var(--color-text-light);
}

.day-group {
  margin-bottom: 18px;
}

.day-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 4px 4px 10px;
}

.day-title {
  display: block;
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text);
}

.day-subtitle,
.day-total {
  font-size: 12px;
  color: var(--color-text-light);
}

.bill-item-wrapper {
  position: relative;
  margin-bottom: 10px;
  overflow: hidden;
  border-radius: 20px;
}

.bill-item-container {
  position: relative;
  transition: transform 0.3s ease;
  touch-action: pan-y;
}

.bill-item-container.show-actions {
  transform: translateX(-240rpx);
}

.bill-item {
  min-height: 70px;
  padding: 14px 14px;
  margin-bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
  background: rgba(255, 249, 240, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 20px;
  box-shadow: 5px 5px 14px rgba(163, 177, 198, 0.26), -5px -5px 14px rgba(255, 255, 255, 0.78);
}

.bill-item.is-refunded { opacity: 0.72; }

.bill-item.is-refund {
  background: rgba(255, 245, 234, 0.94);
}

.bill-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.icon-box {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: inset -3px -3px 8px rgba(255, 255, 255, 0.9), inset 3px 3px 8px rgba(163, 177, 198, 0.2);
}

.icon-box.expense-icon { background: rgba(255, 141, 93, 0.14); color: var(--color-primary); }
.icon-box.income-icon { background: rgba(136, 177, 148, 0.18); color: #5b9469; }
.icon-box.transfer-icon { background: rgba(75, 163, 255, 0.16); color: #4BA3FF; }
.icon-box.refund-icon { background: rgba(255, 149, 0, 0.16); color: #ff9500; }
.icon-box.adjustment-icon { background: rgba(138, 138, 138, 0.14); color: #666; }

.category-icon {
  font-size: 20px;
  line-height: 1;
}

.bill-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.category-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.category-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-date,
.bill-remark {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-remark {
  font-size: 11px;
  color: rgba(74, 74, 74, 0.62);
}

.bill-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 44%;
  margin-left: 8px;
}

.bill-amount {
  font-size: 16px;
  font-weight: 900;
  text-align: right;
}

.balance-snapshot {
  margin-top: 4px;
  color: var(--color-text-light);
  font-size: 11px;
  text-align: right;
  white-space: nowrap;
}

.action-buttons {
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 240rpx;
  display: flex;
  align-items: stretch;
  height: 100%;
}

.action-btn {
  flex: 1;
  height: 100%;
  border: none;
  border-radius: 0;
  font-size: 26rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.edit-btn { background-color: #007aff; }
.refund-btn { background-color: #ff9500; }
.delete-btn { background-color: #ff3b30; }

.expense { color: var(--color-text); }
.income { color: #5b9469; }

.state-badge {
  margin-left: 6px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  color: #fff;
  flex-shrink: 0;
}

.state-badge.refund { background: #ff9500; }
.state-badge.refunded { background: #999; }
</style>
