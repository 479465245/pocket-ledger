<template>
  <view class="container">
    <!-- 总资产卡片 -->
    <view class="total-assets-card neu-card">
      <text class="label">总资产</text>
      <text class="amount">¥ {{ totalAsset }}</text>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-list">
      <view class="menu-item neu-card" @click="navigateTo('import')">
        <text class="menu-text">导入数据</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('cross-check')">
        <text class="menu-text">交叉校验</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateToAssistant">
        <text class="menu-text">AI 助手</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('ai-config')">
        <text class="menu-text">AI 配置</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('network-file')">
        <text class="menu-text">网络文件配置</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('backup')">
        <text class="menu-text">备份还原</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('webdav')">
        <text class="menu-text">WebDAV 备份</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateTo('export')">
        <text class="menu-text">导出数据</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card" @click="navigateToCategories">
        <text class="menu-text">账单分类管理</text>
        <text class="arrow">›</text>
      </view>
      <view v-if="canInstall" class="menu-item neu-card install-item" @click="installApp">
        <view>
          <text class="menu-text">安装到设备</text>
          <text class="menu-hint">添加到主屏幕，离线使用更方便</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item neu-card version-item">
        <text class="menu-text">当前版本</text>
        <text class="version-text">v{{ appVersion }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { usePageShare } from '@/utils/share'
import manifest from '@/manifest.json'

usePageShare({ title: '记账本设置', path: '/pages/settings/index' })

const assetStore = useAssetStore()
const appVersion = manifest.versionName
const canInstall = ref(false)
let installPrompt = null

const updateInstallState = () => {
  canInstall.value = Boolean(installPrompt) && !window.matchMedia('(display-mode: standalone)').matches
}

const handleBeforeInstallPrompt = (event) => {
  event.preventDefault()
  installPrompt = event
  updateInstallState()
}

const handleAppInstalled = () => {
  installPrompt = null
  canInstall.value = false
}

const installApp = async () => {
  if (!installPrompt) return
  await installPrompt.prompt()
  const result = await installPrompt.userChoice
  if (result.outcome === 'accepted') {
    installPrompt = null
    canInstall.value = false
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
  updateInstallState()
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})

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

const navigateToAssistant = () => {
  uni.navigateTo({
    url: '/pages/assistant/index'
  })
}

const navigateToCategories = () => {
  uni.navigateTo({
    url: '/pages/categories/index'
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

.version-item {
  box-shadow: none;
}

.version-text {
  font-size: 16px;
  color: #999;
}
.install-item {
  background: linear-gradient(135deg, #fff3c4, #fff9f0);
}

.menu-hint {
  display: block;
  margin-top: 5px;
  font-size: 13px;
  color: #9a7b31;
}
</style>



