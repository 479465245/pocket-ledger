<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">备份还原</text>
      <text class="subtitle">导出或还原账单、资产、账单分类数据。还原会覆盖当前本地数据。</text>
    </view>

    <view class="card neu-card">
      <view class="icon-wrapper">
        <text class="icon">🧰</text>
      </view>
      <text class="card-title">本地数据备份</text>
      <text class="card-desc">备份文件包含所有账单、资产、账单分类，以及生成时间和版本信息。</text>

      <view class="summary-grid">
        <view class="summary-item">
          <text class="summary-label">账单</text>
          <text class="summary-value">{{ billStore.bills.length }} 条</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">资产</text>
          <text class="summary-value">{{ assetStore.assets.length }} 个</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">分类</text>
          <text class="summary-value">{{ categoryCount }} 个</text>
        </view>
      </view>

      <view v-if="progress.visible" class="progress-section">
        <view class="progress-header">
          <text class="progress-title">{{ progress.title }}</text>
          <text class="progress-percent">{{ progressPercent }}%</text>
        </view>
        <view class="progress-track">
          <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <text class="progress-text">{{ progress.message }}</text>
      </view>

      <button class="primary-btn" :disabled="isBusy" @click="exportBackup">
        {{ isBusy ? '处理中...' : '导出备份数据' }}
      </button>

      <button class="secondary-btn" :disabled="isBusy" @click="selectBackupFile">
        导入备份并还原
      </button>
    </view>

    <view class="tips">
      <text class="tip-title">说明</text>
      <text class="tip-item">1. 备份文件为 JSON，建议保存到云盘或电脑。</text>
      <text class="tip-item">2. 还原会覆盖当前账单、资产、分类数据，请先确认文件正确。</text>
      <text class="tip-item">3. 还原完成后会自动刷新本地数据。</text>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useAssetStore } from '@/store/asset'
import { useCategoryStore } from '@/store/category'
import { readFileAsArrayBuffer } from '@/utils/networkFile'
import { chooseLocalFile } from '@/utils/filePicker.js'
import { saveLocalFile } from '@/utils/fileSaver.js'
import { decodeUtf8 } from '@/utils/text.js'
import {
  applyBackupToStores,
  buildBackupData,
  getBackupCounts,
  getBackupFileName,
  validateBackup
} from '@/utils/backup.js'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '备份还原 - 记账本', path: '/pages/settings/index' })

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()

const isBusy = ref(false)
const progress = reactive({ visible: false, title: '', message: '', current: 0, total: 0 })

const progressPercent = computed(() => {
  if (!progress.visible) return 0
  if (!progress.total) return progress.current ? 100 : 0
  return Math.min(100, Math.round((progress.current / progress.total) * 100))
})

const categoryCount = computed(() => {
  return categoryStore.categories.reduce((sum, category) => sum + 1 + (category.children || []).length, 0)
})

onShow(() => {
  initStores()
})

const initStores = () => {
  billStore.init()
  assetStore.init()
  categoryStore.init()
}

const setProgress = ({ title = progress.title, message = '', current = 0, total = 0 }) => {
  progress.visible = true
  progress.title = title
  progress.message = message
  progress.current = current
  progress.total = total
}

const exportBackup = async () => {
  if (isBusy.value) return
  isBusy.value = true
  try {
    setProgress({ title: '备份导出进度', message: '正在整理账单、资产和分类...', current: 1, total: 4 })
    const backup = buildBackupData({
      bills: billStore.bills || [],
      assets: assetStore.assets || [],
      categories: categoryStore.categories || []
    })
    setProgress({ title: '备份导出进度', message: '正在生成备份文件...', current: 2, total: 4 })
    const content = JSON.stringify(backup, null, 2)
    const fileName = getBackupFileName()
    setProgress({ title: '备份导出进度', message: '正在保存备份文件...', current: 3, total: 4 })
    await saveBackupFile(fileName, content)
    setProgress({ title: '备份导出进度', message: `备份完成：${fileName}`, current: 4, total: 4 })
    uni.showToast({ title: '备份已导出', icon: 'success' })
  } catch (error) {
    console.error(error)
    setProgress({ title: '备份导出进度', message: error.message || '备份导出失败', current: 1, total: 1 })
    uni.showToast({ title: error.message || '备份导出失败', icon: 'none' })
  } finally {
    isBusy.value = false
  }
}

const selectBackupFile = async () => {
  if (isBusy.value) return

  try {
    const file = await chooseLocalFile({
      extensions: ['json'],
      mimeType: 'application/json'
    })
    await restoreFromFile(file)
  } catch (error) {
    if (error.message !== '已取消选择') {
      uni.showToast({ title: error.message || '文件选择失败', icon: 'none' })
    }
  }
}

const restoreFromFile = async (file) => {
  if (isBusy.value) return
  isBusy.value = true
  try {
    setProgress({ title: '备份还原进度', message: '正在读取备份文件...', current: 1, total: 5 })
    const buffer = await readFileAsArrayBuffer(file)
    const text = decodeBuffer(buffer)
    setProgress({ title: '备份还原进度', message: '正在校验备份内容...', current: 2, total: 5 })
    const backup = JSON.parse(text)
    validateBackup(backup)

    const counts = getBackupCounts(backup)

    uni.showModal({
      title: '确认还原备份',
      content: `将覆盖当前本地数据。\n账单 ${counts.bills} 条，资产 ${counts.assets} 个，分类 ${counts.categories} 个。`,
      confirmText: '确认还原',
      success: async (res) => {
        if (!res.confirm) {
          isBusy.value = false
          setProgress({ title: '备份还原进度', message: '已取消还原', current: 0, total: 0 })
          return
        }
        await applyBackup(backup)
      }
    })
  } catch (error) {
    console.error(error)
    setProgress({ title: '备份还原进度', message: error.message || '备份文件无效', current: 1, total: 1 })
    uni.showToast({ title: error.message || '备份文件无效', icon: 'none' })
    isBusy.value = false
  }
}

const applyBackup = async (backup) => {
  try {
    setProgress({ title: '备份还原进度', message: '正在还原分类...', current: 3, total: 5 })
    setProgress({ title: '备份还原进度', message: '正在还原资产和账单...', current: 4, total: 5 })
    await applyBackupToStores(backup, { billStore, assetStore, categoryStore })

    initStores()
    setProgress({ title: '备份还原进度', message: '还原完成，本地数据已刷新', current: 5, total: 5 })
    uni.showToast({ title: '还原完成', icon: 'success' })
  } catch (error) {
    console.error(error)
    setProgress({ title: '备份还原进度', message: error.message || '还原失败', current: 1, total: 1 })
    uni.showToast({ title: error.message || '还原失败', icon: 'none' })
  } finally {
    isBusy.value = false
  }
}

const decodeBuffer = (buffer) => decodeUtf8(buffer)

const saveBackupFile = (fileName, content) => {
  return saveLocalFile({
    fileName,
    content,
    mimeType: 'application/json;charset=utf-8',
    openType: 'json'
  })
}
</script>

<style scoped>
.container { height: 100vh; overflow-y: auto; padding: 20px; box-sizing: border-box; background: var(--color-bg, #FFF9F0); }
.header { margin-bottom: 18px; }
.title { display: block; margin-bottom: 8px; color: var(--color-text, #333); font-size: 24px; font-weight: 800; }
.subtitle, .card-desc, .tip-item { display: block; color: var(--color-text-light, #777); font-size: 13px; line-height: 20px; }
.card { padding: 22px 18px; border-radius: 20px; background: #FFF9F0; box-shadow: 5px 5px 15px rgba(0,0,0,.08), -5px -5px 15px rgba(255,255,255,.75); }
.icon-wrapper { width: 58px; height: 58px; margin: 0 auto 12px; border-radius: 20px; background: #fff3e7; display: flex; align-items: center; justify-content: center; }
.icon { font-size: 30px; }
.card-title { display: block; margin-bottom: 8px; color: #333; font-size: 20px; font-weight: 800; text-align: center; }
.card-desc { margin-bottom: 16px; text-align: center; }
.summary-grid { display: flex; gap: 10px; margin-bottom: 18px; }
.summary-item { flex: 1; padding: 12px 8px; border-radius: 14px; background: rgba(255,255,255,.68); text-align: center; }
.summary-label, .summary-value { display: block; }
.summary-label { margin-bottom: 5px; color: #777; font-size: 12px; }
.summary-value { color: #333; font-size: 16px; font-weight: 800; }
.primary-btn, .secondary-btn { width: 100%; min-height: 46px; border: 0; border-radius: 14px; font-size: 15px; font-weight: 800; }
.primary-btn { margin-top: 10px; background: var(--color-primary, #FF8D5D); color: #fff; }
.secondary-btn { margin-top: 12px; background: #fff3e7; color: var(--color-primary, #FF8D5D); }
.primary-btn[disabled], .secondary-btn[disabled] { opacity: .55; }
.progress-section { padding: 14px; margin-bottom: 14px; border-radius: 14px; background: rgba(255,255,255,.68); }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.progress-title { color: #333; font-size: 14px; font-weight: 800; }
.progress-percent { color: var(--color-primary, #FF8D5D); font-size: 13px; font-weight: 800; }
.progress-track { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,.08); }
.progress-bar { height: 100%; border-radius: 999px; background: var(--color-primary, #FF8D5D); transition: width .25s ease; }
.progress-text { display: block; margin-top: 8px; color: #777; font-size: 12px; }
.tips { margin-top: 16px; padding: 16px; margin-bottom: calc(20px + env(safe-area-inset-bottom)); border-radius: 16px; background: rgba(136,177,148,.14); }
.tip-title { display: block; margin-bottom: 8px; color: var(--color-secondary, #88B194); font-size: 14px; font-weight: 800; }
.tip-item { margin-bottom: 4px; }
</style>
