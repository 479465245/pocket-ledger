<template>
  <view class="container">
    <!-- 总资产卡片 -->
    <view class="total-assets-card neu-card">
      <text class="label">总资产</text>
      <text class="amount">¥ {{ totalAsset }}</text>
    </view>

    <!-- 资产列表 -->
    <scroll-view scroll-y class="asset-scroll">
      <view class="asset-list">
        <view v-for="asset in assets" :key="asset.id" class="neu-card asset-item">
          <view class="asset-info">
            <text class="asset-name">{{ asset.name }}</text>
            <text class="asset-type">{{ getTypeName(asset.type) }}</text>
          </view>
          <view class="asset-balance">
            <text>¥ {{ asset.currentBalance.toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 添加资产按钮 -->
    <view class="fab neu-btn" @click="showAddAsset = true">+</view>

    <!-- 添加资产弹窗 -->
    <view v-if="showAddAsset" class="modal-mask">
      <view class="modal neu-card">
        <view class="modal-title">添加资产</view>
        <input class="neu-input mb-20" v-model="newAsset.name" placeholder="资产名称 (如: 工资卡)" />
        <input class="neu-input mb-20" v-model="newAsset.balance" type="digit" placeholder="初始余额" />
        <view class="modal-actions">
          <button class="neu-btn cancel" @click="showAddAsset = false">取消</button>
          <button class="neu-btn confirm" @click="confirmAddAsset">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'

const assetStore = useAssetStore()

const showAddAsset = ref(false)
const newAsset = reactive({ name: '', balance: '' })

onShow(() => {
  assetStore.init()
})

const assets = computed(() => assetStore.assets)

const totalAsset = computed(() => {
  return assets.value.reduce((acc, cur) => acc + cur.currentBalance, 0).toFixed(2)
})

const getTypeName = (type) => {
  const map = {
    'cash': '现金',
    'digital': '电子钱包',
    'bank': '银行卡'
  }
  return map[type] || type
}

const confirmAddAsset = () => {
  if (!newAsset.name) return
  assetStore.addAsset(newAsset.name, 'digital', newAsset.balance || 0)
  showAddAsset.value = false
  newAsset.name = ''
  newAsset.balance = ''
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #FFF9F0;
  min-height: 100vh;
  position: relative;
}

.total-assets-card {
  padding: 30px;
  margin-bottom: 20px;
  text-align: center;
  background: #FFF9F0;
  border-radius: 20px;
  box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.7);
}

.label {
  display: block;
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
}

.amount {
  display: block;
  font-size: 36px;
  font-weight: bold;
  color: #333;
}

.asset-scroll {
  flex: 1;
  height: calc(100vh - 250px);
}

.asset-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #FFF9F0;
  border-radius: 15px;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.1), -3px -3px 10px rgba(255, 255, 255, 0.7);
}

.asset-info {
  display: flex;
  flex-direction: column;
}

.asset-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.asset-type {
  font-size: 14px;
  color: #666;
  margin-top: 5px;
}

.asset-balance {
  font-size: 20px;
  font-weight: bold;
  color: #FF8D5D;
}

.fab {
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
}

.modal {
  width: 80%;
  max-width: 400px;
  padding: 30px;
  background: #FFF9F0;
  border-radius: 20px;
  box-shadow: 10px 10px 30px rgba(0, 0, 0, 0.1), -10px -10px 30px rgba(255, 255, 255, 0.7);
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.neu-input {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 10px;
  background: #FFF9F0;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin-bottom: 15px;
  box-sizing: border-box;
}

.mb-20 {
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: space-between;
}

.neu-btn {
  flex: 1;
  padding: 15px;
  border: none;
  border-radius: 10px;
  background: #FFF9F0;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.1), -3px -3px 10px rgba(255, 255, 255, 0.7);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.neu-btn:active {
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}

.cancel {
  color: #666;
}

.confirm {
  color: #FF8D5D;
  font-weight: bold;
}
</style>