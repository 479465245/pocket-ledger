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
        <text class="hint">文件仅用于本次交叉校验，不会直接写入账本。</text>
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
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as XLSX from 'xlsx'
import { useAssetStore } from '@/store/asset'
import { PROVIDER_OPTIONS, parseImportRows } from '@/utils/importParsers'
import { createCrossCheckSession } from '@/utils/crossCheck'

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

const selectFile = () => {
  parseMessages.value = []
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xls,.xlsx,.csv'
  input.onchange = (event) => {
    const file = event.target.files[0]
    if (file) readFile(file)
  }
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['xls', 'xlsx', 'csv'],
    success: (res) => {
      if (res.tempFiles?.length) readFile(res.tempFiles[0])
    },
    fail: () => uni.showToast({ title: '文件选择失败', icon: 'none' })
  })
  // #endif
}

const readFile = (file) => {
  selectedFileName.value = file.name || '已选择文件'
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result)
      const result = parseWorkbookData(data, selectedFileName.value)
      parsedProvider.value = result.provider
      externalRows.value = result.rows.filter(row => row.type && row.date && !Number.isNaN(new Date(String(row.date).replace(/-/g, '/')).getTime()))
      parseMessages.value = [
        ...result.errors.map(message => ({ type: 'error', message })),
        ...result.warnings.map(message => ({ type: 'warning', message }))
      ]
      if (!externalRows.value.length && result.errors.length) {
        uni.showToast({ title: result.errors[0], icon: 'none' })
      }
    } catch (error) {
      console.error(error)
      externalRows.value = []
      parseMessages.value = [{ type: 'error', message: '文件解析失败，请确认文件格式是否正确' }]
    }
  }
  reader.readAsArrayBuffer(file)
}

const parseWorkbookData = (data, fileName = '') => {
  const attempts = [
    () => XLSX.read(data, { type: 'array', cellDates: true, raw: false }),
    () => XLSX.read(data, { type: 'array', cellDates: true, raw: false, codepage: 936 })
  ]

  if (/\.csv$/i.test(fileName)) {
    attempts.push(
      () => XLSX.read(new TextDecoder('utf-8').decode(data), { type: 'string', raw: false }),
      () => XLSX.read(new TextDecoder('gbk').decode(data), { type: 'string', raw: false })
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

  createCrossCheckSession({
    assetId: selectedAssetId.value,
    assetName: selectedAssetName.value,
    startDate: startDate.value,
    endDate: endDate.value,
    provider: parsedProvider.value || selectedProvider.value,
    rows: externalRows.value
  })

  uni.redirectTo({ url: '/pages/cross-check/home' })
}
</script>

<style scoped>
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: var(--color-bg, #FFF9F0); }
.header { margin-bottom: 18px; }
.title { display: block; font-size: 24px; font-weight: 700; color: var(--color-text, #333); margin-bottom: 8px; }
.subtitle, .hint { display: block; font-size: 13px; line-height: 20px; color: var(--color-text-light, #777); }
.card { padding: 18px; border-radius: 20px; background: #FFF9F0; box-shadow: 5px 5px 15px rgba(0,0,0,.08), -5px -5px 15px rgba(255,255,255,.75); }
.section { margin-bottom: 20px; }
.label { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 700; color: #333; }
.picker-box { padding: 14px; border-radius: 14px; background: rgba(255,255,255,.7); color: #333; }
.two-cols { display: flex; gap: 12px; }
.date-item { flex: 1; }
.source-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.source-tab { min-width: 74px; height: 38px; line-height: 38px; padding: 0 10px; border: 0; border-radius: 12px; background: #fff3e7; color: #333; font-size: 13px; }
.source-tab.active { background: var(--color-primary, #FF8D5D); color: #fff; font-weight: 700; }
.primary-btn, .start-btn { width: 100%; min-height: 46px; border: 0; border-radius: 14px; font-size: 15px; font-weight: 700; background: var(--color-primary, #FF8D5D); color: #fff; }
.start-btn { background: var(--color-secondary, #4BA3FF); }
.start-btn[disabled] { opacity: .55; }
.message { padding: 10px; margin-bottom: 8px; border-radius: 10px; font-size: 13px; }
.message.error { background: #ffecec; color: #d64545; }
.message.warning { background: #fff4dc; color: #a66a00; }
.summary { padding: 12px; border-radius: 12px; background: rgba(255,255,255,.68); }
.summary-title { display: block; margin-bottom: 4px; font-size: 16px; font-weight: 700; color: #333; }
</style>
