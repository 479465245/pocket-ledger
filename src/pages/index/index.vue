<template>
  <view class="container">
    <view class="fixed-header">
        <view class="header">
        <text class="title">本月支出</text>
        <text class="amount">¥ {{ currentMonthExpense }}</text>
        </view>
        
        <view class="actions">
        <button class="neu-btn add-btn" @click="goAddBill">+ 记一笔</button>
        </view>
    </view>

    <scroll-view scroll-y class="bill-scroll">
        <view class="bill-list">
        <view v-if="recentBills.length === 0" class="empty-tip">暂无账单</view>
        <view v-for="bill in recentBills" :key="bill.id" class="neu-card bill-item" @longpress="deleteBill(bill.id)">
            <view class="bill-left">
            <view class="icon-box">
                <text class="category-icon">{{ bill.type === 'transfer' ? '⇄' : '¥' }}</text>
            </view>
            <view class="bill-info">
                <text class="category-name">{{ bill.type === 'transfer' ? '转账' : getCategoryName(bill.subCategoryId) }}</text>
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

const currentMonthExpense = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime()
  
  return billStore.bills
    .filter(b => b.timestamp >= start && b.timestamp <= end && b.type === 'expense')
    .reduce((acc, cur) => acc + Math.abs(cur.amount), 0)
    .toFixed(2)
})

const recentBills = computed(() => {
  return [...billStore.bills].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
})

const goAddBill = () => {
  uni.navigateTo({ url: '/pages/bill/add' })
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
  margin-bottom: 10px;
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
  margin-bottom: 20px;
  border: none;
  /* Neumorphism Button is defined in App.vue .neu-btn */
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
</style>
