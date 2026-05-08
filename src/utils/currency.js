export const CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' },
  { code: 'JPY', symbol: '¥', name: '日元' },
  { code: 'HKD', symbol: 'HK$', name: '港币' },
  { code: 'EUR', symbol: '€', name: '欧元' },
  { code: 'GBP', symbol: '£', name: '英镑' }
]

export const DEFAULT_CURRENCY = 'CNY'

export const getCurrency = (code = DEFAULT_CURRENCY) => {
  return CURRENCIES.find(item => item.code === code) || CURRENCIES[0]
}

export const getCurrencySymbol = (code = DEFAULT_CURRENCY) => {
  return getCurrency(code).symbol
}

export const formatCurrencyAmount = (amount = 0, code = DEFAULT_CURRENCY) => {
  const currency = getCurrency(code)
  return `${currency.symbol} ${Number(amount || 0).toFixed(2)} ${currency.code}`
}
