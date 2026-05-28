<template>
  <scroll-view scroll-y class="container">
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

        <button class="select-btn network-btn" @click="selectNetworkFile" :disabled="isImporting">
          选择网络文件
        </button>

        <view v-if="selectedFile" class="file-info">
          <text class="file-name">{{ selectedFile.name }}</text>
          <text class="file-size">{{ formatFileSize(selectedFile.size) }}</text>
        </view>

        <view class="format-box">
          <text class="format-title">可上传格式</text>
          <text class="format-text">支付宝 / 微信：平台导出的 `.xls`、`.xlsx`、`.csv` 原始文件。</text>
          <text class="format-text">通用模板：日期、类型、资产、币种、金额、目标资产、目标币种、目标金额、一级分类、二级分类、手续费、是否计入统计、备注。</text>
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
        <text class="section-title">问题行预览{{ problemRows.length ? `（${problemRows.length} 条）` : '' }}</text>
        <text v-if="!problemRows.length" class="empty-text">没有需要处理的问题行</text>
        <template v-else>
        <scroll-view scroll-x class="preview-table">
          <view class="table-header">
            <text class="header-cell small">行号</text>
            <text class="header-cell">日期</text>
            <text class="header-cell">类型</text>
            <text class="header-cell">账户</text>
            <text class="header-cell">币种</text>
            <text class="header-cell">金额</text>
            <text class="header-cell">目标资产</text>
            <text class="header-cell">目标币种</text>
            <text class="header-cell">目标金额</text>
            <text class="header-cell">分类</text>
            <text class="header-cell">计入统计</text>
            <text class="header-cell wide">备注</text>
            <text class="header-cell">状态</text>
          </view>
          <view v-for="row in previewRows" :key="row.rowIndex" class="table-row">
            <text class="cell small">{{ row.rowIndex }}</text>
            <text class="cell">{{ row.date }}</text>
            <text class="cell">{{ row.typeText || '-' }}</text>
            <text class="cell">{{ row.asset }}</text>
            <text class="cell">{{ row.currency || 'CNY' }}</text>
            <text class="cell">{{ formatAmount(row) }}</text>
            <text class="cell">{{ row.targetAsset || '-' }}</text>
            <text class="cell">{{ row.targetCurrency || row.currency || 'CNY' }}</text>
            <text class="cell">{{ formatTargetAmount(row) }}</text>
            <text class="cell">{{ getCategoryText(row) }}</text>
            <text class="cell">{{ row.isIncludedInStats === false ? '否' : '是' }}</text>
            <text class="cell wide">{{ row.remark || '-' }}</text>
            <text :class="['cell', rowStatusClass(row)]">{{ rowStatusText(row) }}</text>
          </view>
        </scroll-view>
        </template>
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
        <view v-if="isImporting && progressState.visible" class="import-inline-progress">
          <view class="progress-header">
            <text class="progress-title">{{ progressState.title }}</text>
            <text class="progress-percent">{{ progressPercent }}%</text>
          </view>
          <view class="progress-track">
            <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
          </view>
          <text class="progress-text">{{ progressState.message }}</text>
        </view>

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
      <text class="tip-item">2. 可在通用模板中填写“是否计入统计”，支持“是/否”。</text>
      <text class="tip-item">3. 充值、提现、转账等余额变动默认不参与消费统计。</text>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import * as XLSX from 'xlsx'
import { useBillStore } from '@/store/bill.js'
import { useCategoryStore, ASSET_ADJUSTMENT_CATEGORY_ID } from '@/store/category.js'
import { useAssetStore } from '@/store/asset.js'
import {
  PROVIDER_OPTIONS,
  PROVIDER_GUIDES,
  getProviderLabel,
  parseImportRows
} from '@/utils/importParsers.js'
import { chooseLocalFile } from '@/utils/filePicker.js'
import { decodeText } from '@/utils/text.js'
import {

  chooseNetworkFileConfig,

  downloadNetworkFile,

  readFileAsArrayBuffer

} from '@/utils/networkFile.js'



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
const finishProgress = (message) => setProgress({ title: progressState.title || '处理进度', message, current: 1, total: 1 })
const resetProgress = () => {
  progressState.visible = false
  progressState.title = ''
  progressState.message = ''
  progressState.current = 0
  progressState.total = 0
}
const showImportLoading = (current, total) => {
  uni.showLoading({
    title: '导入中 ' + current + '/' + total,
    mask: true
  })
}

const providerGuide = computed(() => PROVIDER_GUIDES[selectedProvider.value])
const parsedProviderLabel = computed(() => parsedProvider.value ? getProviderLabel(parsedProvider.value) : '-')
const problemRows = computed(() => importData.value.filter(row => {
  return row.validationErrors.length > 0 || row.validationWarnings.length > 0
}))
const previewRows = computed(() => problemRows.value.slice(0, 8))
const importableData = computed(() => importData.value.filter(row => row.validationErrors.length === 0))

const expenseCategoryOptions = computed(() => buildCategoryOptions('expense'))
const incomeCategoryOptions = computed(() => buildCategoryOptions('income'))
const expenseCategoryLabels = computed(() => expenseCategoryOptions.value.map(option => option.label))
const incomeCategoryLabels = computed(() => incomeCategoryOptions.value.map(option => option.label))
const selectedExpenseCategoryLabel = computed(() => getSelectedCategoryLabel('expense'))
const selectedIncomeCategoryLabel = computed(() => getSelectedCategoryLabel('income'))
const needsExpenseCategory = computed(() => importData.value.some(row => rowNeedsDefaultCategory(row, 'expense')))
const needsIncomeCategory = computed(() => importData.value.some(row => rowNeedsDefaultCategory(row, 'income')))
const showCategoryFallbacks = computed(() => needsExpenseCategory.value || needsIncomeCategory.value)

onShow(() => {
  assetStore.init()
  categoryStore.init()
  billStore.init()
  validateData()
})

const selectProvider = (provider) => {
  selectedProvider.value = provider
  if (selectedFile.value) {
    parseFile(selectedFile.value)
  }
}

const selectFile = async () => {
  if (isImporting.value) return

  try {
    const file = await chooseLocalFile({
      extensions: ['xls', 'xlsx', 'csv'],
      mimeType: '*/*'
    })
    selectedFile.value = file
    await parseFile(file)
  } catch (error) {
    if (error.message !== '已取消选择') {
      uni.showToast({
        title: error.message || '文件选择失败',
        icon: 'none'
      })
    }
  }
}

const selectNetworkFile = async () => {
  if (isImporting.value) return
  try {
    const config = await chooseNetworkFileConfig('download')
    uni.showLoading({ title: '下载中...' })
    const file = await downloadNetworkFile(config)
    selectedFile.value = file
    await parseFile(file)
    uni.showToast({ title: '网络文件已加载', icon: 'success' })
  } catch (error) {
    if (error.message !== '已取消选择') {
      uni.showToast({ title: error.message || '网络文件下载失败', icon: 'none' })
    }
  } finally {
    uni.hideLoading()
  }
}

const parseFile = async (file) => {
  clearParsedData()
  setProgress({ title: '文件解析进度', message: '正在读取文件...', current: 1, total: 4 })

  try {
    const buffer = await readFileAsArrayBuffer(file)
    setProgress({ title: '文件解析进度', message: '正在识别表格内容...', current: 2, total: 4 })
    const data = new Uint8Array(buffer)
    const result = parseWorkbookData(data, file.name || '网络文件.xls')
    parsedProvider.value = result.provider
    parseSummary.value = {
      detectedHeaders: result.detectedHeaders,
      ignoredRows: result.ignoredRows
    }
    parseMessages.value = [
      ...result.errors.map(message => ({ type: 'error', message })),
      ...result.warnings.map(message => ({ type: 'warning', message }))
    ]
    setProgress({ title: '文件解析进度', message: '正在校验数据...', current: 3, total: 4 })
    importData.value = decorateRows(result.rows)
    validateData()
    finishProgress('解析完成：共 ' + result.rows.length + ' 条，可导入 ' + importableData.value.length + ' 条')

    if (result.errors.length) {
      uni.showToast({
        title: result.errors[0],
        icon: 'none',
        duration: 3000
      })
    }
  } catch (error) {
    console.error('解析文件失败:', error)
    parseMessages.value = [{ type: 'error', message: error.message || '文件解析失败，请确认文件格式是否正确' }]
    finishProgress(error.message || '文件解析失败，请确认文件格式是否正确')

    uni.showToast({
      title: '文件解析失败',
      icon: 'none'
    })
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
  resetProgress()
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

const decorateRows = (rows) => rows.map(row => ({
  ...row,
  externalUniqueKey: createExternalUniqueKey(row),
  isDuplicate: false,
  duplicateReason: '',
  validationErrors: [],
  validationWarnings: []
}))

const createExternalUniqueKey = (row) => [
  row.provider,
  row.date,
  row.type,
  row.amount,
  row.remark,
  row.orderNo
].filter(part => part !== undefined && part !== null && String(part).trim() !== '').join('|')


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

    if (row.type === 'adjustment') {

      if (Number(row.amount) === 0 || Number.isNaN(Number(row.amount))) {

        errors.push('资产调整金额不能为0')

      }

    } else if (Number(row.amount) <= 0) {

      errors.push('金额必须大于0')

    }

    if (!rowHasCategory(row)) {
      errors.push(`请选择未分类${row.type === 'income' ? '收入' : '支出'}的默认分类`)
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

const startImport = async () => {
  if (!importableData.value.length) {
    uni.showToast({
      title: '没有可导入的记录',
      icon: 'none'
    })
    return
  }

  isImporting.value = true
  setProgress({ title: '导入进度', message: '准备导入 ' + importableData.value.length + ' 条记录...', current: 0, total: importableData.value.length })
  showImportLoading(0, importableData.value.length)

  try {
    let successCount = 0
    let errorCount = 0
    const skippedCount = importData.value.length - importableData.value.length

    for (const [index, item] of importableData.value.entries()) {
      setProgress({ title: '导入进度', message: '正在导入第 ' + (index + 1) + ' / ' + importableData.value.length + ' 条', current: index, total: importableData.value.length })
      if (index === 0 || index % 10 === 0) showImportLoading(index, importableData.value.length)
      try {
        const assetId = ensureAsset(item.asset, item.provider)
        const targetAssetId = item.type === 'transfer' && item.targetAsset
          ? ensureAsset(item.targetAsset, item.provider)
          : null
        const category = ensureCategory(item)
        const normalizedAmount = item.type === 'adjustment'

          ? Number(item.amount)

          : (item.type === 'income' || item.type === 'refund'

            ? Math.abs(Number(item.amount))

            : -Math.abs(Number(item.amount)))

        const billData = {
          amount: normalizedAmount,
          assetId,
          targetAssetId,
          parentCategoryId: category.parentCategoryId,
          categoryId: category.categoryId,
          remark: item.remark,
          timestamp: parseTimestamp(item.date),
          currency: item.currency || 'CNY',

          targetAmount: item.type === 'transfer' ? Number(item.targetAmount ?? item.amount ?? 0) : undefined,

          targetCurrency: item.type === 'transfer' ? (item.targetCurrency || item.currency || 'CNY') : (item.currency || 'CNY'),
          type: item.type,
          isIncludedInStats: item.isIncludedInStats,
          fee: item.type === 'transfer' ? Number(item.fee || 0) : 0,
          importProvider: item.provider,
          externalUniqueKey: item.externalUniqueKey,
          externalOrderNo: item.orderNo
        }

        await billStore.addBill(billData)
        successCount += 1
        setProgress({ title: '导入进度', message: '已导入 ' + (index + 1) + ' / ' + importableData.value.length + ' 条', current: index + 1, total: importableData.value.length })
        if ((index + 1) % 10 === 0 || index + 1 === importableData.value.length) showImportLoading(index + 1, importableData.value.length)
      } catch (error) {
        console.error('导入失败:', error)
        errorCount += 1
      }
    }

    const finalMessage = '导入完成：成功 ' + successCount + ' 条，跳过 ' + skippedCount + ' 条，失败 ' + errorCount + ' 条'
    resetImport()
    finishProgress(finalMessage)

    uni.showToast({
      title: `成功${successCount}条，跳过${skippedCount}条，失败${errorCount}条`,
      icon: 'success',
      duration: 3000
    })

  } catch (error) {
    console.error('导入过程出错:', error)
    uni.showToast({
      title: '导入失败，请重试',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
    isImporting.value = false
  }
}

const ensureAsset = (name, provider) => {
  const existing = assetStore.findByName(name)
  if (existing) return existing.id

  const newAsset = assetStore.addAsset({
    name,
    type: provider === 'generic' ? 'cash' : 'digital',
    initialBalance: 0
  })
  return newAsset.id
}

const ensureCategory = (item) => {
  if (item.type === 'adjustment') {
    return { parentCategoryId: ASSET_ADJUSTMENT_CATEGORY_ID, categoryId: ASSET_ADJUSTMENT_CATEGORY_ID }
  }

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

  const sign = row.type === 'adjustment'
    ? (Number(row.amount || 0) >= 0 ? '+' : '')
    : (row.type === 'income' || row.type === 'refund' ? '+' : '-')

  const displayAmount = row.type === 'adjustment'
    ? Number(row.amount || 0)
    : Math.abs(Number(row.amount || 0))

  return `${sign}${displayAmount.toFixed(2)} ${row.currency || 'CNY'}`

}



const formatTargetAmount = (row) => {

  if (row.type !== 'transfer') return '-'

  const amount = row.targetAmount ?? row.amount ?? 0

  return `${Number(amount || 0).toFixed(2)} ${row.targetCurrency || row.currency || 'CNY'}`

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
.container {

  height: 100vh;

  box-sizing: border-box;

  padding: 20px;

  background: var(--color-bg);

  display: block;

  overflow-y: auto;

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

  display: flex;

  margin-right: -10px;

  margin-bottom: 12px;

}

.source-tab {
  min-height: 40px;
  padding: 0 10px;
  border: none;
  border-radius: 12px;
  background: #fff3e7;
  color: var(--color-text);
  font-size: 14px;
  line-height: 40px;
}

.source-tab.active {
  background: var(--color-primary);
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
  background: var(--color-primary);
  color: #fff;
}

.import-btn {
  background: var(--color-secondary);
  color: #fff;
}

.import-btn[disabled],
.select-btn[disabled],
.secondary-btn[disabled] {
  opacity: 0.55;
}

.secondary-btn {
  margin-top: 10px;
  background: #fff3e7;
  color: var(--color-primary);
}

.file-info,
.format-box,
.detected-box,
.picker-box {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
}

.file-info {
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
.more-text,
.empty-text {
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

  display: flex;

  flex-wrap: wrap;

  margin-right: -10px;

  margin-bottom: 12px;

}

.summary-item {

  box-sizing: border-box;

  width: 50%;

  padding: 12px;

  padding-right: 10px;

  margin-bottom: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
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

.picker-box {
  margin-top: 10px;
  color: var(--color-text);
  font-size: 14px;
}

.preview-table {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.68);
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

.progress-section { padding: 14px; border-radius: 14px; background: rgba(255,255,255,.68); }
.import-inline-progress { box-sizing: border-box; width: 100%; padding: 12px; margin-bottom: 12px; border-radius: 14px; background: rgba(255,255,255,.78); }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.progress-title { color: #333; font-size: 14px; font-weight: 800; }
.progress-percent { color: var(--color-primary, #FF8D5D); font-size: 13px; font-weight: 800; }
.progress-track { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,.08); }
.progress-bar { height: 100%; border-radius: 999px; background: var(--color-primary, #FF8D5D); transition: width .25s ease; }
.progress-text { display: block; margin-top: 8px; color: #777; font-size: 12px; }

.tips {

  padding: 16px;

  margin-bottom: calc(20px + env(safe-area-inset-bottom));
  border-radius: 16px;
  background: rgba(136, 177, 148, 0.14);
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

