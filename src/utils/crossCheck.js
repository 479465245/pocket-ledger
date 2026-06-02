import { generateId } from '@/utils/uuid'

export const CROSS_CHECK_SESSION_KEY = 'account_book_cross_check_session'

const DAY = 24 * 60 * 60 * 1000

const parseLocalDateTime = (value, endOfDay = false) => {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.\d{1,3})?)?)?$/)
  if (!match) return NaN

  const [, y, m, d, hh, mm, ss] = match
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    hh === undefined ? (endOfDay ? 23 : 0) : Number(hh),
    mm === undefined ? (endOfDay ? 59 : 0) : Number(mm),
    ss === undefined ? (endOfDay ? 59 : 0) : Number(ss),
    endOfDay && hh === undefined ? 999 : 0
  ).getTime()
}

export const parseTimestamp = (value) => {
  if (value === undefined || value === null || value === '') return NaN
  if (typeof value === 'number') return value
  const localTimestamp = parseLocalDateTime(value)
  if (!Number.isNaN(localTimestamp)) return localTimestamp
  const text = String(value).trim().replace(/-/g, '/')
  const timestamp = new Date(text).getTime()
  if (!Number.isNaN(timestamp)) return timestamp
  const dateOnly = String(value).trim().slice(0, 10)
  return parseLocalDateTime(dateOnly)
}

export const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '-'
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const sameDay = (a, b) => formatDate(a) === formatDate(b)

export const roundMoney = (value) => Number(Number(value || 0).toFixed(2))

export const normalizeName = (value) => String(value || '')
  .replace(/\s/g, '')
  .replace(/[()（）]/g, '')
  .toLowerCase()

export const getDirection = (amount) => Number(amount || 0) >= 0 ? 'income' : 'expense'

export const getAssetName = (assets, assetId) => assets.find(asset => asset.id === assetId)?.name || ''

export const getBillAmountForAsset = (bill, assetId) => {
  if (bill.type === 'transfer' && bill.targetAssetId === assetId) {
    return Math.abs(Number(bill.targetAmount ?? bill.amount ?? 0))
  }
  return Number(bill.amount || 0)
}

export const isBillInAssetRange = (bill, assetId, startTime, endTime) => {
  const timestamp = Number(bill.timestamp || 0)
  if (timestamp < startTime || timestamp > endTime) return false
  return bill.assetId === assetId || (bill.type === 'transfer' && bill.targetAssetId === assetId)
}

export const createCrossCheckSession = ({ assetId, assetName, startDate, endDate, provider, rows }) => {
  const session = {
    id: generateId(),
    assetId,
    assetName,
    startDate,
    endDate,
    provider,
    createdAt: Date.now(),
    externalRows: rows.map((row, index) => {
      const rawAmount = Number(row.amount || 0)
      const signedAmount = row.type === 'income' || row.type === 'refund'
        ? Math.abs(rawAmount)
        : -Math.abs(rawAmount)
      return {
        id: row.id || `${Date.now()}-${index}`,
        rowIndex: row.rowIndex || index + 1,
        provider: row.provider || provider,
        timestamp: parseTimestamp(row.date),
        date: row.date,
        type: row.type,
        direction: row.type === 'income' || row.type === 'refund' ? 'income' : 'expense',
        amount: roundMoney(signedAmount),
        absAmount: roundMoney(Math.abs(rawAmount)),
        assetName: row.asset || assetName,
        paymentMethod: row.paymentMethod || '',
        counterparty: row.counterparty || '',
        remark: row.remark || '',
        isIncludedInStats: row.isIncludedInStats !== false,
        orderNo: row.orderNo || '',
        raw: row
      }
    })
  }
  uni.setStorageSync(CROSS_CHECK_SESSION_KEY, JSON.stringify(session))
  return session
}

export const loadCrossCheckSession = () => {
  const stored = uni.getStorageSync(CROSS_CHECK_SESSION_KEY)
  if (!stored) return null
  try {
    return typeof stored === 'string' ? JSON.parse(stored) : stored
  } catch (error) {
    return null
  }
}

const makeLocalItem = (bill, assetId, assets) => {
  const amount = roundMoney(getBillAmountForAsset(bill, assetId))
  const assetName = bill.type === 'transfer' && bill.targetAssetId === assetId
    ? getAssetName(assets, bill.targetAssetId)
    : getAssetName(assets, bill.assetId)
  return {
    bill,
    id: bill.id,
    timestamp: bill.timestamp,
    date: formatDate(bill.timestamp),
    amount,
    absAmount: roundMoney(Math.abs(amount)),
    direction: getDirection(amount),
    assetId,
    assetName,
    remark: bill.remark || '',
    isIncludedInStats: bill.isIncludedInStats !== false
  }
}

const isSameMoneyAndDirection = (external, local) => {
  return external.absAmount === local.absAmount && external.direction === local.direction
}

const isAssetSame = (external, local, sessionAssetName) => {
  const externalName = normalizeName(external.assetName || sessionAssetName)
  const localName = normalizeName(local.assetName || sessionAssetName)
  return !externalName || !localName || externalName === localName
}

const findCandidates = (external, localItems) => {
  return localItems.filter(local => isSameMoneyAndDirection(external, local) && sameDay(external.timestamp, local.timestamp))
    .sort((a, b) => Math.abs(a.timestamp - external.timestamp) - Math.abs(b.timestamp - external.timestamp))
}

export const calculateCrossCheckReport = ({ session, bills = [], assets = [] }) => {
  if (!session) {
    return {
      summary: { externalCount: 0, localCount: 0, matchedCount: 0, missingCount: 0, extraCount: 0, assetMismatchCount: 0, duplicateCount: 0 },
      localRangeTotal: 0,
      externalRangeTotal: 0,
      missingItems: [],
      extraItems: [],
      assetMismatchItems: [],
      duplicateItems: []
    }
  }

  const startTime = parseLocalDateTime(session.startDate)
  const endTime = parseLocalDateTime(session.endDate, true)
  const localItems = bills
    .filter(bill => isBillInAssetRange(bill, session.assetId, startTime, endTime))
    .map(bill => makeLocalItem(bill, session.assetId, assets))

  const externalRows = (session.externalRows || []).filter(row => {
    const timestamp = Number(row.timestamp || 0)
    return timestamp >= startTime && timestamp <= endTime && row.type && !Number.isNaN(timestamp)
  })

  const matchedLocalIds = new Set()
  const matchedExternalIds = new Set()
  const missingItems = []
  const assetMismatchItems = []
  const duplicateItems = []
  let matchedCount = 0

  externalRows.forEach(external => {
    const candidates = findCandidates(external, localItems)
    if (candidates.length === 0) {
      if (normalizeName(external.assetName) === normalizeName(session.assetName) || !external.assetName) {
        missingItems.push({ id: external.id, external })
      }
      return
    }

    if (candidates.length > 1) {
      duplicateItems.push({ id: external.id, external, locals: candidates })
      candidates.forEach(local => matchedLocalIds.add(local.id))
      matchedExternalIds.add(external.id)
      return
    }

    const [local] = candidates
    matchedExternalIds.add(external.id)
    matchedLocalIds.add(local.id)

    if (isAssetSame(external, local, session.assetName)) {
      matchedCount += 1
    } else {
      assetMismatchItems.push({ id: `${external.id}-${local.id}`, external, local })
    }
  })

  const extraItems = localItems
    .filter(local => !matchedLocalIds.has(local.id))
    .map(local => ({ id: local.id, local }))

  const localRangeTotal = roundMoney(localItems.reduce((sum, item) => sum + item.amount, 0))
  const externalRangeTotal = roundMoney(externalRows.reduce((sum, item) => sum + Number(item.amount || 0), 0))
  const localStatsCount = localItems.filter(item => item.isIncludedInStats !== false).length
  const externalStatsCount = externalRows.filter(item => item.isIncludedInStats !== false).length

  return {
    summary: {
      externalCount: externalRows.length,
      localCount: localItems.length,
      matchedCount,
      missingCount: missingItems.length,
      extraCount: extraItems.length,
      assetMismatchCount: assetMismatchItems.length,
      duplicateCount: duplicateItems.length,
      localStatsCount,
      externalStatsCount
    },
    localRangeTotal,
    externalRangeTotal,
    missingItems,
    extraItems,
    assetMismatchItems,
    duplicateItems
  }
}

export const getProblemConfig = (type) => ({
  missing: { title: '本地缺失', desc: '外部流水中存在，但本地账本未找到' },
  extra: { title: '本地多余', desc: '本地账本中存在，但外部流水未找到' },
  assetMismatch: { title: '资产不一致', desc: '日期和金额能对上，但资产不一致' },
  duplicate: { title: '疑似重复', desc: '多条本地账单可能对应同一条外部流水' }
}[type] || { title: '问题列表', desc: '' })
