export const PROVIDER_OPTIONS = [
  { value: 'auto', label: '自动识别' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'generic', label: '通用模板' }
]

export const PROVIDER_GUIDES = {
  auto: '上传支付宝、微信导出的原始账单，系统会根据表头识别来源。',
  alipay: '上传支付宝导出的个人账单文件，保持原始表头和列顺序。',
  wechat: '上传微信支付导出的个人账单文件，保持原始表头和列顺序。',
  generic: '上传按本应用模板整理的表格：日期、类型、资产、币种、金额、目标资产、目标币种、目标金额、一级分类、二级分类、手续费、是否计入统计、备注。'
}

const PLATFORM_WALLET_ASSET_NAME = {
  alipay: '支付宝',
  wechat: '微信钱包'
}

const PAYMENT_DISCOUNT_KEYWORDS = [
  '红包',
  '立减',
  '优惠',
  '支付享优惠',
  '集分宝',
  '奖励金',
  '商家优惠'
]

const BANK_CARD_KEYWORDS = [
  '银行卡',
  '储蓄卡',
  '信用卡'
]

const WALLET_PAYMENT_KEYWORDS = {
  alipay: ['账户余额', '余额', '余额宝', '支付宝余额'],
  wechat: ['零钱', '零钱通', '微信钱包']
}

const HEADER_ALIASES = {
  generic: {
    date: ['日期', '交易时间', '时间'],
    type: ['类型', '账单类型', '收支类型'],
    asset: ['资产', '账户', '资产账户'],

    currency: ['币种', '货币', '资产币种'],

    amount: ['金额', '交易金额'],

    targetAsset: ['目标资产', '转入资产', '目标账户'],

    targetCurrency: ['目标币种', '转入币种', '目标货币'],

    targetAmount: ['目标金额', '转入金额', '到账金额'],

    category1: ['一级分类', '分类', '父分类'],

    category2: ['二级分类', '子分类'],

    fee: ['手续费', '费用'],
    isIncludedInStats: ['是否计入统计', '计入统计', '参与统计', '是否参与统计', '是否计入收支', '计入收支', '是否计入统计金额'],
    remark: ['备注', '说明', '商品说明']
  },
  alipay: {
    date: ['交易时间', '付款时间', '创建时间', '时间'],
    category: ['交易分类', '分类'],
    counterparty: ['交易对方', '对方名称', '对方'],
    account: ['对方账号', '对方账户'],
    product: ['商品说明', '商品名称', '商品', '交易说明'],
    direction: ['收/支', '收支', '收支类型'],
    amount: ['金额', '金额(元)', '金额（元）', '交易金额'],
    paymentMethod: ['收/付款方式', '付款方式', '收款方式'],
    status: ['交易状态', '状态'],
    orderNo: ['交易订单号', '交易号', '支付宝交易号', '订单号'],
    merchantOrderNo: ['商家订单号', '商户订单号'],
    remark: ['备注', '备注信息']
  },
  wechat: {
    date: ['交易时间', '时间'],
    tradeType: ['交易类型', '类型'],
    counterparty: ['交易对方', '对方'],
    product: ['商品', '商品名称', '商品说明'],
    direction: ['收/支', '收支', '收支类型'],
    amount: ['金额(元)', '金额（元）', '金额', '交易金额'],
    paymentMethod: ['支付方式', '收/付款方式'],
    status: ['当前状态', '交易状态', '状态'],
    orderNo: ['交易单号', '微信支付单号', '交易订单号'],
    merchantOrderNo: ['商户单号', '商户订单号'],
    remark: ['备注', '备注信息']
  }
}

const REQUIRED_FIELDS = {
  generic: ['date', 'type', 'asset', 'amount'],
  alipay: ['date', 'direction', 'amount'],
  wechat: ['date', 'direction', 'amount']
}

const PROVIDER_LABELS = PROVIDER_OPTIONS.reduce((labels, option) => {
  labels[option.value] = option.label
  return labels
}, {})

const normalizeText = (value) => String(value ?? '')
  .replace(/^\uFEFF/, '')
  .replace(/^`+/, '')
  .trim()

const normalizeHeader = (value) => normalizeText(value)
  .replace(/\s/g, '')
  .replace(/[()（）:：]/g, '')
  .toLowerCase()

const normalizeAliases = (aliases) => aliases.map(normalizeHeader)

const isBlankRow = (row = []) => row.every(cell => normalizeText(cell) === '')

const getCell = (row, headerMap, field) => {
  const index = headerMap[field]
  return index === undefined ? '' : normalizeText(row[index])
}

const buildHeaderMap = (row, provider) => {
  const aliases = HEADER_ALIASES[provider]
  const normalizedRow = row.map(normalizeHeader)
  const headerMap = {}
  const detectedHeaders = []

  Object.entries(aliases).forEach(([field, names]) => {
    const normalizedNames = normalizeAliases(names)
    const index = normalizedRow.findIndex(header => normalizedNames.includes(header))
    if (index !== -1) {
      headerMap[field] = index
      detectedHeaders.push(`${field}: ${normalizeText(row[index])}`)
    }
  })

  const requiredMatches = REQUIRED_FIELDS[provider].filter(field => headerMap[field] !== undefined).length
  const score = Object.keys(headerMap).length + requiredMatches * 3

  return {
    provider,
    headerMap,
    detectedHeaders,
    requiredMatches,
    score,
    valid: requiredMatches === REQUIRED_FIELDS[provider].length
  }
}

const findHeaderRow = (rows, provider) => {
  const maxRows = Math.min(rows.length, 30)
  let best = null

  for (let index = 0; index < maxRows; index += 1) {
    if (isBlankRow(rows[index])) continue
    const candidate = buildHeaderMap(rows[index], provider)
    candidate.headerRowIndex = index
    if (!best || candidate.score > best.score) {
      best = candidate
    }
  }

  return best
}

const detectProvider = (rows) => {
  const candidates = ['alipay', 'wechat', 'generic']
    .map(provider => findHeaderRow(rows, provider))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)

  return candidates.find(candidate => candidate.valid) || null
}

const normalizeCurrencyCode = (value, fallback = 'CNY') => {
  const text = normalizeText(value).toUpperCase()
  return text || fallback
}

const parseSignedAmount = (value) => {
  const text = normalizeText(value)
    .replace(/,/g, '')
    .replace(/[￥¥元]/g, '')
    .replace(/[()（）]/g, '')
  const match = text.match(/[-+]?\d+(?:\.\d+)?/)
  if (!match) return null
  return Number(match[0])
}

const parseAmount = (value) => {
  const signed = parseSignedAmount(value)
  return signed === null ? null : Math.abs(signed)
}

const parseBooleanValue = (value, fallback) => {
  const text = normalizeText(value).toLowerCase()
  if (!text) return fallback
  if (['是', 'true', 'yes', 'y', '1', '计入', '参与'].includes(text)) return true
  if (['否', 'false', 'no', 'n', '0', '不计入', '不参与'].includes(text)) return false
  if (text.includes('不计') || text.includes('不参与') || text.includes('否')) return false
  if (text.includes('计入') || text.includes('参与') || text.includes('是')) return true
  return fallback
}

const padDatePart = (value) => String(value).padStart(2, '0')

const formatLocalDateTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = padDatePart(date.getMonth() + 1)
  const d = padDatePart(date.getDate())
  const hh = padDatePart(date.getHours())
  const mm = padDatePart(date.getMinutes())
  const ss = padDatePart(date.getSeconds())
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

const formatExcelSerialDate = (serial) => {
  const wholeDays = Math.floor(serial)
  const fraction = serial - wholeDays
  const utcDate = new Date(Date.UTC(1899, 11, 30 + wholeDays))
  if (Number.isNaN(utcDate.getTime())) return ''

  const totalSeconds = Math.round(fraction * 24 * 60 * 60)
  const hh = Math.floor(totalSeconds / 3600)
  const mm = Math.floor((totalSeconds % 3600) / 60)
  const ss = totalSeconds % 60
  const y = utcDate.getUTCFullYear()
  const m = padDatePart(utcDate.getUTCMonth() + 1)
  const d = padDatePart(utcDate.getUTCDate())

  if (hh === 0 && mm === 0 && ss === 0) return `${y}-${m}-${d}`
  return `${y}-${m}-${d} ${padDatePart(hh)}:${padDatePart(mm)}:${padDatePart(ss)}`
}

const formatExcelDate = (value) => {
  if (value instanceof Date) {
    return formatLocalDateTime(value)
  }

  if (typeof value === 'number') {
    return formatExcelSerialDate(value)
  }

  return normalizeText(value)
}

const parseGenericType = (value) => {
  const text = normalizeText(value).toLowerCase()
  if (['支出', 'expense'].includes(text)) return 'expense'
  if (['收入', 'income'].includes(text)) return 'income'
  if (['转账', 'transfer'].includes(text)) return 'transfer'
  if (['资产调整', 'adjustment'].includes(text)) return 'adjustment'

  return null
}

const getPaymentParts = (paymentMethod) => normalizeText(paymentMethod)
  .split(/[&＋+、,，/]/)
  .map(part => normalizeText(part))
  .filter(Boolean)

const isDiscountPart = (part) => PAYMENT_DISCOUNT_KEYWORDS.some(keyword => part.includes(keyword))

const isBankCardPayment = (paymentMethod) => {
  const text = normalizeText(paymentMethod)
  return BANK_CARD_KEYWORDS.some(keyword => text.includes(keyword)) ||
    /银行.*卡/.test(text)
}

const isWalletPayment = (paymentMethod, provider) => {
  const text = normalizeText(paymentMethod)
  return (WALLET_PAYMENT_KEYWORDS[provider] || []).some(keyword => text.includes(keyword))
}

const resolvePlatformAsset = (provider, paymentMethod) => {
  const parts = getPaymentParts(paymentMethod)
  const primaryPart = parts.find(part => !isDiscountPart(part)) || parts[0] || ''
  const source = primaryPart || normalizeText(paymentMethod)

  if (!source || isWalletPayment(source, provider)) {
    return {
      asset: PLATFORM_WALLET_ASSET_NAME[provider],
      assetType: 'digital',
      paymentMethod: normalizeText(paymentMethod)
    }
  }

  if (isBankCardPayment(source)) {
    return {
      asset: source,
      assetType: source.includes('信用卡') ? 'credit' : 'bank',
      paymentMethod: normalizeText(paymentMethod)
    }
  }

  if (source.includes('花呗')) {
    return {
      asset: '花呗',
      assetType: 'credit',
      paymentMethod: normalizeText(paymentMethod)
    }
  }

  return {
    asset: source,
    assetType: 'digital',
    paymentMethod: normalizeText(paymentMethod)
  }
}

const noStatsKeywords = [
  '转账',
  '提现',
  '充值',
  '余额宝',
  '零钱通',
  '银行卡',
  '信用卡还款',
  '还款',
  '红包'
]

const incomeKeywords = ['收入', '收款', '转入', '充值', '退款', '入账']
const expenseKeywords = ['支出', '付款', '转出', '提现', '还款', '转账']

const classifyPlatformType = ({ direction, text, status }) => {
  const directionText = normalizeText(direction)
  const statsText = `${directionText} ${text}`
  const statusText = normalizeText(status)
  const isRefund = `${statsText} ${statusText}`.includes('退款')
  const isNoStats = noStatsKeywords.some(keyword => statsText.includes(keyword))

  if (directionText.includes('支出') || directionText === '支' || directionText === '-') {
    return {
      type: 'expense',
      typeText: '支出',
      isIncludedInStats: !isNoStats && !isRefund
    }
  }

  if (directionText.includes('收入') || directionText === '收' || directionText === '+') {
    if (isRefund) {
      return {
        type: 'refund',
        typeText: '退款',
        isIncludedInStats: false
      }
    }

    return {
      type: 'income',
      typeText: '收入',
      isIncludedInStats: !isNoStats
    }
  }

  if (directionText.includes('不计收支') || directionText.includes('其他') || directionText === '/') {
    if (incomeKeywords.some(keyword => statsText.includes(keyword))) {
      return {
        type: 'income',
        typeText: '收入',
        isIncludedInStats: false
      }
    }

    if (expenseKeywords.some(keyword => statsText.includes(keyword))) {
      return {
        type: 'expense',
        typeText: '支出',
        isIncludedInStats: false
      }
    }
  }

  return {
    type: null,
    typeText: '',
    isIncludedInStats: false
  }
}

const createRemark = (parts) => parts
  .map(part => normalizeText(part))
  .filter(Boolean)
  .join(' / ')

const parseGenericRow = (row, headerMap, rowIndex) => {

  const type = parseGenericType(getCell(row, headerMap, 'type'))

  const amount = type === 'adjustment'
    ? parseSignedAmount(getCell(row, headerMap, 'amount'))
    : parseAmount(getCell(row, headerMap, 'amount'))

  const currency = normalizeCurrencyCode(getCell(row, headerMap, 'currency'), 'CNY')

  const rawTargetCurrency = getCell(row, headerMap, 'targetCurrency')

  const rawTargetAmount = getCell(row, headerMap, 'targetAmount')

  const targetCurrency = normalizeCurrencyCode(rawTargetCurrency, currency)

  const parsedTargetAmount = parseAmount(rawTargetAmount)

  const targetAmount = parsedTargetAmount ?? amount ?? 0

  const defaultIncludedInStats = type ? !['transfer', 'refund', 'adjustment'].includes(type) : false

  const isIncludedInStats = parseBooleanValue(getCell(row, headerMap, 'isIncludedInStats'), defaultIncludedInStats)

  const errors = []



  if (!type) errors.push('无法识别账单类型')

  if (amount === null) errors.push('无法识别金额')



  return {

    rowIndex,

    provider: 'generic',

    date: formatExcelDate(row[headerMap.date]),

    type,

    typeText: type ? ({ expense: '支出', income: '收入', transfer: '转账', refund: '退款', adjustment: '资产调整' }[type]) : '',

    asset: getCell(row, headerMap, 'asset'),

    currency,

    targetAsset: getCell(row, headerMap, 'targetAsset'),

    targetCurrency,

    targetAmount,

    category1: getCell(row, headerMap, 'category1'),

    category2: getCell(row, headerMap, 'category2'),

    amount: amount ?? 0,

    fee: parseAmount(getCell(row, headerMap, 'fee')) ?? 0,

    remark: getCell(row, headerMap, 'remark'),

    orderNo: '',

    isIncludedInStats,

    parseErrors: errors

  }

}

const parsePlatformRow = (row, headerMap, rowIndex, provider) => {
  const category = getCell(row, headerMap, 'category')
  const tradeType = getCell(row, headerMap, 'tradeType')
  const counterparty = getCell(row, headerMap, 'counterparty')
  const account = getCell(row, headerMap, 'account')
  const product = getCell(row, headerMap, 'product')
  const status = getCell(row, headerMap, 'status')
  const orderNo = getCell(row, headerMap, 'orderNo')
  const merchantOrderNo = getCell(row, headerMap, 'merchantOrderNo')
  const remark = getCell(row, headerMap, 'remark')
  const paymentMethod = getCell(row, headerMap, 'paymentMethod')
  const amount = parseAmount(getCell(row, headerMap, 'amount'))
  const assetInfo = resolvePlatformAsset(provider, paymentMethod)
  const classified = classifyPlatformType({
    direction: getCell(row, headerMap, 'direction'),
    text: createRemark([category, tradeType, counterparty, product, remark]),
    status
  })
  const errors = []

  if (!classified.type) errors.push('无法判断收支方向')
  if (amount === null) errors.push('无法识别金额')

  return {
    rowIndex,
    provider,
    date: formatExcelDate(row[headerMap.date]),
    type: classified.type,
    typeText: classified.typeText,
    asset: assetInfo.asset,
    assetType: assetInfo.assetType,
    paymentMethod: assetInfo.paymentMethod,
    currency: 'CNY',

    targetAsset: '',

    targetCurrency: 'CNY',

    targetAmount: amount ?? 0,

    category1: provider === 'alipay' ? category : '',
    category2: '',
    amount: amount ?? 0,
    fee: 0,
    remark: createRemark([tradeType, counterparty, product, account, paymentMethod, status, remark, orderNo || merchantOrderNo]),
    orderNo: orderNo || merchantOrderNo,
    isIncludedInStats: classified.isIncludedInStats,
    parseErrors: errors
  }
}

const parseRowsByProvider = (rows, provider, headerResult) => {
  const parsedRows = []
  let ignoredRows = 0

  for (let index = headerResult.headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index]
    if (isBlankRow(row)) {
      ignoredRows += 1
      continue
    }

    const rowIndex = index + 1
    const item = provider === 'generic'
      ? parseGenericRow(row, headerResult.headerMap, rowIndex)
      : parsePlatformRow(row, headerResult.headerMap, rowIndex, provider)

    const hasCoreValue = item.date || item.amount || item.remark || item.orderNo
    if (!hasCoreValue) {
      ignoredRows += 1
      continue
    }

    parsedRows.push(item)
  }

  return { rows: parsedRows, ignoredRows }
}

export const getProviderLabel = (provider) => PROVIDER_LABELS[provider] || provider

export const parseImportRows = (rows, selectedProvider) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      provider: selectedProvider,
      rows: [],
      errors: ['文件中没有可读取的数据'],
      warnings: [],
      detectedHeaders: [],
      ignoredRows: 0
    }
  }

  const provider = selectedProvider === 'auto'
    ? detectProvider(rows)?.provider
    : selectedProvider

  if (!provider || provider === 'auto') {
    return {
      provider: '',
      rows: [],
      errors: ['无法识别文件来源，请手动选择支付宝、微信或通用模板后重新上传'],
      warnings: [],
      detectedHeaders: [],
      ignoredRows: 0
    }
  }

  const headerResult = findHeaderRow(rows, provider)
  if (!headerResult?.valid) {
    const missingFields = REQUIRED_FIELDS[provider]
      .filter(field => headerResult?.headerMap?.[field] === undefined)
      .join('、')
    return {
      provider,
      rows: [],
      errors: [`未找到${getProviderLabel(provider)}账单的必要表头：${missingFields}`],
      warnings: [],
      detectedHeaders: headerResult?.detectedHeaders || [],
      ignoredRows: 0
    }
  }

  const parsed = parseRowsByProvider(rows, provider, headerResult)
  const warnings = []

  if (selectedProvider !== 'auto') {
    const detected = detectProvider(rows)
    if (detected?.provider && detected.provider !== selectedProvider && detected.score > headerResult.score) {
      warnings.push(`文件更像是${getProviderLabel(detected.provider)}账单，当前按${getProviderLabel(selectedProvider)}解析`)
    }
  }

  return {
    provider,
    rows: parsed.rows,
    errors: parsed.rows.length > 0 ? [] : ['没有解析到可导入的账单明细'],
    warnings,
    detectedHeaders: headerResult.detectedHeaders,
    ignoredRows: parsed.ignoredRows + headerResult.headerRowIndex
  }
}
