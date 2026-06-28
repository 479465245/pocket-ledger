import { formatDate, parseTimestamp, roundMoney } from '@/utils/crossCheck'

const startOfDay = (date) => parseTimestamp(`${date} 00:00:00`)
const endOfDay = (date) => parseTimestamp(`${date} 23:59:59`)

const getAssetName = (assets, id) => assets.find(asset => asset.id === id)?.name || '未知资产'

const getCategoryName = (categories, id) => {
  for (const category of categories) {
    if (category.id === id) return category.name
    const child = (category.children || []).find(item => item.id === id)
    if (child) return `${category.name}/${child.name}`
  }
  return '未分类'
}

const addStat = (map, key, patch) => {
  const current = map.get(key) || { ...patch, amount: 0, count: 0 }
  current.amount = roundMoney(current.amount + patch.amount)
  current.count += 1
  map.set(key, current)
}

const toSortedStats = (map, limit = 12) => Array.from(map.values())
  .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  .slice(0, limit)

export const buildBillAnalysisContext = ({
  bills = [],
  assets = [],
  categories = [],
  billStore,
  startDate,
  endDate
}) => {
  const startTime = startOfDay(startDate)
  const endTime = endOfDay(endDate)
  const rangeBills = bills
    .filter(bill => bill.timestamp >= startTime && bill.timestamp <= endTime)
    .filter(bill => bill.isIncludedInStats !== false)
    .sort((a, b) => a.timestamp - b.timestamp)

  const categoryMap = new Map()
  const assetMap = new Map()
  let income = 0
  let expense = 0

  rangeBills.forEach(bill => {
    const statType = billStore?.getStatType ? billStore.getStatType(bill) : bill.type
    if (!['income', 'expense'].includes(statType)) return

    const amount = roundMoney(billStore?.getStatAmount ? billStore.getStatAmount(bill) : Math.abs(Number(bill.amount || 0)))
    if (statType === 'income') income = roundMoney(income + amount)
    if (statType === 'expense') expense = roundMoney(expense + amount)

    const signedAmount = statType === 'income' ? amount : -amount
    addStat(categoryMap, `${statType}:${bill.parentCategoryId || bill.categoryId || 'none'}`, {
      name: getCategoryName(categories, bill.categoryId || bill.parentCategoryId),
      type: statType,
      amount: signedAmount
    })
    addStat(assetMap, bill.assetId || 'none', {
      name: getAssetName(assets, bill.assetId),
      amount: signedAmount
    })
  })

  const largestBills = rangeBills
    .filter(bill => ['income', 'expense'].includes(billStore?.getStatType ? billStore.getStatType(bill) : bill.type))
    .map(bill => ({
      date: formatDate(bill.timestamp),
      type: billStore?.getStatType ? billStore.getStatType(bill) : bill.type,
      category: getCategoryName(categories, bill.categoryId || bill.parentCategoryId),
      asset: getAssetName(assets, bill.assetId),
      amount: roundMoney(billStore?.getStatAmount ? billStore.getStatAmount(bill) : Math.abs(Number(bill.amount || 0))),
      remark: bill.remark || ''
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  const averageExpense = expense && rangeBills.length ? roundMoney(expense / Math.max(1, rangeBills.filter(bill => (billStore?.getStatType ? billStore.getStatType(bill) : bill.type) === 'expense').length)) : 0
  const anomalies = largestBills
    .filter(item => item.type === 'expense' && averageExpense && item.amount >= averageExpense * 3)
    .slice(0, 8)
    .map(item => ({ ...item, reason: '单笔支出高于本期平均支出 3 倍' }))

  return {
    range: { startDate, endDate },
    summary: {
      billCount: rangeBills.length,
      incomeTotal: income,
      expenseTotal: expense,
      net: roundMoney(income - expense)
    },
    categoryStats: toSortedStats(categoryMap),
    assetStats: toSortedStats(assetMap),
    largestBills,
    anomalies,
    rules: [
      '统计默认排除 isIncludedInStats === false 的账单。',
      '转账不作为收入或支出参与分析。',
      '金额统计复用账单 store 的 getStatType 和 getStatAmount 口径。'
    ]
  }
}
