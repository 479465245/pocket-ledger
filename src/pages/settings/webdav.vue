<template>
  <view class="page">
    <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">WebDAV 备份</text>
      <text class="subtitle">挂载远程目录，上传本地备份文件，或下载备份文件覆盖还原当前数据。</text>
    </view>

    <view class="card neu-card">
      <view class="card-head">
        <view>
          <text class="card-title">远程目录</text>
          <text class="card-desc">{{ activeConfig ? activeConfig.name : '请先添加 WebDAV 配置' }}</text>
        </view>
        <button class="small-btn" @click="openConfigModal">配置</button>
      </view>

      <view v-if="activeConfig" class="mount-info">
        <text class="mount-line">地址：{{ activeConfig.url }}</text>
        <text class="mount-line">目录：{{ activeConfig.directory || '/' }}</text>
      </view>

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

      <button class="primary-btn" :disabled="isBusy || !activeConfig" @click="uploadBackup">
        {{ isBusy ? '处理中...' : '上传当前备份到 WebDAV' }}
      </button>
      <button class="secondary-btn" :disabled="isBusy || !activeConfig" @click="refreshFiles">
        刷新远程备份列表
      </button>
    </view>

    <view class="file-card neu-card">
      <view class="file-head">
        <text class="card-title">远程备份文件</text>
        <text class="file-count">{{ files.length }} 个</text>
      </view>
      <view v-if="!activeConfig" class="empty-tip">添加 WebDAV 配置后可查看远程目录。</view>
      <view v-else-if="files.length === 0" class="empty-tip">暂无 JSON 备份文件。</view>
      <view v-for="file in files" :key="file.name" class="file-item">
        <view class="file-info">
          <text class="file-name">{{ file.name }}</text>
          <text class="file-meta">{{ formatFileSize(file.size) }}{{ file.modifiedAt ? ' · ' + file.modifiedAt : '' }}</text>
        </view>
        <button class="restore-btn" :disabled="isBusy" @click="restoreRemoteFile(file)">还原</button>
      </view>
    </view>

    <view class="tips">
      <text class="tip-title">说明</text>
      <text class="tip-item">1. WebDAV 配置会保存在本机，密码以本地明文形式存储。</text>
      <text class="tip-item">2. 上传使用 PUT 写入当前远程目录，文件名为记账备份时间戳。</text>
      <text class="tip-item">3. 还原会覆盖本地账单、资产和分类，请确认远程文件来源可靠。</text>
      <text class="tip-item">4. H5 访问 WebDAV 时，服务端需要允许跨域请求。</text>
    </view>

    </scroll-view>

    <view v-if="showConfigModal" class="modal-mask">
      <view class="modal neu-card" @click.stop>
        <view class="modal-title">WebDAV 配置</view>

        <picker v-if="configs.length" :range="configNames" :value="activeConfigIndex" @change="selectConfig">
          <view class="picker-row">
            <text>{{ activeConfig ? activeConfig.name : '选择已有配置' }}</text>
            <text class="arrow">›</text>
          </view>
        </picker>

        <view class="input-wrap" @click.stop="focusNameInput">
          <input
            class="neu-input"
            :value="configForm.name"
            :focus="nameInputFocus"
            placeholder="配置名称，例如：坚果云备份"
            confirm-type="next"
            @focus="nameInputFocus = true"
            @blur="nameInputFocus = false"
            @input="onNameInput"
          />
        </view>
        <view class="input-wrap" @click.stop="focusUrlInput">
          <input
            class="neu-input"
            :value="configForm.url"
            :focus="urlInputFocus"
            placeholder="WebDAV 根地址，例如：https://dav.example.com/dav"
            confirm-type="next"
            @focus="urlInputFocus = true"
            @blur="urlInputFocus = false"
            @input="onUrlInput"
          />
        </view>
        <view class="input-wrap" @click.stop="focusDirectoryInput">
          <input
            class="neu-input"
            :value="configForm.directory"
            :focus="directoryInputFocus"
            placeholder="远程目录，例如：account-book/backups"
            confirm-type="next"
            @focus="directoryInputFocus = true"
            @blur="directoryInputFocus = false"
            @input="onDirectoryInput"
          />
        </view>
        <view class="input-wrap" @click.stop="focusUsernameInput">
          <input
            class="neu-input"
            :value="configForm.username"
            :focus="usernameInputFocus"
            placeholder="用户名"
            confirm-type="next"
            @focus="usernameInputFocus = true"
            @blur="usernameInputFocus = false"
            @input="onUsernameInput"
          />
        </view>
        <view class="input-wrap" @click.stop="focusPasswordInput">
          <input
            class="neu-input"
            :value="configForm.password"
            :focus="passwordInputFocus"
            password
            placeholder="密码或应用授权码"
            confirm-type="done"
            @focus="passwordInputFocus = true"
            @blur="passwordInputFocus = false"
            @input="onPasswordInput"
          />
        </view>

        <text class="edit-tip">远程目录需已存在；如果服务商使用应用授权码，请填授权码作为密码。</text>

        <view class="modal-actions">
          <button class="neu-btn danger" :disabled="!editingConfigId" @click.stop="confirmDeleteConfig" @touchend.stop.prevent="confirmDeleteConfig">删除</button>
          <button class="neu-btn cancel" @click.stop="closeConfigModal" @touchend.stop.prevent="closeConfigModal">取消</button>
          <button class="neu-btn confirm" @click.stop="saveConfig" @touchend.stop.prevent="saveConfig">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useAssetStore } from '@/store/asset'
import { useCategoryStore } from '@/store/category'
import { decodeUtf8 } from '@/utils/text.js'
import {
  applyBackupToStores,
  buildBackupData,
  getBackupCounts,
  getBackupFileName,
  validateBackup
} from '@/utils/backup.js'
import {
  deleteWebDavConfig,
  downloadWebDavBackup,
  getWebDavConfigs,
  listWebDavBackupFiles,
  uploadWebDavBackup,
  upsertWebDavConfig,
  validateWebDavConfig
} from '@/utils/webdav.js'
import { usePageShare } from '@/utils/share'

usePageShare({ title: 'WebDAV 备份 - 记账本', path: '/pages/settings/index' })

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()

const configs = ref([])
const activeConfigId = ref('')
const files = ref([])
const isBusy = ref(false)
const showConfigModal = ref(false)
const editingConfigId = ref('')
const configForm = reactive({ name: '', url: '', directory: '', username: '', password: '' })
const progress = reactive({ visible: false, title: '', message: '', current: 0, total: 0 })
let lastSaveConfigTime = 0

const nameInputFocus = ref(false)
const urlInputFocus = ref(false)
const directoryInputFocus = ref(false)
const usernameInputFocus = ref(false)
const passwordInputFocus = ref(false)

const activeConfig = computed(() => configs.value.find(item => item.id === activeConfigId.value) || configs.value[0] || null)
const configNames = computed(() => configs.value.map(item => item.name || '未命名配置'))
const activeConfigIndex = computed(() => Math.max(0, configs.value.findIndex(item => item.id === activeConfig.value?.id)))
const categoryCount = computed(() => categoryStore.categories.reduce((sum, category) => sum + 1 + (category.children || []).length, 0))
const progressPercent = computed(() => {
  if (!progress.visible) return 0
  if (!progress.total) return progress.current ? 100 : 0
  return Math.min(100, Math.round((progress.current / progress.total) * 100))
})

onShow(() => {
  initStores()
  loadConfigs()
})

const initStores = () => {
  billStore.init()
  assetStore.init()
  categoryStore.init()
}

const loadConfigs = () => {
  configs.value = getWebDavConfigs()
  if (!activeConfigId.value && configs.value.length) activeConfigId.value = configs.value[0].id
  if (activeConfigId.value && !configs.value.some(item => item.id === activeConfigId.value)) {
    activeConfigId.value = configs.value[0]?.id || ''
  }
}

const setProgress = ({ title = progress.title, message = '', current = 0, total = 0 }) => {
  progress.visible = true
  progress.title = title
  progress.message = message
  progress.current = current
  progress.total = total
}

const resetForm = () => {
  editingConfigId.value = ''
  configForm.name = ''
  configForm.url = ''
  configForm.directory = ''
  configForm.username = ''
  configForm.password = ''
}

const resetInputFocus = () => {
  nameInputFocus.value = false
  urlInputFocus.value = false
  directoryInputFocus.value = false
  usernameInputFocus.value = false
  passwordInputFocus.value = false
}

const fillForm = (config) => {
  editingConfigId.value = config?.id || ''
  configForm.name = config?.name || ''
  configForm.url = config?.url || ''
  configForm.directory = config?.directory || ''
  configForm.username = config?.username || ''
  configForm.password = config?.password || ''
}

const openConfigModal = () => {
  resetInputFocus()
  fillForm(activeConfig.value)
  showConfigModal.value = true
}

const closeConfigModal = () => {
  resetInputFocus()
  showConfigModal.value = false
  resetForm()
}

const focusNameInput = async () => {
  resetInputFocus()
  await nextTick()
  nameInputFocus.value = true
}

const focusUrlInput = async () => {
  resetInputFocus()
  await nextTick()
  urlInputFocus.value = true
}

const focusDirectoryInput = async () => {
  resetInputFocus()
  await nextTick()
  directoryInputFocus.value = true
}

const focusUsernameInput = async () => {
  resetInputFocus()
  await nextTick()
  usernameInputFocus.value = true
}

const focusPasswordInput = async () => {
  resetInputFocus()
  await nextTick()
  passwordInputFocus.value = true
}

const onNameInput = (e) => {
  configForm.name = e.detail.value
}

const onUrlInput = (e) => {
  configForm.url = e.detail.value
}

const onDirectoryInput = (e) => {
  configForm.directory = e.detail.value
}

const onUsernameInput = (e) => {
  configForm.username = e.detail.value
}

const onPasswordInput = (e) => {
  configForm.password = e.detail.value
}

const selectConfig = (e) => {
  const config = configs.value[Number(e.detail.value)]
  if (!config) return
  activeConfigId.value = config.id
  fillForm(config)
  files.value = []
}

const saveConfig = () => {
  const now = Date.now()
  if (now - lastSaveConfigTime < 500) return
  lastSaveConfigTime = now

  const payload = {
    id: editingConfigId.value,
    name: configForm.name.trim(),
    url: configForm.url.trim(),
    directory: configForm.directory.trim(),
    username: configForm.username.trim(),
    password: configForm.password
  }
  const message = validateWebDavConfig(payload)
  if (message) {
    uni.showToast({ title: message, icon: 'none' })
    return
  }

  try {
    const saved = upsertWebDavConfig(payload)
    loadConfigs()
    activeConfigId.value = saved.id
    closeConfigModal()
    files.value = []
    uni.showToast({ title: '已保存' })
  } catch (error) {
    console.error(error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const confirmDeleteConfig = () => {
  if (!editingConfigId.value) return
  uni.showModal({
    title: '删除配置',
    content: `确定删除「${configForm.name}」吗？`,
    success: (res) => {
      if (!res.confirm) return
      deleteWebDavConfig(editingConfigId.value)
      loadConfigs()
      closeConfigModal()
      files.value = []
      uni.showToast({ title: '已删除' })
    }
  })
}

const uploadBackup = async () => {
  if (isBusy.value || !activeConfig.value) return
  isBusy.value = true
  try {
    setProgress({ title: 'WebDAV 上传进度', message: '正在整理本地备份...', current: 1, total: 3 })
    const backup = buildBackupData({
      bills: billStore.bills || [],
      assets: assetStore.assets || [],
      categories: categoryStore.categories || []
    })
    const fileName = getBackupFileName()
    const content = JSON.stringify(backup, null, 2)
    setProgress({ title: 'WebDAV 上传进度', message: `正在上传 ${fileName}...`, current: 2, total: 3 })
    await uploadWebDavBackup(activeConfig.value, fileName, content)
    setProgress({ title: 'WebDAV 上传进度', message: `上传完成：${fileName}`, current: 3, total: 3 })
    uni.showToast({ title: '上传完成', icon: 'success' })
    isBusy.value = false
    await refreshFiles(false)
  } catch (error) {
    console.error(error)
    setProgress({ title: 'WebDAV 上传进度', message: error.message || '上传失败', current: 1, total: 1 })
    uni.showToast({ title: error.message || '上传失败', icon: 'none' })
  } finally {
    isBusy.value = false
  }
}

const refreshFiles = async (showToast = true) => {
  if (isBusy.value || !activeConfig.value) return
  isBusy.value = true
  try {
    setProgress({ title: 'WebDAV 列表刷新', message: '正在读取远程目录...', current: 1, total: 2 })
    files.value = await listWebDavBackupFiles(activeConfig.value)
    setProgress({ title: 'WebDAV 列表刷新', message: `发现 ${files.value.length} 个备份文件`, current: 2, total: 2 })
    if (showToast) uni.showToast({ title: '已刷新', icon: 'success' })
  } catch (error) {
    console.error(error)
    setProgress({ title: 'WebDAV 列表刷新', message: error.message || '读取失败', current: 1, total: 1 })
    uni.showToast({ title: error.message || '读取失败', icon: 'none' })
  } finally {
    isBusy.value = false
  }
}

const restoreRemoteFile = async (file) => {
  if (isBusy.value || !activeConfig.value) return
  isBusy.value = true
  try {
    setProgress({ title: 'WebDAV 还原进度', message: `正在下载 ${file.name}...`, current: 1, total: 5 })
    const buffer = await downloadWebDavBackup(activeConfig.value, file.name)
    setProgress({ title: 'WebDAV 还原进度', message: '正在校验备份内容...', current: 2, total: 5 })
    const backup = JSON.parse(decodeUtf8(buffer))
    validateBackup(backup)
    const counts = getBackupCounts(backup)

    uni.showModal({
      title: '确认还原 WebDAV 备份',
      content: `将覆盖当前本地数据。\n账单 ${counts.bills} 条，资产 ${counts.assets} 个，分类 ${counts.categories} 个。`,
      confirmText: '确认还原',
      success: async (res) => {
        if (!res.confirm) {
          isBusy.value = false
          setProgress({ title: 'WebDAV 还原进度', message: '已取消还原', current: 0, total: 0 })
          return
        }
        await applyRemoteBackup(backup)
      }
    })
  } catch (error) {
    console.error(error)
    setProgress({ title: 'WebDAV 还原进度', message: error.message || '还原失败', current: 1, total: 1 })
    uni.showToast({ title: error.message || '还原失败', icon: 'none' })
    isBusy.value = false
  }
}

const applyRemoteBackup = async (backup) => {
  try {
    setProgress({ title: 'WebDAV 还原进度', message: '正在覆盖本地分类、资产和账单...', current: 4, total: 5 })
    await applyBackupToStores(backup, { billStore, assetStore, categoryStore })
    initStores()
    setProgress({ title: 'WebDAV 还原进度', message: '还原完成，本地数据已刷新', current: 5, total: 5 })
    uni.showToast({ title: '还原完成', icon: 'success' })
  } catch (error) {
    console.error(error)
    setProgress({ title: 'WebDAV 还原进度', message: error.message || '还原失败', current: 1, total: 1 })
    uni.showToast({ title: error.message || '还原失败', icon: 'none' })
  } finally {
    isBusy.value = false
  }
}

const formatFileSize = (size = 0) => {
  const value = Number(size || 0)
  if (!value) return '未知大小'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped>
.page { min-height: 100vh; background: var(--app-bg); }
.container { height: 100vh; overflow-y: auto; padding: 20px; box-sizing: border-box; }
.header { margin-bottom: 18px; }
.title { display: block; margin-bottom: 8px; color: var(--color-text); font-size: 24px; font-weight: 800; }
.subtitle, .card-desc, .tip-item, .mount-line, .file-meta, .edit-tip { display: block; color: var(--color-text-light); font-size: 13px; line-height: 20px; }
.card, .file-card { padding: 20px 18px; border-radius: 24px; background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow-soft); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.file-card { margin-top: 16px; }
.card-head, .file-head, .progress-header, .file-item, .picker-row, .modal-actions { display: flex; align-items: center; justify-content: space-between; }
.card-title { display: block; color: var(--color-text); font-size: 18px; font-weight: 800; }
.small-btn { min-width: 72px; height: 36px; padding: 0 14px; border: 0; border-radius: 999px; background: rgba(255, 141, 93, .16); color: var(--color-primary); font-size: 13px; font-weight: 800; }
.mount-info { margin-top: 14px; padding: 12px; border-radius: 14px; background: rgba(255,255,255,.58); }
.mount-line { word-break: break-all; }
.summary-grid { display: flex; gap: 10px; margin: 16px 0; }
.summary-item { flex: 1; padding: 12px 8px; border-radius: 14px; background: rgba(255,255,255,.68); text-align: center; }
.summary-label, .summary-value { display: block; }
.summary-label { margin-bottom: 5px; color: var(--color-text-light); font-size: 12px; }
.summary-value { color: var(--color-text); font-size: 16px; font-weight: 800; }
.primary-btn, .secondary-btn { width: 100%; min-height: 46px; border: 0; border-radius: 14px; font-size: 15px; font-weight: 800; }
.primary-btn { margin-top: 10px; background: var(--color-primary); color: #fff; }
.secondary-btn { margin-top: 12px; background: rgba(255, 141, 93, .14); color: var(--color-primary); }
.primary-btn[disabled], .secondary-btn[disabled], .restore-btn[disabled], .danger[disabled] { opacity: .55; }
.progress-section { padding: 14px; margin-bottom: 14px; border-radius: 14px; background: rgba(255,255,255,.68); }
.progress-title { color: var(--color-text); font-size: 14px; font-weight: 800; }
.progress-percent { color: var(--color-primary); font-size: 13px; font-weight: 800; }
.progress-track { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,.08); }
.progress-bar { height: 100%; border-radius: 999px; background: var(--color-primary); transition: width .25s ease; }
.progress-text { display: block; margin-top: 8px; color: var(--color-text-light); font-size: 12px; }
.file-count { color: var(--color-text-light); font-size: 13px; }
.empty-tip { padding: 28px 0; color: var(--color-text-light); font-size: 14px; text-align: center; }
.file-item { gap: 10px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.55); }
.file-item:last-child { border-bottom: 0; }
.file-info { flex: 1; min-width: 0; }
.file-name { display: block; margin-bottom: 4px; color: var(--color-text); font-size: 15px; font-weight: 800; word-break: break-all; }
.restore-btn { min-width: 70px; height: 36px; padding: 0 12px; border: 0; border-radius: 12px; background: rgba(61, 155, 114, .16); color: var(--color-secondary); font-size: 13px; font-weight: 800; }
.tips { margin-top: 16px; padding: 16px; margin-bottom: calc(20px + env(safe-area-inset-bottom)); border-radius: 16px; background: rgba(136,177,148,.14); }
.tip-title { display: block; margin-bottom: 8px; color: var(--color-secondary); font-size: 14px; font-weight: 800; }
.tip-item { margin-bottom: 4px; }
.modal-mask { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; background: rgba(0,0,0,.45); }
.modal { width: 100%; max-width: 440px; max-height: 88vh; overflow-y: auto; padding: 22px; border-radius: 24px; background: var(--glass-bg-strong); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); }
.modal-title { margin-bottom: 14px; color: var(--color-text); font-size: 18px; font-weight: 800; text-align: center; }
.picker-row { min-height: 44px; margin-bottom: 10px; padding: 0 14px; border-radius: 14px; background: rgba(255,255,255,.68); color: var(--color-text); font-size: 14px; }
.arrow { color: var(--color-text-light); font-size: 22px; }
.input-wrap { margin-bottom: 10px; }
.neu-input { width: 100%; box-sizing: border-box; min-height: 44px; padding: 0 14px; border-radius: 14px; background: rgba(255,255,255,.76); color: var(--color-text); font-size: 14px; }
.edit-tip { margin: 4px 0 14px; }
.modal-actions { gap: 8px; }
.modal-actions .neu-btn { flex: 1; min-height: 42px; border: 0; border-radius: 14px; font-size: 14px; font-weight: 800; touch-action: manipulation; }
.danger { background: rgba(255,59,48,.14); color: #ff3b30; }
.cancel { background: rgba(255,255,255,.72); color: var(--color-text-light); }
.confirm { background: var(--color-primary); color: #fff; }
</style>
