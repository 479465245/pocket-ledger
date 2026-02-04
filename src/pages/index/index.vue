<template>
  <view class="container">
    <view class="fixed-header">
        <view class="header">
          <picker mode="date" fields="month" :value="currentMonthStr" @change="onMonthChange">
            <view class="title-wrapper">
              <text class="title">{{ currentMonthStr }} 支出 ▼</text>
            </view>
          </picker>
          <text class="amount">¥ {{ currentMonthExpense }}</text>
        </view>
        
        <view class="actions">
          <button class="neu-btn add-btn" @click="goAddBill">+ 记一笔</button>
        </view>
    </view>

    <scroll-view scroll-y class="bill-scroll">
        <view class="bill-list">
          <view v-if="displayedBills.length === 0" class="empty-tip">本月暂无账单</view>
          <view v-for="bill in displayedBills" :key="bill.id" class="bill-item-wrapper">
            <view class="bill-item-container" :class="{ 'show-actions': activeBillId === bill.id }" 
                  @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" 
                  :data-bill-id="bill.id">
              <view class="neu-card bill-item">
                <view class="bill-left">
                  <view class="icon-box">
                    <text class="category-icon">{{ bill.type === 'transfer' ? '⇄' : '¥' }}</text>
                  </view>
                  <view class="bill-info">
                    <text class="category-name">{{ bill.type === 'transfer' ? '转账' : getCategoryName(bill.categoryId || bill.parentCategoryId) }}</text>
                    <text class="bill-date" v-if="bill.type === 'transfer'">{{ formatDate(bill.timestamp) }} | {{ getAssetName(bill.assetId) }} → {{ getAssetName(bill.targetAssetId) }}</text>
                    <text class="bill-date" v-else>{{ formatDate(bill.timestamp) }} | {{ getAssetName(bill.assetId) }}</text>
                  </view>
                </view>
                <view class="bill-right">
                  <text :class="['bill-amount', bill.type === 'income' ? 'income' : 'expense']">
                    {{ bill.type === 'income' ? '+' : '' }}{{ bill.amount.toFixed(2) }}
                  </text>
                  <text class="balance-snapshot">余额: {{ bill.balanceSnapshot }}</text>
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
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

onShow(() => {
  categoryStore.init()
  assetStore.init()
  billStore.init()
})

const now = new Date()
const currentMonthStr = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

// 滑动相关状态
const activeBillId = ref(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isMoving = ref(false)

const onMonthChange = (e) => {
  currentMonthStr.value = e.detail.value
}

const currentMonthBills = computed(() => {
  const [year, month] = currentMonthStr.value.split('-').map(Number)
  const start = new Date(year, month - 1, 1).getTime()
  // Last day of the month
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime()
  
  return billStore.bills.filter(b => b.timestamp >= start && b.timestamp <= end)
})

const currentMonthExpense = computed(() => {
  return currentMonthBills.value
    .filter(b => b.type === 'expense')
    .reduce((acc, cur) => acc + Math.abs(cur.amount), 0)
    .toFixed(2)
})

const displayedBills = computed(() => {
  return [...currentMonthBills.value].sort((a, b) => b.timestamp - a.timestamp)
})

const goAddBill = () => {
  uni.navigateTo({ url: '/pages/bill/add' })
}

// 触摸事件处理
const onTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  isMoving.value = false
}

const onTouchMove = (e) => {
  const deltaX = e.touches[0].clientX - touchStartX.value
  const deltaY = e.touches[0].clientY - touchStartY.value
  
  // 判断是否为横向滑动
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    isMoving.value = true
  }
}

const onTouchEnd = (e) => {
  if (!isMoving.value) return
  
  const deltaX = e.changedTouches[0].clientX - touchStartX.value
  const billId = e.currentTarget.dataset.billId
  
  // 左滑显示操作按钮
  if (deltaX < -50) {
    activeBillId.value = billId
  } else if (deltaX > 50) {
    // 右滑隐藏操作按钮
    activeBillId.value = null
  }
  
  isMoving.value = false
}

// 编辑账单
const editBill = (id) => {
  // TODO: 实现编辑功能
  uni.showToast({
    title: '编辑功能开发中',
    icon: 'none'
  })
  activeBillId.value = null
}

// 退款账单
const refundBill = (id) => {
  // TODO: 实现退款功能
  uni.showToast({
    title: '退款功能开发中', 
    icon: 'none'
  })
  activeBillId.value = null
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
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fixed-header {
    padding: 20px;
    padding-bottom: 0;
    flex-shrink: 0;
}

.header {
  margin-top: 10px;
  margin-bottom: 30px;
  text-align: center;
  padding: 30px 0;
  border-radius: 20px;
  /* Neumorphism Inner Shadow for display area */
  box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
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
.add-btn {
  width: 100%;
  height: 60px;
  font-size: 18px;
  margin-bottom: 10px; /* Reduced margin */
  border: none;
  /* Neumorphism Button is defined in App.vue .neu-btn */
}

.title-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.bill-scroll {
    flex: 1;
    overflow-y: hidden; /* Scroll view handles scrolling */
}

.bill-list {
    padding: 0 20px 50px 20px;
}

.empty-tip {
    text-align: center;
    color: var(--color-text-light);
    margin-top: 50px;
}

.bill-item {
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* Neumorphism Card defined in App.vue .neu-card */
}

.bill-left {
    display: flex;
    align-items: center;
}

.icon-box {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #FFF9F0;
    box-shadow: 3px 3px 6px #d9d4cc, -3px -3px 6px #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    color: var(--color-primary);
    font-weight: bold;
}

.bill-info {
  display: flex;
  flex-direction: column;
}
.category-name {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-text);
}
.bill-date {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 4px;
}
.bill-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}
.bill-amount {
  font-size: 18px;
  font-weight: bold;
}
.balance-snapshot {
    font-size: 10px;
    color: var(--color-text-light);
    margin-top: 4px;
}
.expense { color: var(--color-text); }
.income { color: var(--color-primary); }

/* 滑动操作样式 */
.bill-item-wrapper {
  position: relative;
  margin-bottom: 20px;
  overflow: hidden;
}

.bill-item-container {
  position: relative;
  transition: transform 0.3s ease;
}

.bill-item-container.show-actions {
  transform: translateX(-240rpx);
}

.action-buttons {
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 240rpx;
  display: flex;
  align-items: center;
  height: 100%; /* Ensure full height */
}

.bill-item {
  margin-bottom: 0; /* Remove margin from item itself as wrapper handles it */
  position: relative;
  z-index: 1;
  background-color: var(--color-bg); /* Ensure background covers buttons */
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
}

.edit-btn {
  background-color: #007aff;
}

.refund-btn {
  background-color: #ff9500;
}

.delete-btn {
  background-color: #ff3b30;
}
</style>
