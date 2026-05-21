<template>
  <view class="container">
    <!-- 说明卡片 -->
    <view class="summary-card neu-card">
      <text class="label">网络文件配置</text>
      <text class="amount">{{ configs.length }} 个配置</text>
      <text class="summary-desc">导入、导出、交叉校验时可选择这里的远程文件地址</text>
    </view>

    <!-- 配置列表 -->
    <scroll-view scroll-y class="config-scroll">
      <view class="config-list">
        <view v-if="configs.length === 0" class="empty-tip">暂无网络文件配置</view>

        <view v-for="item in configs" :key="item.id" class="config-item-wrapper">
          <view
            class="config-item-container"
            :class="{ 'show-actions': activeConfigId === item.id }"
            :data-config-id="item.id"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
          >
            <view class="neu-card config-item">
              <view class="config-info">
                <text class="config-name">{{ item.name }}</text>
                <view class="badge-row">
                  <text v-if="item.downloadUrl" class="status-badge download">可下载</text>
                  <text v-if="item.uploadUrl" class="status-badge upload">可上传</text>
                </view>
                <text class="config-url">下载：{{ item.downloadUrl || '未配置' }}</text>
                <text class="config-url">上传：{{ item.uploadUrl || '未配置' }}</text>
              </view>
            </view>
            <view class="action-buttons">
              <button class="action-btn edit-btn" @click.stop="openEditConfig(item)">编辑</button>
              <button class="action-btn delete-btn" @click.stop="confirmDeleteConfig(item)">删除</button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 添加配置按钮 -->
    <view class="fab neu-btn" @click="openAddConfig">+</view>

    <!-- 添加/编辑弹窗 -->
    <view v-if="showConfigModal" class="modal-mask">
      <view class="modal neu-card" @click.stop>
        <view class="modal-title">{{ isEditMode ? '编辑网络文件' : '添加网络文件' }}</view>

        <view class="input-wrap" @click.stop="focusNameInput">
          <input
            class="neu-input"
            :value="configForm.name"
            :focus="nameInputFocus"
            placeholder="配置名称，例如：NAS 账单文件"
            confirm-type="next"
            @focus="nameInputFocus = true"
            @blur="nameInputFocus = false"
            @input="onNameInput"
          />
        </view>

        <view class="textarea-wrap" @click.stop="focusDownloadInput">
          <textarea
            class="neu-textarea"
            :value="configForm.downloadUrl"
            :focus="downloadInputFocus"
            placeholder="下载地址，用于导入/交叉校验 GET 下载"
            auto-height
            @focus="downloadInputFocus = true"
            @blur="downloadInputFocus = false"
            @input="onDownloadUrlInput"
          />
        </view>

        <view class="textarea-wrap" @click.stop="focusUploadInput">
          <textarea
            class="neu-textarea"
            :value="configForm.uploadUrl"
            :focus="uploadInputFocus"
            placeholder="上传地址，用于导出 POST 上传，字段名 file"
            auto-height
            @focus="uploadInputFocus = true"
            @blur="uploadInputFocus = false"
            @input="onUploadUrlInput"
          />
        </view>

        <text class="edit-tip">下载地址和上传地址至少填写一个。上传使用 multipart/form-data，文件字段名固定为 file。</text>

        <view class="modal-actions">
          <button class="neu-btn cancel" @click="closeConfigModal">取消</button>
          <button class="neu-btn confirm" @click="confirmSaveConfig">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getNetworkFileConfigs,
  upsertNetworkFileConfig,
  deleteNetworkFileConfig
} from '@/utils/networkFile'

const configs = ref([])
const showConfigModal = ref(false)
const isEditMode = ref(false)
const editingConfigId = ref('')
const configForm = reactive({ name: '', downloadUrl: '', uploadUrl: '' })

const nameInputFocus = ref(false)
const downloadInputFocus = ref(false)
const uploadInputFocus = ref(false)

const activeConfigId = ref(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isMoving = ref(false)

onShow(() => {
  loadConfigs()
})

const loadConfigs = () => {
  configs.value = getNetworkFileConfigs()
}

const resetInputFocus = () => {
  nameInputFocus.value = false
  downloadInputFocus.value = false
  uploadInputFocus.value = false
}

const resetForm = () => {
  editingConfigId.value = ''
  configForm.name = ''
  configForm.downloadUrl = ''
  configForm.uploadUrl = ''
}

const openAddConfig = () => {
  resetInputFocus()
  resetForm()
  isEditMode.value = false
  activeConfigId.value = null
  showConfigModal.value = true
}

const openEditConfig = (item) => {
  resetInputFocus()
  isEditMode.value = true
  editingConfigId.value = item.id
  activeConfigId.value = null
  showConfigModal.value = true

  setTimeout(() => {
    configForm.name = item.name || ''
    configForm.downloadUrl = item.downloadUrl || ''
    configForm.uploadUrl = item.uploadUrl || ''
  }, 0)
}

const closeConfigModal = () => {
  resetInputFocus()
  showConfigModal.value = false
  isEditMode.value = false
  resetForm()
}

const focusNameInput = async () => {
  downloadInputFocus.value = false
  uploadInputFocus.value = false
  await nextTick()
  nameInputFocus.value = true
}

const focusDownloadInput = async () => {
  nameInputFocus.value = false
  uploadInputFocus.value = false
  await nextTick()
  downloadInputFocus.value = true
}

const focusUploadInput = async () => {
  nameInputFocus.value = false
  downloadInputFocus.value = false
  await nextTick()
  uploadInputFocus.value = true
}

const onNameInput = (e) => {
  configForm.name = e.detail.value
}

const onDownloadUrlInput = (e) => {
  configForm.downloadUrl = e.detail.value
}

const onUploadUrlInput = (e) => {
  configForm.uploadUrl = e.detail.value
}

const confirmSaveConfig = () => {
  const payload = {
    id: editingConfigId.value,
    name: configForm.name.trim(),
    downloadUrl: configForm.downloadUrl.trim(),
    uploadUrl: configForm.uploadUrl.trim()
  }

  if (!payload.name) {
    uni.showToast({ title: '请输入配置名称', icon: 'none' })
    return
  }

  if (!payload.downloadUrl && !payload.uploadUrl) {
    uni.showToast({ title: '下载地址和上传地址至少填一个', icon: 'none' })
    return
  }

  try {
    upsertNetworkFileConfig(payload)
    loadConfigs()
    uni.showToast({ title: isEditMode.value ? '已更新' : '已添加' })
    closeConfigModal()
  } catch (error) {
    console.error(error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const confirmDeleteConfig = (item) => {
  activeConfigId.value = null
  uni.showModal({
    title: '删除配置',
    content: `确定删除「${item.name}」吗？`,
    success: (res) => {
      if (!res.confirm) return
      try {
        deleteNetworkFileConfig(item.id)
        loadConfigs()
        uni.showToast({ title: '已删除' })
      } catch (error) {
        console.error(error)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
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
  }
}

const onTouchEnd = (e) => {
  if (!isMoving.value) return

  const deltaX = e.changedTouches[0].clientX - touchStartX.value
  const configId = e.currentTarget.dataset.configId

  if (deltaX < -50) {
    activeConfigId.value = configId
  } else if (deltaX > 50) {
    activeConfigId.value = null
  }

  isMoving.value = false
}
</script>

<style scoped>
.container {
  padding: 20px;
  background: var(--app-bg);
  min-height: 100vh;
  position: relative;
}

.summary-card {
  padding: 26px;
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
  font-size: 32px;
  font-weight: bold;
  color: var(--color-text);
}

.summary-desc {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-light);
}

.config-scroll {
  flex: 1;
  height: calc(100vh - 230px);
}

.config-list {
  display: flex;
  flex-direction: column;
  padding-bottom: 110px;
}

.empty-tip {
  text-align: center;
  color: #999;
  margin-top: 50px;
}

.config-item-wrapper {
  position: relative;
  margin-bottom: 15px;
  overflow: hidden;
}

.config-item-container {
  position: relative;
  transition: transform 0.3s ease;
}

.config-item-container.show-actions {
  transform: translateX(-180rpx);
}

.config-item {
  padding: 18px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  position: relative;
  z-index: 1;
}

.config-info {
  display: flex;
  flex-direction: column;
}

.config-name {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-text);
}

.badge-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 16px;
}

.status-badge.download {
  background: rgba(255, 141, 93, 0.16);
  color: var(--color-primary);
}

.status-badge.upload {
  background: rgba(136, 177, 148, 0.16);
  color: #88B194;
}

.config-url {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: var(--color-text-light);
  word-break: break-all;
}

.action-buttons {
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 180rpx;
  display: flex;
  align-items: stretch;
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

.edit-btn {
  background-color: #007aff;
}

.delete-btn {
  background-color: #ff3b30;
}

.fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-primary);
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
  pointer-events: auto;
}

.modal {
  width: 80%;
  max-width: 400px;
  padding: 30px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  position: relative;
  z-index: 1001;
  pointer-events: auto;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: var(--color-text);
}

.input-wrap,
.textarea-wrap {
  width: 100%;
  margin-bottom: 15px;
  position: relative;
  z-index: 1002;
  pointer-events: auto;
}

.input-wrap {
  height: 52px;
}

.neu-input,
.neu-textarea {
  width: 100%;
  padding: 0 15px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: var(--glass-bg);
  box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
  font-size: 16px;
  box-sizing: border-box;
  color: var(--color-text);
  position: relative;
  z-index: 1003;
  pointer-events: auto;
}

.neu-input {
  height: 52px;
  min-height: 52px;
  line-height: 52px;
}

.neu-textarea {
  min-height: 78px;
  line-height: 22px;
  padding-top: 13px;
  padding-bottom: 13px;
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

.modal-actions .neu-btn:first-child {
  margin-right: 15px;
}

.neu-btn {
  flex: 1;
  padding: 15px;
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-shadow-soft);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.neu-btn:active {
  box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
}

.cancel {
  color: #666;
}

.confirm {
  color: var(--color-primary);
  font-weight: bold;
}
</style>
