<template>
  <view class="container">
    <!-- 总资产卡片 -->
    <view class="total-assets-card neu-card">
      <text class="label">总资产</text>
      <text class="amount">¥ {{ totalAsset }}</text>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-list">
      <view class="menu-item neu-card" @click="navigateTo('assets')">
        <text class="menu-text">资产</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('import')">
        <text class="menu-text">导入数据</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('cross-check')">
        <text class="menu-text">交叉校验</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('export')">
        <text class="menu-text">导出数据</text>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'

const assetStore = useAssetStore()

onShow(() => {
  assetStore.init()
})

// 计算总资产
const totalAsset = computed(() => {

  return assetStore.assets

    .filter(asset => asset.includeInTotal !== false)

    .reduce((sum, asset) => sum + (asset.currentBalance || 0), 0)

    .toFixed(2)

})

// 导航函数
const navigateTo = (page) => {
  uni.navigateTo({
    url: `/pages/settings/${page}`
  })
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #FFF9F0;
  min-height: 100vh;
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

.menu-list {

  display: flex;

  flex-direction: column;

}

.menu-item {

  margin-bottom: 15px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #FFF9F0;
  border-radius: 15px;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.1), -3px -3px 10px rgba(255, 255, 255, 0.7);
}

.menu-text {
  font-size: 18px;
  color: #333;
}

.arrow {
  font-size: 24px;
  color: #999;
}
</style>

