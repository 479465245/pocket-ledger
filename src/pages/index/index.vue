<template>
  <view class="container">
    <view class="fixed-header">
      <view class="segment-wrap neu-card">
        <view
          :class="['segment-item', currentView === 'bill' ? 'active' : '']"
          @click="switchView('bill')"
        >账单</view>
        <view
          :class="['segment-item', currentView === 'asset' ? 'active' : '']"
          @click="switchView('asset')"
        >资产</view>
      </view>

      <view
        class="header summary-card"
        @touchstart="onSummaryTouchStart"
        @touchmove="onSummaryTouchMove"
        @touchend="onSummaryTouchEnd"
      >
        <template v-if="currentView === 'bill'">
          <picker mode="date" fields="month" :value="currentMonthStr" @change="onMonthChange">
            <view class="title-wrapper">
              <text class="title">{{ currentMonthStr }} 支出 ▼</text>
            </view>
          </picker>
          <text class="amount">¥ {{ currentMonthExpense }}</text>
        </template>

        <template v-else>
          <text class="title">资产总计</text>
          <text class="amount">¥ {{ totalAsset }}</text>
          <text class="summary-tip">只统计人民币余额，外币单独展示</text>
        </template>
      </view>

      <view class="actions" v-if="currentView === 'bill'">
        <button class="neu-btn add-btn" @click="goAddBill">+ 记一笔</button>
      </view>
    </view>

    <scroll-view v-if="currentView === 'bill'" scroll-y class="bill-scroll">
      <view class="bill-list">
        <view v-if="displayedBills.length === 0" class="empty-state">
          <view class="empty-illustration">🧾</view>
          <text class="empty-title">本月还没有账单</text>
          <text class="empty-desc">点下面“记一笔”，今天的钱都抓回来。</text>
        </view>

        <view v-for="group in groupedBills" :key="group.dateKey" class="day-group">
          <view class="day-header">
            <view>
              <text class="day-title">{{ group.title }}</text>
              <text class="day-subtitle">{{ group.bills.length }} 笔记录</text>
            </view>
            <text class="day-total">{{ group.expenseText }}</text>
          </view>

          <view v-for="bill in group.bills" :key="bill.id" class="bill-item-wrapper">
            <view
              class="bill-item-container"
              :class="{ 'show-actions': activeBillId === bill.id }"
              @touchstart="onTouchStart"
              @touchmove="onTouchMove"
              @touchend="onTouchEnd($event, bill.id)"
              @touchcancel="onBillTouchCancel"
            >
              <view class="bill-item" :class="getBillStateClass(bill)">
                <view class="bill-left">
                  <view :class="['icon-box', getIconClass(bill)]">
                    <text class="category-icon">{{ getBillIcon(bill) }}</text>
                  </view>
                  <view class="bill-info">
                    <view class="category-row">
                      <text class="category-name">{{ getBillTitle(bill) }}</text>
                      <text v-if="bill.type === 'refund'" class="state-badge refund">退款</text>
                      <text v-else-if="bill.isRefunded" class="state-badge refunded">已退</text>
                    </view>
                    <text class="bill-date">{{ getBillMetaText(bill) }}</text>
                    <text v-if="bill.remark || bill.note" class="bill-remark">{{ bill.remark || bill.note }}</text>
                  </view>
                </view>

                <view class="bill-right">
                  <text :class="['bill-amount', getAmountClass(bill)]">{{ getDisplayAmount(bill) }}</text>
                  <text class="balance-snapshot">余 {{ getBalanceSnapshotText(bill) }}</text>
                </view>
              </view>

              <view class="action-buttons">
                <button class="action-btn edit-btn" @click="editBill(bill.id)">编辑</button>
                <button class="action-btn refund-btn" @click="refundBill(bill.id)">退款</button>
                <button class="action-btn delete-btn" @click="deleteBill(bill.id)">删除</button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <scroll-view v-else scroll-y class="bill-scroll">
      <view class="asset-list-home">
        <view v-if="assets.length === 0" class="empty-tip">暂无资产</view>
        <view v-for="asset in assets" :key="asset.id" class="asset-item-wrapper">
          <view
            class="asset-item-container"
            :class="{ 'show-actions': activeAssetId === asset.id }"
            @touchstart="onAssetTouchStart"
            @touchmove="onAssetTouchMove"
            @touchend="onAssetTouchEnd($event, asset.id)"
            @touchcancel="onAssetTouchCancel"
          >
            <view class="neu-card home-asset-item" @click="openAssetBills(asset)">
              <view class="asset-left">
                <view class="asset-icon">{{ getAssetIcon(asset.type) }}</view>
                <view class="asset-info">
                  <text class="asset-name">{{ asset.name }}</text>
                  <text class="asset-type">{{ getTypeName(asset.type) }}</text>
                  <text v-if="asset.includeInTotal === false" class="exclude-total-badge">不计入总计</text>
                </view>
              </view>
              <view class="asset-balance">
                <text v-for="line in getAssetBalanceLines(asset)" :key="line" class="balance-line">{{ line }}</text>
              </view>
            </view>
            <view class="asset-action-buttons">
              <button class="asset-action-btn asset-edit-btn" @click.stop="openEditAsset(asset)">编辑</button>
              <button class="asset-action-btn asset-delete-btn" @click.stop="confirmDeleteAsset(asset)">删除</button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="currentView === 'asset'" class="asset-fab neu-btn" @click="openAddAsset">+</view>

    <view v-if="showAssetModal" class="modal-mask">
      <view class="modal neu-card" @click.stop>
        <view class="modal-title">{{ isEditAssetMode ? '编辑资产' : '添加资产' }}</view>
        <view class="input-wrap" @click.stop="focusAssetNameInput">
          <input
            class="neu-input"
            :value="assetForm.name"
            :focus="assetNameInputFocus"
            placeholder="资产名称 (如: 工资卡)"
            confirm-type="next"
            @focus="assetNameInputFocus = true"
            @blur="assetNameInputFocus = false"
            @input="onAssetNameInput"
          />
        </view>
        <view class="input-wrap type-wrap">
          <text class="type-label">资产类型</text>
          <view class="type-options">
            <view
              v-for="option in assetTypeOptions"
              :key="option.value"
              :class="['type-option', assetForm.type === option.value ? 'active' : '']"
              @click.stop="selectAssetType(option.value)"
            >{{ option.label }}</view>
          </view>
        </view>
        <view class="input-wrap" @click.stop="focusAssetBalanceInput">
          <input
            class="neu-input"
            :value="assetForm.balance"
            :focus="assetBalanceInputFocus"
            type="digit"
            :placeholder="isEditAssetMode ? '总金额' : '初始余额'"
            confirm-type="done"
            @focus="assetBalanceInputFocus = true"
            @blur="assetBalanceInputFocus = false"
            @input="onAssetBalanceInput"
          />
        </view>
        <view class="input-wrap switch-wrap">
          <view class="switch-info">
            <text class="switch-title">计入总计</text>
            <text class="switch-desc">关闭后，该资产金额不计入资产总计</text>
          </view>
          <switch :checked="assetForm.includeInTotal" color="#88B194" @change="onAssetIncludeInTotalChange" />
        </view>
        <text v-if="isEditAssetMode" class="edit-tip">修改总金额后，会自动生成一条资产调整记录。</text>
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="closeAssetModal">取消</button>
          <button class="modal-btn confirm" @click="confirmSaveAsset">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'
import { ASSET_ADJUSTMENT_CATEGORY_ID } from '@/store/category'
import { formatCurrencyAmount } from '@/utils/currency'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '记账本 - 轻松记录每一笔', path: '/pages/index/index' })

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

onShow(() => {
  categoryStore.init()
  assetStore.init()
  billStore.init()
  activeBillId.value = null
  activeAssetId.value = null
  resetBillTouchState()
  resetAssetTouchState()
})

const now = new Date()
const currentView = ref('bill')
const currentMonthStr = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

const activeBillId = ref(null)
const activeAssetId = ref(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isMoving = ref(false)

const assetTouchStartX = ref(0)
const assetTouchStartY = ref(0)
const assetIsMoving = ref(false)
const showAssetModal = ref(false)
const isEditAssetMode = ref(false)
const editingAssetId = ref('')
const assetForm = reactive({ name: '', balance: '', type: 'digital' })
const assetNameInputFocus = ref(false)
const assetBalanceInputFocus = ref(false)

const summaryStartX = ref(0)
const summaryStartY = ref(0)
const summaryMoving = ref(false)

const assetTypeOptions = [
  { value: 'cash', label: '现金' },
  { value: 'digital', label: '电子钱包' },
  { value: 'bank', label: '银行卡' },
  { value: 'credit', label: '信用账户' },
  { value: 'other', label: '其他' }
]

const switchView = (view) => {
  currentView.value = view
  activeBillId.value = null
  activeAssetId.value = null
}

const onSummaryTouchStart = (e) => {
  summaryStartX.value = e.touches[0].clientX
  summaryStartY.value = e.touches[0].clientY
  summaryMoving.value = false
}

const onSummaryTouchMove = (e) => {
  const deltaX = e.touches[0].clientX - summaryStartX.value
  const deltaY = e.touches[0].clientY - summaryStartY.value
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
    summaryMoving.value = true
  }
}

const onSummaryTouchEnd = (e) => {
  if (!summaryMoving.value) return
  const deltaX = e.changedTouches[0].clientX - summaryStartX.value
  if (deltaX < -50) switchView('asset')
  if (deltaX > 50) switchView('bill')
  summaryMoving.value = false
}

const onMonthChange = (e) => {
  currentMonthStr.value = e.detail.value
}

const currentMonthBills = computed(() => {
  const [year, month] = currentMonthStr.value.split('-').map(Number)
  const start = new Date(year, month - 1, 1).getTime()
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime()
  return billStore.bills.filter(b => b.timestamp >= start && b.timestamp <= end)
})

const currentMonthExpense = computed(() => {
  return currentMonthBills.value
    .filter(b => b.type === 'expense' && (b.currency || 'CNY') === 'CNY' && b.isIncludedInStats !== false)
    .reduce((acc, cur) => acc + billStore.getStatAmount(cur), 0)
    .toFixed(2)
})

const displayedBills = computed(() => {

  return [...currentMonthBills.value].sort((a, b) => b.timestamp - a.timestamp)

})



const groupedBills = computed(() => {

  const groups = []

  const map = new Map()



  displayedBills.value.forEach(bill => {

    const dateKey = formatDateKey(bill.timestamp)

    if (!map.has(dateKey)) {

      const group = {

        dateKey,

        title: formatDayTitle(bill.timestamp),

        bills: [],

        expense: 0

      }

      map.set(dateKey, group)

      groups.push(group)

    }



    const group = map.get(dateKey)

    group.bills.push(bill)

    if (bill.type === 'expense' && (bill.currency || 'CNY') === 'CNY' && bill.isIncludedInStats !== false) {

      group.expense += billStore.getStatAmount(bill)

    }

  })



  return groups.map(group => ({

    ...group,

    expenseText: group.expense > 0 ? `支出 ${formatMoney(group.expense, 'CNY')}` : '无统计支出'

  }))

})

const assets = computed(() => assetStore.assets)

const totalAsset = computed(() => {
  return assets.value
    .filter(asset => asset.includeInTotal !== false)
    .reduce((acc, cur) => acc + Number(cur.currentBalance || 0), 0)
    .toFixed(2)
})

const getAssetBalanceLines = (asset) => {
  const balances = asset.balances || { CNY: asset.currentBalance || 0 }
  const lines = Object.entries(balances)
    .filter(([, amount]) => Number(amount || 0) !== 0)
    .map(([currency, amount]) => formatCurrencyAmount(amount, currency))
  return lines.length ? lines : [formatCurrencyAmount(0, 'CNY')]
}

const getAssetIcon = (type) => {
  const map = {
    cash: '💵',
    digital: '📱',
    bank: '💳',
    credit: '💳',
    other: '📦'
  }
  return map[type] || '📦'
}

const getTypeName = (type) => {

  const map = {

    cash: '现金',

    digital: '电子钱包',

    bank: '银行卡',

    credit: '信用账户',

    other: '其他'

  }

  return map[type] || type

}

const goAddBill = () => {
  activeBillId.value = null
  uni.navigateTo({ url: '/pages/bill/add' })
}

const openAssetBills = (asset) => {

  if (!asset?.id) return

  if (activeAssetId.value === asset.id) {

    activeAssetId.value = null

    return

  }



  const assetName = encodeURIComponent(asset.name || '')

  uni.navigateTo({

    url: `/pages/stats/list?assetId=${asset.id}&assetName=${assetName}`

  })

}

const onTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  isMoving.value = false
}

const resetBillTouchState = () => {
  touchStartX.value = 0
  touchStartY.value = 0
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
    resetBillTouchState()
    return
  }
  const deltaX = e.changedTouches[0].clientX - touchStartX.value
  if (deltaX < -50) {
    activeBillId.value = billId
  } else if (deltaX > 50) {
    activeBillId.value = null
  }
  resetBillTouchState()
}

const onBillTouchCancel = () => {
  activeBillId.value = null
  resetBillTouchState()
}

const editBill = (id) => {
  const bill = billStore.bills.find(b => b.id === id)
  if (bill) {
    uni.navigateTo({ url: `/pages/bill/add?id=${id}&type=${bill.type}` })
  }
  activeBillId.value = null
}

const refundBill = (id) => {
  const bill = billStore.getBill(id)
  if (!bill) {
    uni.showToast({ title: '账单不存在', icon: 'none' })
    return
  }

  if (bill.type === 'transfer') {
    uni.showToast({ title: '转账记录不支持退款', icon: 'none' })
    activeBillId.value = null
    return
  }

  if (bill.type === 'adjustment') {
    uni.showToast({ title: '资产调整记录不支持退款', icon: 'none' })
    activeBillId.value = null
    return
  }

  if (bill.type === 'refund') {
    uni.showToast({ title: '退款记录不能再次退款', icon: 'none' })
    activeBillId.value = null
    return
  }

  if (bill.isRefunded) {
    uni.showToast({ title: '该账单已退款', icon: 'none' })
    activeBillId.value = null
    return
  }

  uni.showModal({
    title: '确认退款',
    content: '将按原金额生成一条退款记录，并自动修正余额。',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await billStore.createRefund(id)
        uni.showToast({ title: '退款已生成', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message || '退款失败', icon: 'none' })
      } finally {
        activeBillId.value = null
      }
    }
  })
}

const getBillIcon = (bill) => {
  if (bill.type === 'transfer') return '⇄'
  if (bill.type === 'refund') return '↩'
  if (bill.type === 'adjustment') return '⚖️'

  const categoryId = bill.categoryId || bill.parentCategoryId
  for (const cat of categoryStore.categories) {
    if (cat.id === categoryId) return cat.icon || cat.name?.[0] || '¥'
    const child = (cat.children || []).find(item => item.id === categoryId)
    if (child) return child.icon || child.name?.[0] || cat.icon || '¥'
  }
  return bill.type === 'income' ? '入' : '支'
}

const getIconClass = (bill) => {
  if (bill.type === 'transfer') return 'transfer-icon'
  if (bill.type === 'refund') return 'refund-icon'
  if (bill.type === 'adjustment') return 'adjustment-icon'
  return Number(bill.amount) >= 0 ? 'income-icon' : 'expense-icon'
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

const formatMoney = (amount, currency = 'CNY') => {

  const value = Number(amount || 0)

  const text = Math.abs(value).toFixed(2)

  return currency === 'CNY' ? `¥ ${text}` : `${text} ${currency}`

}



const formatSignedMoney = (amount, currency = 'CNY') => {

  const value = Number(amount || 0)

  const sign = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${sign}${formatMoney(value, currency)}`

}



const getBillMetaText = (bill) => {

  if (bill.type === 'transfer') {

    return `${getAssetName(bill.assetId)} → ${getAssetName(bill.targetAssetId)}`

  }

  return getAssetName(bill.assetId)

}



const getDisplayAmount = (bill) => {

  if (bill.type === 'transfer') {

    const out = formatMoney(Math.abs(bill.amount || 0), bill.currency || 'CNY')

    const into = formatMoney(bill.targetAmount || Math.abs(bill.amount || 0), bill.targetCurrency || bill.currency || 'CNY')

    return `${out} → ${into}`

  }

  return formatSignedMoney(bill.amount || 0, bill.currency || 'CNY')

}

const getAmountClass = (bill) => {

  if (bill.type === 'transfer') return 'transfer'

  if (bill.type === 'adjustment') return 'adjustment'

  return Number(bill.amount) >= 0 ? 'income' : 'expense'

}

const getBalanceSnapshotText = (bill) => {

  if (bill.type === 'transfer') {

    const source = bill.balanceSnapshot !== undefined

      ? formatMoney(bill.balanceSnapshot, bill.balanceCurrency || bill.currency || 'CNY')

      : '--'

    const target = bill.targetBalanceSnapshot !== undefined

      ? formatMoney(bill.targetBalanceSnapshot, bill.targetBalanceCurrency || bill.targetCurrency || 'CNY')

      : '--'

    return `${source} / ${target}`

  }



  if (bill.balanceSnapshot === undefined) return '--'

  return formatMoney(bill.balanceSnapshot, bill.balanceCurrency || bill.currency || 'CNY')

}

const getBillTitle = (bill) => {
  if (bill.type === 'transfer') return '转账'
  if (bill.type === 'adjustment') return '资产调整'
  if (bill.type === 'refund') return `退款 · ${getCategoryName(bill.categoryId || bill.parentCategoryId)}`
  return getCategoryName(bill.categoryId || bill.parentCategoryId)
}

const getBillStateClass = (bill) => {
  if (bill.type === 'refund') return 'is-refund'
  if (bill.isRefunded) return 'is-refunded'
  return ''
}

const getCategoryName = (id) => {
  return categoryStore.getCategoryName(id)
}

const getAssetName = (id) => {
  const asset = assetStore.getAsset(id)
  return asset ? asset.name : '未知资产'
}

const formatDate = (ts) => {
  return new Date(ts).toLocaleDateString()
}

const deleteBill = (id) => {
  uni.showModal({
    title: '删除账单',
    content: '确定要删除这条账单吗？这将触发余额修正。',
    success: (res) => {
      if (res.confirm) {
        billStore.deleteBill(id)
        activeBillId.value = null
      }
    }
  })
}

const resetAssetInputFocus = () => {
  assetNameInputFocus.value = false
  assetBalanceInputFocus.value = false
}

const focusAssetNameInput = async () => {
  assetBalanceInputFocus.value = false
  await nextTick()
  assetNameInputFocus.value = true
}

const focusAssetBalanceInput = async () => {
  assetNameInputFocus.value = false
  await nextTick()
  assetBalanceInputFocus.value = true
}

const onAssetNameInput = (e) => {
  assetForm.name = e.detail.value
}

const onAssetBalanceInput = (e) => {
  assetForm.balance = e.detail.value
}

const onAssetIncludeInTotalChange = (e) => {
  assetForm.includeInTotal = e.detail.value
}

const selectAssetType = (type) => {
  assetForm.type = type || 'digital'
}

const openAddAsset = () => {
  resetAssetInputFocus()
  isEditAssetMode.value = false
  editingAssetId.value = ''
  assetForm.name = ''
  assetForm.balance = ''
  assetForm.type = 'digital'
  assetForm.includeInTotal = true
  activeAssetId.value = null
  showAssetModal.value = true
}

const openEditAsset = (asset) => {
  resetAssetInputFocus()
  isEditAssetMode.value = true
  editingAssetId.value = asset.id
  activeAssetId.value = null
  showAssetModal.value = true

  setTimeout(() => {
    assetForm.name = asset.name || ''
    assetForm.balance = Number(asset.currentBalance || 0).toFixed(2)
    assetForm.type = asset.type || 'digital'
    assetForm.includeInTotal = asset.includeInTotal !== false
  }, 0)
}

const closeAssetModal = () => {
  resetAssetInputFocus()
  showAssetModal.value = false
  isEditAssetMode.value = false
  editingAssetId.value = ''
  assetForm.name = ''
  assetForm.balance = ''
  assetForm.type = 'digital'
  assetForm.includeInTotal = true
}

const confirmSaveAsset = async () => {
  const name = assetForm.name.trim()
  const balance = Number(assetForm.balance || 0)

  if (!name) {
    uni.showToast({ title: '请输入资产名称', icon: 'none' })
    return
  }

  if (Number.isNaN(balance)) {
    uni.showToast({ title: '请输入正确金额', icon: 'none' })
    return
  }

  try {
    if (!isEditAssetMode.value) {
      const asset = assetStore.addAsset({
        name,
        type: assetForm.type || 'digital',
        initialBalance: 0,
        includeInTotal: assetForm.includeInTotal
      })

      if (balance !== 0) {
        await billStore.addBill({
          amount: balance,
          assetId: asset.id,
          type: 'adjustment',
          timestamp: null,
          remark: `资产新建：${balance.toFixed(2)}`,
          currency: 'CNY',
          targetCurrency: 'CNY',
          parentCategoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
          categoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
          isIncludedInStats: false,
          fee: 0
        })
      }

      uni.showToast({ title: '已添加' })
      closeAssetModal()
      return
    }

    const asset = assetStore.getAsset(editingAssetId.value)
    if (!asset) {
      uni.showToast({ title: '资产不存在', icon: 'none' })
      closeAssetModal()
      return
    }

    const oldBalance = Number(asset.currentBalance || 0)
    const delta = Number((balance - oldBalance).toFixed(2))

    assetStore.updateAsset(asset.id, { name, type: assetForm.type || 'digital', includeInTotal: assetForm.includeInTotal })

    if (delta !== 0) {
      await billStore.addBill({
        amount: delta,
        assetId: asset.id,
        type: 'adjustment',
        timestamp: Date.now(),
        remark: `资产调整：${oldBalance.toFixed(2)} → ${balance.toFixed(2)}`,
        currency: 'CNY',
        targetCurrency: 'CNY',
        parentCategoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
        categoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
        isIncludedInStats: false,
        fee: 0
      })
    }

    uni.showToast({ title: delta === 0 ? '已更新' : '已调整' })
    closeAssetModal()
  } catch (error) {
    console.error(error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const confirmDeleteAsset = (asset) => {
  activeAssetId.value = null
  uni.showModal({
    title: '删除资产',
    content: `确定删除「${asset.name}」吗？只会删除该资产，不会修正或删除其他记录。`,
    success: (res) => {
      if (!res.confirm) return
      try {
        assetStore.deleteAsset(asset.id)
        uni.showToast({ title: '已删除' })
      } catch (error) {
        console.error(error)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}

const onAssetTouchStart = (e) => {
  assetTouchStartX.value = e.touches[0].clientX
  assetTouchStartY.value = e.touches[0].clientY
  assetIsMoving.value = false
}

const resetAssetTouchState = () => {
  assetTouchStartX.value = 0
  assetTouchStartY.value = 0
  assetIsMoving.value = false
}

const onAssetTouchMove = (e) => {
  const deltaX = e.touches[0].clientX - assetTouchStartX.value
  const deltaY = e.touches[0].clientY - assetTouchStartY.value

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    assetIsMoving.value = true
    e.preventDefault?.()
  }
}

const onAssetTouchEnd = (e, assetId) => {
  if (!assetIsMoving.value) {
    resetAssetTouchState()
    return
  }

  const deltaX = e.changedTouches[0].clientX - assetTouchStartX.value

  if (deltaX < -50) {
    activeAssetId.value = assetId
  } else if (deltaX > 50) {
    activeAssetId.value = null
  }

  resetAssetTouchState()
}

const onAssetTouchCancel = () => {
  activeAssetId.value = null
  resetAssetTouchState()
}
</script>

<style lang="scss" scoped>
.container {

  height: 100%;

  min-height: 0;

  background-color: var(--color-bg);

  display: flex;

  flex-direction: column;

  overflow: hidden;

}

.fixed-header {

  padding: 20px;

  padding-bottom: 0;

  flex-shrink: 0;

  overflow: hidden;

}

.segment-wrap {
  display: flex;
  padding: 5px;
  margin-bottom: 15px;
  border-radius: 22px;
  background: #FFF9F0;
}

.segment-item {
  flex: 1;
  height: 38px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: bold;
  color: #8A8A8A;
  transition: all 0.25s ease;
}

.segment-item.active {
  background: #4A4A4A;
  color: #FFFFFF;
  box-shadow: 0 4px 10px rgba(74, 74, 74, 0.18);
}

.header {
  margin-top: 10px;
  margin-bottom: 24px;
  text-align: center;
  padding: 30px 0;
  border-radius: 20px;
  box-shadow: inset -6px -6px 16px #ffffff, inset 6px 6px 16px #a3b1c6;
}

.summary-card {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title {
  font-size: 14px;
  color: var(--color-text-light);
  display: block;
}

.amount {
  font-size: 40px;
  font-weight: bold;
  color: var(--color-text);
}

.summary-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-light);
}

.add-btn {
  width: 100%;
  height: 60px;
  font-size: 18px;
  margin-bottom: 10px;
  border: none;
}

.title-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.bill-scroll {

  flex: 1;

  min-height: 0;

  height: 0;

  overflow: hidden;

}

.bill-list,
.asset-list-home {
  padding: 0 16px 60px 16px;
}

.empty-tip {
  text-align: center;
  color: var(--color-text-light);
  margin-top: 50px;
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
  padding: 4px 4px 10px 4px;
}

.day-title {
  display: block;
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text);
}

.day-subtitle {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-light);
}

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

.bill-item.is-refunded {
  opacity: 0.72;
}

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
  background: rgba(255, 141, 93, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: var(--color-primary);
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: inset -3px -3px 8px rgba(255, 255, 255, 0.9), inset 3px 3px 8px rgba(163, 177, 198, 0.2);
}

.category-icon {
  font-size: 20px;
  line-height: 1;
}

.icon-box.expense-icon { background: rgba(255, 141, 93, 0.14); color: var(--color-primary); }
.icon-box.income-icon { background: rgba(136, 177, 148, 0.18); color: #5b9469; }
.icon-box.transfer-icon { background: rgba(75, 163, 255, 0.16); color: #4BA3FF; }
.icon-box.refund-icon { background: rgba(255, 149, 0, 0.16); color: #ff9500; }
.icon-box.adjustment-icon { background: rgba(138, 138, 138, 0.14); color: #666; }

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

.bill-date {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bill-remark {
  margin-top: 3px;
  font-size: 11px;
  line-height: 15px;
  color: rgba(74, 74, 74, 0.62);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  line-height: 1.25;
}

.balance-snapshot {
  font-size: 10px;
  color: var(--color-text-light);
  margin-top: 5px;
  text-align: right;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expense { color: var(--color-text); }
.income { color: #5b9469; }
.transfer { color: #4BA3FF; }
.adjustment { color: #666; }

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
  font-size: 28rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.edit-btn { background-color: #007aff; }
.refund-btn { background-color: #ff9500; }
.delete-btn { background-color: #ff3b30; }

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

.asset-item-wrapper {
  position: relative;
  margin-bottom: 16px;
  overflow: hidden;
}

.asset-item-container {
  position: relative;
  transition: transform 0.3s ease;
  touch-action: pan-y;
}

.asset-item-container.show-actions {
  transform: translateX(-180rpx);
}

.home-asset-item {
  padding: 18px;
  margin-bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 18px;
  position: relative;
  z-index: 1;
  background-color: var(--color-bg);
}

.asset-action-buttons {
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 180rpx;
  display: flex;
  align-items: stretch;
}

.asset-action-btn {
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

.asset-edit-btn { background-color: #007aff; }
.asset-delete-btn { background-color: #ff3b30; }

.asset-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.asset-icon {
  width: 42px;
  height: 42px;
  border-radius: 16px;
  background: #FFF9F0;
  box-shadow: inset -6px -6px 16px #ffffff, inset 6px 6px 16px #a3b1c6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.asset-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.asset-name {
  font-size: 17px;
  font-weight: bold;
  color: var(--color-text);
}

.asset-type {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
}

.exclude-total-badge {
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(136, 177, 148, 0.16);
  color: #88B194;
  font-size: 10px;
  line-height: 14px;
}

.asset-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 14px;
  font-weight: bold;
  color: var(--color-primary);
  max-width: 55%;
}

.balance-line {
  display: block;
  line-height: 1.5;
  text-align: right;
}

.manage-assets-btn {
  width: 100%;
  height: 52px;
  margin-top: 8px;
  border: none;
  font-size: 16px;
}
.asset-fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #FFF9F0;
  box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #FF8D5D;
  border: none;
  z-index: 100;
  padding: 0;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.modal {
  width: 80%;
  max-width: 400px;
  padding: 30px;
  background: #FFF9F0;
  border-radius: 20px;
  box-shadow: 10px 10px 30px rgba(0, 0, 0, 0.1), -10px -10px 30px rgba(255, 255, 255, 0.7);
  position: relative;
  z-index: 1001;
  pointer-events: auto;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.input-wrap {
  width: 100%;
  height: 52px;
  margin-bottom: 15px;
  position: relative;
  z-index: 1002;
  pointer-events: auto;
}

.neu-input {
  width: 100%;
  height: 52px;
  min-height: 52px;
  line-height: 52px;
  padding: 0 15px;
  border: none;
  border-radius: 10px;
  background: #FFF9F0;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
  font-size: 16px;
  box-sizing: border-box;
  color: #333;
  position: relative;
  z-index: 1003;
  pointer-events: auto;
}

.type-wrap {
  height: auto;
  min-height: 52px;
  box-sizing: border-box;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background: #FFF9F0;
  border-radius: 10px;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}

.type-label {
  font-size: 15px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-option {
  flex: 1;
  min-width: 72px;
  height: 34px;
  line-height: 34px;
  text-align: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--color-text-light);
  font-size: 13px;
  font-weight: bold;
}

.type-option.active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 4px 10px rgba(255, 141, 93, 0.24);
}

.switch-wrap {
  height: auto;
  min-height: 52px;
  box-sizing: border-box;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFF9F0;
  border-radius: 10px;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}

.switch-info {
  display: flex;
  flex-direction: column;
  margin-right: 12px;
}

.switch-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.switch-desc {
  margin-top: 4px;
  font-size: 11px;
  color: #999;
  line-height: 16px;
}

.edit-tip {
  display: block;
  color: #999;
  font-size: 12px;
  line-height: 1.5;
  margin: -5px 0 15px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
}

.modal-actions .modal-btn:first-child {
  margin-right: 15px;
}

.modal-btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  background: #FFF9F0;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.1), -3px -3px 10px rgba(255, 255, 255, 0.7);
  font-size: 16px;
}

.modal-btn:active {
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}

.cancel { color: #666; }
.confirm {
  color: #FF8D5D;
  font-weight: bold;
}
</style>

