<template>
  <view class="import-page">
  <view v-if="isStartUploadMode" :class="['start-upload-container', isStartCompleting ? 'is-completing' : '']">
    <button class="skip-upload" @click="skipStartUpload">跳过上传</button>
    <view class="upload-stage" @click="selectFile">
      <view class="upload-ring ring-one"></view>
      <view class="upload-ring ring-two"></view>
      <view class="upload-ring ring-three"></view>
      <view class="upload-core">
        <view class="upload-glint"></view>
      </view>
    </view>
  </view>

  <scroll-view v-else scroll-y class="container">
    <view class="header">
      <text class="title">导入账单数据</text>
      <text class="subtitle">上传支付宝、微信原始导出文件，无需修改表头</text>
    </view>

    <view class="content neu-card">
      <view class="section">
        <text class="section-title">导入来源</text>
        <view class="source-tabs">
          <button
            v-for="option in providerOptions"
            :key="option.value"
            :class="['source-tab', selectedProvider === option.value ? 'active' : '']"
            @click="selectProvider(option.value)"
            :disabled="isImporting"
          >
            {{ option.label }}
          </button>
        </view>
        <text class="source-guide">{{ providerGuide }}</text>
      </view>

      <view class="section">
        <button class="select-btn" @click="selectFile" :disabled="isImporting">
          {{ selectedFile ? '重新选择文件' : '选择账单文件' }}
        </button>

        <view v-if="selectedFile" class="file-info">
          <text class="file-name">{{ selectedFile.name }}</text>
          <text class="file-size">{{ formatFileSize(selectedFile.size) }}</text>
        </view>

        <view class="format-box">
          <text class="format-title">可上传格式</text>
          <text class="format-text">支付宝 / 微信：平台导出的 `.xls`、`.xlsx`、`.csv` 原始文件。</text>
          <text class="format-text">通用模板：日期、类型、资产、目标资产、一级分类、二级分类、金额、手续费、备注。</text>
        </view>
      </view>

      <view v-if="parseSummary" class="section summary-section">
        <text class="section-title">识别结果</text>
        <view class="summary-grid">
          <view class="summary-item">
            <text class="summary-label">来源</text>
            <text class="summary-value">{{ parsedProviderLabel }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">明细</text>
            <text class="summary-value">{{ importData.length }} 条</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">可导入</text>
            <text class="summary-value">{{ importableData.length }} 条</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">已跳过</text>
            <text class="summary-value">{{ parseSummary.ignoredRows }} 行</text>
          </view>
        </view>

        <view v-if="assetSummary.length" class="asset-summary">
          <text class="detected-title">已识别资产</text>
          <view class="asset-tags">
            <text v-for="asset in assetSummary" :key="asset.name" class="asset-tag">
              {{ asset.name }} · {{ asset.count }} 条
            </text>
          </view>
        </view>

        <view v-if="parseSummary.detectedHeaders.length" class="detected-box">
          <text class="detected-title">已识别字段</text>
          <text class="detected-text">{{ parseSummary.detectedHeaders.join('，') }}</text>
        </view>
      </view>

      <view v-if="parseMessages.length" class="section validation-section">
        <text class="section-title">文件识别提示</text>
        <view v-for="(message, index) in parseMessages" :key="index" class="validation-item">
          <text :class="['validation-text', message.type]">{{ message.message }}</text>
        </view>
      </view>

      <view v-if="showCategoryFallbacks" class="section category-section">
        <text class="section-title">未分类记录处理</text>
        <text class="source-guide">平台账单里没有消费分类时，先为这些记录选择一个默认分类，导入后仍可逐条编辑。</text>

        <picker
          v-if="needsExpenseCategory"
          :range="expenseCategoryLabels"
          @change="selectDefaultCategory('expense', $event)"
        >
          <view class="picker-box">
            <text>{{ selectedExpenseCategoryLabel || '选择未分类支出的默认分类' }}</text>
          </view>
        </picker>

        <picker
          v-if="needsIncomeCategory"
          :range="incomeCategoryLabels"
          @change="selectDefaultCategory('income', $event)"
        >
          <view class="picker-box">
            <text>{{ selectedIncomeCategoryLabel || '选择未分类收入的默认分类' }}</text>
          </view>
        </picker>
      </view>

      <view v-if="importData.length > 0" class="section preview-section">
        <text class="section-title">数据预览（前 8 条）</text>
        <scroll-view scroll-x class="preview-table">
          <view class="table-header">
            <text class="header-cell small">行号</text>
            <text class="header-cell">日期</text>
            <text class="header-cell">类型</text>
            <text class="header-cell">账户</text>
            <text class="header-cell">支付方式</text>
            <text class="header-cell">金额</text>
            <text class="header-cell">分类</text>
            <text class="header-cell wide">备注</text>
            <text class="header-cell">状态</text>
          </view>
          <view v-for="row in previewRows" :key="row.rowIndex" class="table-row">
            <text class="cell small">{{ row.rowIndex }}</text>
            <text class="cell">{{ row.date }}</text>
            <text class="cell">{{ row.typeText || '-' }}</text>
            <text class="cell">{{ row.asset }}</text>
            <text class="cell">{{ row.paymentMethod || '-' }}</text>
            <text class="cell">{{ formatAmount(row) }}</text>
            <text class="cell">{{ getCategoryText(row) }}</text>
            <text class="cell wide">{{ row.remark || '-' }}</text>
            <text :class="['cell', rowStatusClass(row)]">{{ rowStatusText(row) }}</text>
          </view>
        </scroll-view>
      </view>

      <view v-if="validationResults.length > 0" class="section validation-section">
        <text class="section-title">数据校验结果</text>
        <view v-for="(result, index) in validationResults.slice(0, 12)" :key="index" class="validation-item">
          <text :class="['validation-text', result.type]">
            第{{ result.row }}行：{{ result.message }}
          </text>
        </view>
        <text v-if="validationResults.length > 12" class="more-text">还有 {{ validationResults.length - 12 }} 条提示未展示</text>
      </view>

      <view class="actions">
        <button
          class="import-btn"
          @click="startImport"
          :disabled="!importableData.length || isImporting"
        >
          {{ isImporting ? '导入中...' : `导入可导入记录（${importableData.length}）` }}
        </button>

        <button
          class="secondary-btn"
          @click="resetImport"
          :disabled="isImporting"
          v-if="selectedFile || importData.length"
        >
          重新开始
        </button>
      </view>
    </view>

    <view class="tips">
      <text class="tip-text">提示</text>
      <text class="tip-item">1. 支付宝和微信文件请直接上传原始导出结果，不需要删除说明行。</text>
      <text class="tip-item">2. 重复记录会默认跳过，不覆盖你已经编辑过的本地账单。</text>
      <text class="tip-item">3. 充值、提现、转账等余额变动默认不参与消费统计。</text>
    </view>
  </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import * as XLSX from 'xlsx'
import { useBillStore } from '@/store/bill.js'
import { useCategoryStore } from '@/store/category.js'
import { useAssetStore } from '@/store/asset.js'
import {
  PROVIDER_OPTIONS,
  PROVIDER_GUIDES,
  getProviderLabel,
  parseImportRows
} from '@/utils/importParsers.js'

const ONBOARDING_SKIPPED_KEY = 'account_book_onboarding_skipped'
const PENDING_IMPORT_FILE_KEY = '__jizhanPendingImportFile'

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

const providerOptions = PROVIDER_OPTIONS
const selectedProvider = ref('auto')
const parsedProvider = ref('')
const selectedFile = ref(null)
const isImporting = ref(false)
const importData = ref([])
const validationResults = ref([])
const parseMessages = ref([])
const parseSummary = ref(null)
const defaultExpenseCategoryId = ref('')
const defaultIncomeCategoryId = ref('')
const isStartUploadMode = ref(false)
const isStartCompleting = ref(false)

const providerGuide = computed(() => PROVIDER_GUIDES[selectedProvider.value])
const parsedProviderLabel = computed(() => parsedProvider.value ? getProviderLabel(parsedProvider.value) : '-')
const previewRows = computed(() => importData.value.slice(0, 8))
const importableData = computed(() => importData.value.filter(row => !row.isDuplicate && row.validationErrors.length === 0))
const assetSummary = computed(() => {
  const counts = new Map()

  importData.value.forEach(row => {
    if (!row.asset) return
    counts.set(row.asset, (counts.get(row.asset) || 0) + 1)
  })

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

const expenseCategoryOptions = computed(() => buildCategoryOptions('expense'))
const incomeCategoryOptions = computed(() => buildCategoryOptions('income'))
const expenseCategoryLabels = computed(() => expenseCategoryOptions.value.map(option => option.label))
const incomeCategoryLabels = computed(() => incomeCategoryOptions.value.map(option => option.label))
const selectedExpenseCategoryLabel = computed(() => getSelectedCategoryLabel('expense'))
const selectedIncomeCategoryLabel = computed(() => getSelectedCategoryLabel('income'))
const needsExpenseCategory = computed(() => importData.value.some(row => rowNeedsDefaultCategory(row, 'expense')))
const needsIncomeCategory = computed(() => importData.value.some(row => rowNeedsDefaultCategory(row, 'income')))
const showCategoryFallbacks = computed(() => needsExpenseCategory.value || needsIncomeCategory.value)

onLoad((options) => {
  isStartUploadMode.value = options.start === '1'
  syncImportChrome()
  setTimeout(() => {
    startPendingUpload(options)
  }, 240)
})

onShow(() => {
  assetStore.init()
  categoryStore.init()
  billStore.init()
  validateData()
  syncImportChrome()
})

const syncImportChrome = () => {
  uni.setNavigationBarTitle({
    title: isStartUploadMode.value ? '' : '数据导入'
  })
}

const exitStartUploadMode = () => {
  isStartUploadMode.value = false
  syncImportChrome()
}

const skipStartUpload = () => {
  finishStartFlow({ skipped: true })
}

const finishStartFlow = ({ skipped = false } = {}) => {
  if (skipped) {
    uni.setStorageSync(ONBOARDING_SKIPPED_KEY, '1')
  }

  isStartCompleting.value = true

  setTimeout(() => {
    uni.switchTab({
      url: '/pages/index/index',
      fail: () => {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    })
  }, 720)
}

const startPendingUpload = (options = {}) => {
  if (!isStartUploadMode.value) return

  // #ifdef H5
  const pendingFile = window[PENDING_IMPORT_FILE_KEY]
  if (pendingFile) {
    window[PENDING_IMPORT_FILE_KEY] = null
    selectedFile.value = pendingFile
    parseFile(pendingFile, { autoImport: true })
    return
  }
  // #endif

  if (options.pick === '1') {
    selectFile({ autoImport: true })
  }
}

const selectProvider = (provider) => {
  selectedProvider.value = provider
  if (selectedFile.value) {
    parseFile(selectedFile.value)
  }
}

const selectFile = (options = {}) => {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xls,.xlsx,.csv'
  input.onchange = (event) => {
    const file = event.target.files[0]
    if (file) {
      selectedFile.value = file
      if (!isStartUploadMode.value) {
        exitStartUploadMode()
      }
      parseFile(file, { autoImport: isStartUploadMode.value || options.autoImport })
    }
  }
  input.click()
  // #endif

  // #ifndef H5
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['xls', 'xlsx', 'csv'],
    success: (res) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        selectedFile.value = res.tempFiles[0]
        if (!isStartUploadMode.value) {
          exitStartUploadMode()
        }
        parseFile(res.tempFiles[0], { autoImport: isStartUploadMode.value || options.autoImport })
      }
    },
    fail: () => {
      uni.showToast({
        title: '文件选择失败',
        icon: 'none'
      })
    }
  })
  // #endif
}

const parseFile = (file, options = {}) => {
  clearParsedData()

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = new Uint8Array(event.target.result)
      const result = parseWorkbookData(data, file.name)
      parsedProvider.value = result.provider
      parseSummary.value = {
        detectedHeaders: result.detectedHeaders,
        ignoredRows: result.ignoredRows
      }
      parseMessages.value = [
        ...result.errors.map(message => ({ type: 'error', message })),
        ...result.warnings.map(message => ({ type: 'warning', message }))
      ]
      importData.value = decorateRows(result.rows)
      if (options.autoImport) {
        prepareStartDefaultCategories()
      }
      validateData()

      if (options.autoImport && !result.errors.length) {
        startImportAndEnterHome()
      }

      if (result.errors.length) {
        uni.showToast({
          title: result.errors[0],
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('解析文件失败:', error)
      parseMessages.value = [{ type: 'error', message: '文件解析失败，请确认文件格式是否正确' }]
      uni.showToast({
        title: '文件解析失败',
        icon: 'none'
      })
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
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        blankrows: false,
        raw: false
      })
      return parseImportRows(rows, selectedProvider.value)
    } catch (error) {
      return {
        provider: '',
        rows: [],
        errors: ['文件解析失败，请确认文件格式是否正确'],
        warnings: [],
        detectedHeaders: [],
        ignoredRows: 0
      }
    }
  })

  return results.find(result => result.rows.length > 0 && result.errors.length === 0) ||
    results.find(result => result.rows.length > 0) ||
    results[0]
}

const clearParsedData = () => {
  parsedProvider.value = ''
  importData.value = []
  validationResults.value = []
  parseMessages.value = []
  parseSummary.value = null
  defaultExpenseCategoryId.value = ''
  defaultIncomeCategoryId.value = ''
}

const resetImport = () => {
  selectedFile.value = null
  clearParsedData()
}

const decorateRows = (rows) => {
  const keyCounts = new Map()

  return rows.map(row => {
    const externalUniqueKey = createExternalUniqueKey(row)
    const count = keyCounts.get(externalUniqueKey) || 0
    keyCounts.set(externalUniqueKey, count + 1)

    return {
      ...row,
      externalUniqueKey,
      isDuplicate: count > 0 || hasExistingDuplicate(externalUniqueKey),
      duplicateReason: count > 0 ? '文件内重复' : '已导入',
      validationErrors: [],
      validationWarnings: []
    }
  })
}

const createExternalUniqueKey = (row) => [
  row.provider,
  row.date,
  row.type,
  row.amount,
  row.remark,
  row.orderNo
].filter(part => part !== undefined && part !== null && String(part).trim() !== '').join('|')

const hasExistingDuplicate = (externalUniqueKey) => {
  return billStore.bills.some(bill => bill.externalUniqueKey === externalUniqueKey)
}

const buildCategoryOptions = (type) => {
  const options = []

  categoryStore.categories
    .filter(category => category.type === type && !category.hidden)
    .forEach(parent => {
      options.push({
        id: parent.id,
        parentCategoryId: parent.id,
        categoryId: parent.id,
        label: parent.name
      })

      ;(parent.children || [])
        .filter(child => !child.hidden)
        .forEach(child => {
          options.push({
            id: child.id,
            parentCategoryId: parent.id,
            categoryId: child.id,
            label: `${parent.name} / ${child.name}`
          })
        })
    })

  return options
}

const selectDefaultCategory = (type, event) => {
  const index = Number(event.detail.value)
  const options = type === 'income' ? incomeCategoryOptions.value : expenseCategoryOptions.value
  const selected = options[index]
  if (!selected) return

  if (type === 'income') {
    defaultIncomeCategoryId.value = selected.id
  } else {
    defaultExpenseCategoryId.value = selected.id
  }

  validateData()
}

const getSelectedCategoryLabel = (type) => {
  const selectedId = type === 'income' ? defaultIncomeCategoryId.value : defaultExpenseCategoryId.value
  const options = type === 'income' ? incomeCategoryOptions.value : expenseCategoryOptions.value
  return options.find(option => option.id === selectedId)?.label || ''
}

const getSelectedDefaultCategory = (type) => {
  const selectedId = type === 'income' ? defaultIncomeCategoryId.value : defaultExpenseCategoryId.value
  const options = type === 'income' ? incomeCategoryOptions.value : expenseCategoryOptions.value
  return options.find(option => option.id === selectedId) || null
}

const rowNeedsDefaultCategory = (row, type) => {
  return row.type === type &&
    row.isIncludedInStats !== false &&
    !row.category1
}

const rowHasCategory = (row) => {
  if (row.category1) return true
  if (!['income', 'expense'].includes(row.type)) return true
  if (row.isIncludedInStats === false) return true
  return !!getSelectedDefaultCategory(row.type)
}

const validateData = () => {
  const results = []

  importData.value.forEach(row => {
    const errors = [...(row.parseErrors || [])]
    const warnings = []

    if (!row.date) {
      errors.push('日期不能为空')
    } else if (Number.isNaN(parseTimestamp(row.date))) {
      errors.push('日期格式无法识别')
    }

    if (!row.type) {
      errors.push('账单类型不能为空')
    }

    if (!row.asset) {
      errors.push('资产不能为空')
    } else if (!assetStore.findByName(row.asset)) {
      warnings.push(`资产"${row.asset}"不存在，导入时将自动创建`)
    }

    if (row.type === 'transfer') {
      if (!row.targetAsset) {
        errors.push('转账记录必须有目标资产')
      } else if (row.asset === row.targetAsset) {
        errors.push('转出资产和目标资产不能相同')
      }
    }

    if (Number(row.amount) <= 0) {
      errors.push('金额必须大于0')
    }

    if (!rowHasCategory(row)) {
      errors.push(`请选择未分类${row.type === 'income' ? '收入' : '支出'}的默认分类`)
    }

    if (row.isDuplicate) {
      warnings.push(`重复记录，导入时将跳过：${row.duplicateReason}`)
    }

    row.validationErrors = errors
    row.validationWarnings = warnings

    errors.forEach(message => {
      results.push({ row: row.rowIndex, type: 'error', message })
    })
    warnings.forEach(message => {
      results.push({ row: row.rowIndex, type: 'warning', message })
    })
  })

  validationResults.value = results
}

const ensureStartFallbackCategory = (type) => {
  const name = type === 'income' ? '未分类收入' : '未分类支出'
  return categoryStore.findCategoryByName(name, type) ||
    categoryStore.addCategory({
      name,
      type,
      icon: '🏷️'
    })
}

const prepareStartDefaultCategories = () => {
  if (importData.value.some(row => rowNeedsDefaultCategory(row, 'expense'))) {
    defaultExpenseCategoryId.value = ensureStartFallbackCategory('expense').id
  }

  if (importData.value.some(row => rowNeedsDefaultCategory(row, 'income'))) {
    defaultIncomeCategoryId.value = ensureStartFallbackCategory('income').id
  }
}

const ensureAssetsFromParsedRows = () => {
  importData.value.forEach(row => {
    if (row.asset) {
      ensureAsset(row)
    }

    if (row.type === 'transfer' && row.targetAsset) {
      ensureAsset({ asset: row.targetAsset, provider: row.provider, assetType: row.assetType })
    }
  })
}

const runImportRows = async (rows, { showToast = true, resetAfter = true } = {}) => {
  let successCount = 0
  let errorCount = 0
  const skippedCount = importData.value.length - rows.length

  for (const item of rows) {
    try {
      const assetId = ensureAsset(item)
      const targetAssetId = item.type === 'transfer' && item.targetAsset
        ? ensureAsset({ asset: item.targetAsset, provider: item.provider, assetType: item.assetType })
        : null
      const category = ensureCategory(item)
      const normalizedAmount = item.type === 'income' || item.type === 'refund'
        ? Math.abs(Number(item.amount))
        : -Math.abs(Number(item.amount))

      const billData = {
        amount: normalizedAmount,
        assetId,
        targetAssetId,
        parentCategoryId: category.parentCategoryId,
        categoryId: category.categoryId,
        remark: item.remark,
        timestamp: parseTimestamp(item.date),
        type: item.type,
        isIncludedInStats: item.isIncludedInStats,
        fee: item.type === 'transfer' ? Number(item.fee || 0) : 0,
        importProvider: item.provider,
        externalUniqueKey: item.externalUniqueKey,
        externalOrderNo: item.orderNo
      }

      await billStore.addBill(billData)
      successCount += 1
    } catch (error) {
      console.error('导入失败:', error)
      errorCount += 1
    }
  }

  if (showToast) {
    uni.showToast({
      title: `成功${successCount}条，跳过${skippedCount}条，失败${errorCount}条`,
      icon: 'success',
      duration: 3000
    })
  }

  if (resetAfter) {
    resetImport()
  }

  return { successCount, errorCount, skippedCount }
}

const startImportAndEnterHome = async () => {
  if (!importData.value.length) {
    uni.showToast({ title: '未识别到账单', icon: 'none' })
    return
  }

  prepareStartDefaultCategories()
  validateData()

  const rows = importableData.value
  isImporting.value = true

  try {
    const result = rows.length
      ? await runImportRows(rows, { showToast: false, resetAfter: false })
      : { successCount: 0, errorCount: 0 }

    if (result.successCount === 0) {
      ensureAssetsFromParsedRows()
    }

    if (assetStore.assets.length === 0 && billStore.bills.length === 0) {
      uni.setStorageSync(ONBOARDING_SKIPPED_KEY, '1')
    }

    resetImport()
    finishStartFlow()
  } catch (error) {
    console.error('导入过程出错:', error)
    uni.showToast({ title: '导入失败，请重试', icon: 'none' })
  } finally {
    isImporting.value = false
  }
}

const startImport = async () => {
  if (!importableData.value.length) {
    uni.showToast({
      title: '没有可导入的记录',
      icon: 'none'
    })
    return
  }

  isImporting.value = true

  try {
    await runImportRows(importableData.value)
  } catch (error) {
    console.error('导入过程出错:', error)
    uni.showToast({
      title: '导入失败，请重试',
      icon: 'none'
    })
  } finally {
    isImporting.value = false
  }
}

const ensureAsset = (item) => {
  const name = item.asset
  const existing = assetStore.findByName(name)
  if (existing) return existing.id

  const newAsset = assetStore.addAsset({
    name,
    type: item.assetType || (item.provider === 'generic' ? 'cash' : 'digital'),
    initialBalance: 0
  })
  return newAsset.id
}

const ensureCategory = (item) => {
  if (!['income', 'expense', 'refund'].includes(item.type)) {
    return { parentCategoryId: null, categoryId: null }
  }

  const categoryType = item.type === 'income' ? 'income' : 'expense'
  if (!item.category1) {
    const selected = getSelectedDefaultCategory(categoryType)
    return selected
      ? { parentCategoryId: selected.parentCategoryId, categoryId: selected.categoryId }
      : { parentCategoryId: null, categoryId: null }
  }

  const parent = categoryStore.findCategoryByName(item.category1, categoryType) ||
    categoryStore.addCategory({
      name: item.category1,
      type: categoryType
    })

  if (!item.category2) {
    return { parentCategoryId: parent.id, categoryId: parent.id }
  }

  const child = categoryStore.findCategoryByName(item.category2, categoryType, parent.id) ||
    categoryStore.addCategory({
      name: item.category2,
      parentId: parent.id,
      type: categoryType
    })

  return { parentCategoryId: parent.id, categoryId: child.id }
}

const parseTimestamp = (dateText) => {
  const normalized = String(dateText).replace(/-/g, '/')
  return new Date(normalized).getTime()
}

const formatAmount = (row) => {
  const sign = row.type === 'income' || row.type === 'refund' ? '+' : '-'
  return `${sign}${Number(row.amount || 0).toFixed(2)}`
}

const getCategoryText = (row) => {
  if (row.category2) return `${row.category1} / ${row.category2}`
  if (row.category1) return row.category1
  if (row.isIncludedInStats === false) return '不参与统计'
  if (!['income', 'expense'].includes(row.type)) return '-'
  return getSelectedCategoryLabel(row.type) || '未选择'
}

const rowStatusText = (row) => {
  if (row.isDuplicate) return '重复'
  if (row.validationErrors.length) return '待处理'
  if (row.validationWarnings.length) return '可导入'
  return '可导入'
}

const rowStatusClass = (row) => {
  if (row.isDuplicate) return 'status-warning'
  if (row.validationErrors.length) return 'status-error'
  return 'status-ready'
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
</script>

<style scoped>
.import-page {
  min-height: 100vh;
  background: var(--app-bg);
}

.start-upload-container {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 141, 93, 0.16), transparent 34%),
    var(--app-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.skip-upload {
  position: fixed;
  top: calc(var(--window-top, 44px) + 14px);
  right: 18px;
  z-index: 5;
  width: auto;
  min-width: 72px;
  height: 34px;
  padding: 0 12px;
  border: none;
  border-radius: 18px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  color: var(--color-text-light);
  font-size: 12px;
  line-height: 34px;
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.skip-upload::after {
  border: none;
}

.upload-stage {
  width: 238px;
  height: 238px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-ring {
  position: absolute;
  width: 138px;
  height: 138px;
  border-radius: 50%;
  border: 1px solid rgba(255, 141, 93, 0.16);
  background: rgba(255, 141, 93, 0.06);
  box-shadow: 0 0 34px rgba(255, 141, 93, 0.1);
  opacity: 0;
  animation: uploadPulse 2.4s ease-out infinite;
}

.ring-two {
  animation-delay: 0.72s;
}

.ring-three {
  animation-delay: 1.44s;
}

.upload-core {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  position: relative;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  animation: uploadBreathe 2.8s ease-in-out infinite;
}

.start-upload-container.is-completing .skip-upload {
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.start-upload-container.is-completing .upload-ring {
  animation: uploadFinishRipple 0.72s ease-out forwards;
}

.start-upload-container.is-completing .upload-core {
  animation: uploadFinishCore 0.72s ease-in forwards;
}

.upload-glint {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  top: 22px;
  left: 24px;
  background: rgba(255, 255, 255, 0.82);
  filter: blur(1px);
}

@keyframes uploadPulse {
  0% {
    transform: scale(0.56);
    opacity: 0.62;
  }
  72% {
    opacity: 0.18;
  }
  100% {
    transform: scale(1.74);
    opacity: 0;
  }
}

@keyframes uploadBreathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

@keyframes uploadFinishRipple {
  0% {
    transform: scale(0.8);
    opacity: 0.46;
  }
  100% {
    transform: scale(7.2);
    opacity: 0;
  }
}

@keyframes uploadFinishCore {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.72);
    opacity: 0;
  }
}

.container {
  height: 100vh;
  box-sizing: border-box;
  padding: 20px;
  background: transparent;
}

.header {
  margin-bottom: 18px;
}

.title {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-size: 24px;
  font-weight: 700;
}

.subtitle {
  color: var(--color-text-light);
  font-size: 14px;
}

.content {
  padding: 18px;
  margin-bottom: 16px;
}

.section {
  margin-bottom: 22px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: block;
  margin-bottom: 12px;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 700;
}

.source-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.source-tab {
  width: 100%;
  min-height: 40px;
  margin: 0;
  padding: 0 10px;
  border: none;
  border-radius: 12px;
  background: var(--glass-bg-soft);
  border: 1px solid var(--glass-border);
  box-sizing: border-box;
  color: var(--color-text);
  font-size: 14px;
  line-height: 40px;
}

.source-tab.active {
  background: rgba(255, 141, 93, 0.84);
  color: #fff;
  font-weight: 700;
}

.source-guide {
  display: block;
  color: var(--color-text-light);
  font-size: 13px;
  line-height: 20px;
}

.select-btn,
.import-btn,
.secondary-btn {
  width: 100%;
  min-height: 46px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
}

.select-btn {
  margin-bottom: 12px;
  background: rgba(255, 141, 93, 0.86);
  color: #fff;
}

.import-btn {
  background: rgba(61, 155, 114, 0.86);
  color: #fff;
}

.import-btn[disabled],
.select-btn[disabled],
.secondary-btn[disabled] {
  opacity: 0.55;
}

.secondary-btn {
  margin-top: 10px;
  background: var(--glass-bg-soft);
  color: var(--color-primary);
}

.file-info,
.format-box,
.detected-box,
.asset-summary,
.picker-box {
  padding: 12px;
  border-radius: 12px;
  background: var(--glass-bg-soft);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.file-info,
.asset-summary {
  margin-bottom: 12px;
}

.file-name,
.file-size,
.format-title,
.format-text,
.detected-title,
.detected-text,
.more-text {
  display: block;
}

.file-name {
  margin-bottom: 4px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.file-size,
.format-text,
.detected-text,
.more-text {
  color: var(--color-text-light);
  font-size: 12px;
  line-height: 18px;
}

.format-title,
.detected-title {
  margin-bottom: 6px;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.summary-item {
  padding: 12px;
  border-radius: 12px;
  background: var(--glass-bg-soft);
  border: 1px solid var(--glass-border);
}

.summary-label,
.summary-value {
  display: block;
}

.summary-label {
  margin-bottom: 4px;
  color: var(--color-text-light);
  font-size: 12px;
}

.summary-value {
  color: var(--color-text);
  font-size: 16px;
  font-weight: 700;
}

.asset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.asset-tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 141, 93, 0.16);
  border: 1px solid rgba(255, 141, 93, 0.18);
  color: var(--color-text);
  font-size: 12px;
  line-height: 16px;
}

.picker-box {
  margin-top: 10px;
  color: var(--color-text);
  font-size: 14px;
}

.preview-table {
  border-radius: 12px;
  background: var(--glass-bg-soft);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.table-header,
.table-row {
  display: flex;
  min-width: 950px;
}

.table-header {
  border-bottom: 1px solid rgba(74, 74, 74, 0.12);
}

.header-cell,
.cell {
  box-sizing: border-box;
  width: 110px;
  padding: 10px 8px;
  color: var(--color-text);
  font-size: 12px;
  line-height: 18px;
}

.header-cell {
  font-weight: 700;
}

.small {
  width: 54px;
}

.wide {
  width: 220px;
}

.status-ready {
  color: var(--color-secondary);
  font-weight: 700;
}

.status-warning {
  color: #c8892e;
  font-weight: 700;
}

.status-error {
  color: #d94f4f;
  font-weight: 700;
}

.validation-item {
  margin-bottom: 8px;
}

.validation-text {
  display: block;
  font-size: 13px;
  line-height: 19px;
}

.validation-text.error {
  color: #d94f4f;
}

.validation-text.warning {
  color: #c8892e;
}

.tips {
  padding: 16px;
  margin-bottom: 20px;
  border-radius: 16px;
  background: rgba(61, 155, 114, 0.12);
  border: 1px solid rgba(61, 155, 114, 0.16);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.tip-text,
.tip-item {
  display: block;
}

.tip-text {
  margin-bottom: 8px;
  color: var(--color-secondary);
  font-size: 14px;
  font-weight: 700;
}

.tip-item {
  margin-bottom: 4px;
  color: var(--color-text-light);
  font-size: 12px;
  line-height: 18px;
}
</style>
