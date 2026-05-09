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
  background: var(--app-bg);
  min-height: 100vh;
}

.total-assets-card {
  padding: 30px;
  margin-bottom: 20px;
  text-align: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 26px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.label {
  display: block;
  font-size: 16px;
  color: var(--color-text-light);
  margin-bottom: 10px;
}

.amount {
  display: block;
  font-size: 36px;
  font-weight: bold;
  color: var(--color-text);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.menu-text {
  font-size: 18px;
  color: var(--color-text);
}

.arrow {
  font-size: 24px;
  color: #999;
}
</style>
