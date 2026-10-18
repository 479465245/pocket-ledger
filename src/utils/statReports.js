const roundMoney = (value) => Number(Number(value || 0).toFixed(2))

const normalizeCurrency = (currency) => currency || 'CNY'

export const getPeriodRange = (period, date) => {
  if (period === 'year') {
    const year = Number(date)
    return {
      start: new Date(year, 0, 1).getTime(),
      end: new Date(year, 11, 31, 23, 59, 59, 999).getTime()
    }
  }

  const [year, month] = String(date).split('-').map(Number)
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 0, 23, 59, 59, 999).getTime()
  }
}

export const getPeriodBuckets = (period, date) => {
  const range = getPeriodRange(period, date)
  const first = new Date(range.start)
  const count = period === 'year'
    ? 12
    : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()

  return Array.from({ length: count }, (_, index) => {
    const start = period === 'year'
      ? new Date(first.getFullYear(), index, 1)
      : new Date(first.getFullYear(), first.getMonth(), index + 1)
    const end = period === 'year'
      ? new Date(first.getFullYear(), index + 1, 0, 23, 59, 59, 999)
      : new Date(first.getFullYear(), first.getMonth(), index + 1, 23, 59, 59, 999)

    return {
      key: period === 'year'
        ? `${first.getFullYear()}-${String(index + 1).padStart(2, '0')}`
        : `${date}-${String(index + 1).padStart(2, '0')}`,
      label: period === 'year' ? `${index + 1}月` : `${index + 1}日`,
      start: start.getTime(),
      end: end.getTime()
    }
  })
}

export const isIncludedStatBill = (bill, billStore) => {
  const type = billStore.getStatType(bill)
  return bill.isIncludedInStats !== false && (type === 'income' || type === 'expense')
}

export const getStatCurrencies = (bills, billStore, assets = []) => {
  const currencies = new Set()
  bills.forEach(bill => {
    if (isIncludedStatBill(bill, billStore)) currencies.add(normalizeCurrency(bill.currency))
  })
  assets.forEach(asset => {
    Object.keys(asset.initialBalances || {}).forEach(currency => currencies.add(normalizeCurrency(currency)))
    Object.keys(asset.balances || {}).forEach(currency => currencies.add(normalizeCurrency(currency)))
    if (asset.currency) currencies.add(normalizeCurrency(asset.currency))
  })
  return Array.from(currencies)
}

const getBillBucket = (timestamp, buckets) => buckets.find(bucket => timestamp >= bucket.start && timestamp <= bucket.end)

export const buildIncomeExpenseTrend = ({ bills = [], billStore, period, date, currency }) => {
  const buckets = getPeriodBuckets(period, date)
  const range = getPeriodRange(period, date)
  const values = buckets.map(bucket => ({
    ...bucket,
    income: 0,
    expense: 0,
    net: 0
  }))

  bills
    .filter(bill => bill.timestamp >= range.start && bill.timestamp <= range.end)
    .filter(bill => isIncludedStatBill(bill, billStore))
    .filter(bill => normalizeCurrency(bill.currency) === normalizeCurrency(currency))
    .forEach(bill => {
      const bucket = getBillBucket(bill.timestamp, values)
      if (!bucket) return
      const amount = billStore.getStatAmount(bill)
      const type = billStore.getStatType(bill)
      bucket[type] = roundMoney(bucket[type] + amount)
      bucket.net = roundMoney(bucket.income - bucket.expense)
    })

  return values
}

const getInitialBalance = (asset, currency) => {
  if (asset.initialBalances && asset.initialBalances[currency] !== undefined) {
    return Number(asset.initialBalances[currency] || 0)
  }
  return currency === 'CNY' ? Number(asset.initialBalance || 0) : 0
}

const getAssetMovements = (bill, assetId, currency) => {
  const movements = []
  const billCurrency = normalizeCurrency(bill.currency)

  if (bill.assetId === assetId && billCurrency === currency) {
    const fee = bill.type === 'transfer' ? Math.abs(Number(bill.fee || 0)) : 0
    movements.push(Number(bill.amount || 0) - fee)
  }

  if (bill.type === 'transfer' && bill.targetAssetId === assetId && normalizeCurrency(bill.targetCurrency || bill.currency) === currency) {
    const targetAmount = bill.targetAmount !== undefined
      ? Number(bill.targetAmount || 0)
      : Math.abs(Number(bill.amount || 0))
    movements.push(targetAmount)
  }

  return movements
}

export const buildAssetBalanceReport = ({ bills = [], assets = [], billStore, period, date, currency }) => {
  const selectedCurrency = normalizeCurrency(currency)
  const buckets = getPeriodBuckets(period, date)
  const range = getPeriodRange(period, date)
  const assetBills = [...bills]
    .sort((a, b) => a.timestamp - b.timestamp)

  const accountReports = assets.map(asset => {
    let opening = getInitialBalance(asset, selectedCurrency)
    assetBills.forEach(bill => {
      if (bill.timestamp >= range.start) return
      getAssetMovements(bill, asset.id, selectedCurrency)
        .forEach(delta => { opening = roundMoney(opening + delta) })
    })

    let balance = opening
    const series = buckets.map(bucket => {
      assetBills.forEach(bill => {
        if (bill.timestamp < bucket.start || bill.timestamp > bucket.end) return
        getAssetMovements(bill, asset.id, selectedCurrency)
          .forEach(delta => { balance = roundMoney(balance + delta) })
      })
      return roundMoney(balance)
    })

    return {
      asset,
      opening: roundMoney(opening),
      closing: roundMoney(balance),
      change: roundMoney(balance - opening),
      series
    }
  })

  const includedAccounts = accountReports.filter(item => item.asset.includeInTotal !== false)
  const opening = roundMoney(includedAccounts.reduce((sum, item) => sum + item.opening, 0))
  const closing = roundMoney(includedAccounts.reduce((sum, item) => sum + item.closing, 0))
  const totalSeries = buckets.map((_, index) => roundMoney(includedAccounts.reduce((sum, item) => sum + Number(item.series[index] || 0), 0)))
  return {
    buckets,
    accounts: accountReports,
    total: {
      opening,
      closing,
      change: roundMoney(closing - opening),
      series: totalSeries
    }
  }
}

export const buildAnnualSummaryReport = ({ bills = [], billStore, year, currency, categories = [] }) => {
  const selectedCurrency = normalizeCurrency(currency)
  const monthlyTrend = buildIncomeExpenseTrend({
    bills,
    billStore,
    period: 'year',
    date: String(year),
    currency: selectedCurrency
  })
  const totals = monthlyTrend.reduce((result, item) => ({
    income: roundMoney(result.income + item.income),
    expense: roundMoney(result.expense + item.expense),
    net: roundMoney(result.net + item.net)
  }), { income: 0, expense: 0, net: 0 })
  const range = getPeriodRange('year', String(year))
  const categoryMap = {}

  bills
    .filter(bill => bill.timestamp >= range.start && bill.timestamp <= range.end)
    .filter(bill => isIncludedStatBill(bill, billStore))
    .filter(bill => normalizeCurrency(bill.currency) === selectedCurrency)
    .forEach(bill => {
      const type = billStore.getStatType(bill)
      const parentId = bill.parentCategoryId || 'unknown'
      const key = `${type}__${parentId}`
      if (!categoryMap[key]) {
        const category = categories.find(item => item.id === parentId)
        categoryMap[key] = {
          id: parentId,
          type,
          name: category ? category.name : '未知分类',
          icon: category ? category.icon : '❓',
          amount: 0
        }
      }
      categoryMap[key].amount = roundMoney(categoryMap[key].amount + billStore.getStatAmount(bill))
    })

  const buildCategories = (type) => {
    const total = totals[type]
    return Object.values(categoryMap)
      .filter(item => item.type === type)
      .sort((a, b) => b.amount - a.amount)
      .map(item => ({
        ...item,
        percent: total > 0 ? item.amount / total * 100 : 0
      }))
  }
  const topMonth = (type) => {
    if (totals[type] <= 0) return null
    return monthlyTrend.reduce((best, item) => item[type] > best[type] ? item : best, monthlyTrend[0])
  }

  return {
    year: Number(year),
    currency: selectedCurrency,
    monthlyTrend,
    totals,
    average: {
      income: roundMoney(totals.income / 12),
      expense: roundMoney(totals.expense / 12),
      net: roundMoney(totals.net / 12)
    },
    savingRate: totals.income > 0 ? totals.net / totals.income * 100 : null,
    topIncomeMonth: topMonth('income'),
    topExpenseMonth: topMonth('expense'),
    incomeCategories: buildCategories('income'),
    expenseCategories: buildCategories('expense')
  }
}
