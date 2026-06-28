<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">交叉校验</text>
      <text class="subtitle">导入某个资产指定时间段的外部流水，只用于比对，不会直接入账。</text>
    </view>

    <view class="card">
      <view class="section">
        <text class="label">校验资产</text>
        <picker :range="assetLabels" @change="onAssetChange">
          <view class="picker-box">{{ selectedAssetName || '请选择资产' }}</view>
        </picker>
      </view>

      <view class="section two-cols">
        <view class="date-item">
          <text class="label">开始日期</text>
          <picker mode="date" :value="startDate" @change="startDate = $event.detail.value">
            <view class="picker-box">{{ startDate }}</view>
          </picker>
        </view>
        <view class="date-item">
          <text class="label">结束日期</text>
          <picker mode="date" :value="endDate" @change="endDate = $event.detail.value">
            <view class="picker-box">{{ endDate }}</view>
          </picker>
        </view>
      </view>

      <view class="section">
        <text class="label">外部流水来源</text>
        <view class="source-tabs">
          <button
            v-for="option in providerOptions"
            :key="option.value"
            :class="['source-tab', selectedProvider === option.value ? 'active' : '']"
            @click="selectedProvider = option.value"
          >
            {{ option.label }}
          </button>
        </view>
      </view>

      <view class="section">
        <button class="primary-btn" @click="selectFile">{{ selectedFileName || '选择校验文件' }}</button>
        <button class="primary-btn secondary-file-btn" @click="selectNetworkFile">选择网络文件</button>
        <text class="hint">文件仅用于本次交叉校验，不会直接写入账本。PDF 会通过已配置的 AI 服务识别流水。</text>
      </view>

      <view v-if="progressState.visible" class="section progress-section">
        <view class="progress-header">
          <text class="progress-title">{{ progressState.title }}</text>
          <text class="progress-percent">{{ progressPercent }}%</text>
        </view>
        <view class="progress-track">
          <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
        </view>
        <text class="progress-text">{{ progressState.message }}</text>
      </view>

      <view v-if="parseMessages.length" class="section">
        <view v-for="(message, index) in parseMessages" :key="index" :class="['message', message.type]">
          {{ message.message }}
        </view>
      </view>

      <view v-if="externalRows.length" class="section summary">
        <text class="summary-title">已解析 {{ externalRows.length }} 条参照流水</text>
        <text class="hint">确认后会进入“交叉校验操作主页”。</text>
      </view>

      <button class="start-btn" :disabled="!canStart" @click="startCheck">开始校验</button>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as XLSX from 'xlsx'
import { useAssetStore } from '@/store/asset'
import { PROVIDER_OPTIONS, parseImportRows } from '@/utils/importParsers'
import { createCrossCheckSession } from '@/utils/crossCheck'
import { decodeText } from '@/utils/text.js'
import { chooseLocalFile } from '@/utils/filePicker.js'
import {
  chooseNetworkFileConfig,
  downloadNetworkFile,
  readFileAsArrayBuffer
} from '@/utils/networkFile'
import { parsePdfStatementWithLlm } from '@/utils/aiCrossCheck'
import { isPdfFile } from '@/utils/pdfPages'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '交叉校验配置 - 记账本', path: '/pages/settings/index' })

const assetStore = useAssetStore()
const today = new Date().toISOString().slice(0, 10)

const selectedAssetId = ref('')
const startDate = ref(today.slice(0, 8) + '01')
const endDate = ref(today)
const selectedProvider = ref('auto')
const parsedProvider = ref('')
const selectedFileName = ref('')
const externalRows = ref([])
const parseMessages = ref([])
const progressState = reactive({ visible: false, title: '', message: '', current: 0, total: 0 })
const progressPercent = computed(() => {
  if (!progressState.visible) return 0
  if (!progressState.total) return progressState.current ? 100 : 0
  return Math.min(100, Math.round((progressState.current / progressState.total) * 100))
})
const setProgress = ({ title = progressState.title, message = '', current = 0, total = 0 }) => {
  progressState.visible = true
  progressState.title = title
  progressState.message = message
  progressState.current = current
  progressState.total = total
}

const providerOptions = PROVIDER_OPTIONS
const assetLabels = computed(() => assetStore.assets.map(asset => asset.name))
const selectedAsset = computed(() => assetStore.assets.find(asset => asset.id === selectedAssetId.value))
const selectedAssetName = computed(() => selectedAsset.value?.name || '')
const canStart = computed(() => selectedAssetId.value && startDate.value && endDate.value && externalRows.value.length > 0)

onShow(() => {
  assetStore.init()
  if (!selectedAssetId.value && assetStore.assets.length) {
    selectedAssetId.value = assetStore.assets[0].id
  }
})

const onAssetChange = (event) => {
  const asset = assetStore.assets[Number(event.detail.value)]
  selectedAssetId.value = asset?.id || ''
}

const selectFile = async () => {
  parseMessages.value = []
  setProgress({ title: '校验文件进度', message: '请选择校验文件...', current: 0, total: 4 })

  try {
    const file = await chooseLocalFile({
      extensions: ['xls', 'xlsx', 'csv', 'pdf'],
      mimeType: '*/*'
    })
    await readFile(file)
  } catch (error) {
    if (error.message !== '已取消选择') {
      uni.showToast({ title: error.message || '文件选择失败', icon: 'none' })
    }
  }
}

const selectNetworkFile = async () => {
  try {
    setProgress({ title: '校验文件进度', message: '请选择网络文件...', current: 1, total: 5 })
    const config = await chooseNetworkFileConfig('download')
    setProgress({ title: '校验文件进度', message: '正在下载网络文件...', current: 2, total: 5 })
    uni.showLoading({ title: '下载中...' })
    const file = await downloadNetworkFile(config)
    await readFile(file)
    uni.showToast({ title: '网络文件已加载', icon: 'success' })
  } catch (error) {
    if (error.message !== '已取消选择') {
      uni.showToast({ title: error.message || '网络文件下载失败', icon: 'none' })
    }
  } finally {
    uni.hideLoading()
  }
}

const readFile = async (file) => {
  selectedFileName.value = file.name || '已选择文件'
  setProgress({ title: '校验文件进度', message: '正在读取文件...', current: 1, total: 4 })
  try {
    const buffer = await readFileAsArrayBuffer(file)
    if (isPdfFile(file)) {
      await readPdfFile(buffer)
      return
    }
    setProgress({ title: '校验文件进度', message: '正在解析流水...', current: 2, total: 4 })
    const data = new Uint8Array(buffer)
    const result = parseWorkbookData(data, selectedFileName.value)
    parsedProvider.value = result.provider
    externalRows.value = result.rows.filter(row => row.type && row.date && !Number.isNaN(new Date(String(row.date).replace(/-/g, '/')).getTime()))
    setProgress({ title: '校验文件进度', message: '正在过滤有效流水...', current: 3, total: 4 })
    parseMessages.value = [
      ...result.errors.map(message => ({ type: 'error', message })),
      ...result.warnings.map(message => ({ type: 'warning', message }))
    ]
    setProgress({ title: '校验文件进度', message: '解析完成：有效流水 ' + externalRows.value.length + ' 条', current: 4, total: 4 })
    if (!externalRows.value.length && result.errors.length) {
      uni.showToast({ title: result.errors[0], icon: 'none' })
    }
  } catch (error) {
    console.error(error)
    externalRows.value = []
    parseMessages.value = [{ type: 'error', message: '文件解析失败，请确认文件格式是否正确' }]
  }
}

const readPdfFile = async (buffer) => {
  setProgress({ title: 'PDF AI 识别进度', message: '正在准备 PDF...', current: 1, total: 5 })
  const result = await parsePdfStatementWithLlm({
    buffer,
    assetName: selectedAssetName.value,
    startDate: startDate.value,
    endDate: endDate.value,
    onProgress: (message) => setProgress({ title: 'PDF AI 识别进度', message, current: 3, total: 5 })
  })

  parsedProvider.value = result.provider
  externalRows.value = result.rows.filter(row => row.type && row.date && !Number.isNaN(new Date(String(row.date).replace(/-/g, '/')).getTime()))
  parseMessages.value = result.warnings.map(message => ({ type: 'warning', message }))
  setProgress({ title: 'PDF AI 识别进度', message: `解析完成：有效流水 ${externalRows.value.length} 条`, current: 5, total: 5 })
  if (!externalRows.value.length) {
    uni.showToast({ title: 'PDF 未识别到有效流水', icon: 'none' })
  }
}

const parseWorkbookData = (data, fileName = '') => {
  const attempts = [
    () => XLSX.read(data, { type: 'array', cellDates: true, raw: false }),
    () => XLSX.read(data, { type: 'array', cellDates: true, raw: false, codepage: 936 })
  ]

  if (/\.csv$/i.test(fileName)) {
    attempts.push(
      () => XLSX.read(decodeText(data, 'utf-8'), { type: 'string', raw: false }),
      () => XLSX.read(decodeText(data, 'gbk'), { type: 'string', raw: false })
    )
  }

  const results = attempts.map(readWorkbook => {
    try {
      const workbook = readWorkbook()
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, raw: false })
      return parseImportRows(rows, selectedProvider.value)
    } catch (error) {
      return { provider: '', rows: [], errors: ['文件解析失败，请确认文件格式是否正确'], warnings: [] }
    }
  })

  return results.find(result => result.rows.length && !result.errors.length) ||
    results.find(result => result.rows.length) ||
    results[0]
}

const startCheck = () => {
  if (!canStart.value) {
    uni.showToast({ title: '请先选择资产、时间和校验文件', icon: 'none' })
    return
  }

  setProgress({ title: '开始校验进度', message: '正在创建校验会话...', current: 1, total: 2 })

  createCrossCheckSession({
    assetId: selectedAssetId.value,
    assetName: selectedAssetName.value,
    startDate: startDate.value,
    endDate: endDate.value,
    provider: parsedProvider.value || selectedProvider.value,
    rows: externalRows.value
  })

  setProgress({ title: '开始校验进度', message: '校验数据准备完成，正在进入结果页...', current: 2, total: 2 })
  uni.redirectTo({ url: '/pages/cross-check/home' })
}
</script>

<style scoped>
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: linear-gradient(180deg, #FFF9F0 0%, #FFF3E7 100%); }
.header { margin-bottom: 18px; padding: 4px 2px; }
.title { display: block; font-size: 25px; font-weight: 800; color: var(--color-text, #333); margin-bottom: 8px; }
.subtitle, .hint { display: block; font-size: 13px; line-height: 20px; color: var(--color-text-light, #777); }
.card { padding: 18px; border-radius: 24px; background: rgba(255,249,240,.96); box-shadow: 8px 8px 18px rgba(217,212,204,.78), -8px -8px 18px rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.65); }
.section { margin-bottom: 20px; }
.label { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 800; color: #333; }
.picker-box { min-height: 46px; padding: 0 14px; border-radius: 15px; background: rgba(255,255,255,.72); color: #333; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: inset 3px 3px 8px rgba(217,212,204,.62), inset -3px -3px 8px rgba(255,255,255,.86); }
.two-cols { display: flex; gap: 12px; }
.date-item { flex: 1; min-width: 0; }
.source-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.source-tab { min-width: 74px; height: 38px; padding: 0 10px; border: 0; border-radius: 13px; background: #fff3e7; color: #333; font-size: 13px; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 4px 4px 10px rgba(217,212,204,.62), -4px -4px 10px rgba(255,255,255,.86); }
.source-tab.active { background: var(--color-primary, #FF8D5D); color: #fff; font-weight: 800; box-shadow: inset 3px 3px 8px rgba(179,89,48,.25), inset -3px -3px 8px rgba(255,255,255,.22); }
.primary-btn, .start-btn { width: 100%; min-height: 46px; border: 0; border-radius: 15px; font-size: 15px; font-weight: 800; background: var(--color-primary, #FF8D5D); color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 5px 5px 12px rgba(217,125,82,.22), -5px -5px 12px rgba(255,255,255,.8); }
.secondary-file-btn { margin-top: 10px; background: #fff3e7; color: #333; }
.start-btn { background: var(--color-secondary, #88B194); margin-top: 4px; }
.start-btn[disabled] { opacity: .55; }
.message { padding: 10px 12px; margin-bottom: 8px; border-radius: 12px; font-size: 13px; line-height: 19px; }
.message.error { background: #ffecec; color: #d64545; }
.message.warning { background: #fff4dc; color: #a66a00; }
.summary { padding: 13px; border-radius: 14px; background: rgba(255,255,255,.68); }
.progress-section { padding: 14px; border-radius: 15px; background: rgba(255,255,255,.68); }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.progress-title { color: #333; font-size: 14px; font-weight: 800; }
.progress-percent { color: var(--color-primary, #FF8D5D); font-size: 13px; font-weight: 800; }
.progress-track { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,.08); }
.progress-bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #FFB380, #FF8D5D); transition: width .25s ease; }
.progress-text { display: block; margin-top: 8px; color: #777; font-size: 12px; line-height: 18px; }
.summary-title { display: block; margin-bottom: 4px; font-size: 16px; font-weight: 800; color: #333; }
</style>
