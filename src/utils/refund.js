const roundMoney = (value) => Number(Number(value).toFixed(2))

export const getRefundInputValue = (event) => {
  const value = event?.detail?.value ?? event?.target?.value
  return value === undefined || value === null ? '' : String(value)
}

export const getRefundSummary = (bills, originalBill) => {
  const originalAmount = Math.abs(Number(originalBill?.amount || 0))
  const refunds = (bills || []).filter(bill => (
    bill.type === 'refund' && bill.originalBillId === originalBill?.id
  ))
  const refundedAmount = roundMoney(refunds.reduce((total, bill) => total + Math.abs(Number(bill.amount || 0)), 0))

  return {
    originalAmount: roundMoney(originalAmount),
    refundedAmount,
    remainingAmount: roundMoney(Math.max(0, originalAmount - refundedAmount)),
    refundCount: refunds.length
  }
}

export const getRefundTimestamp = (dateText) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText || ''))
  if (!match) throw new Error('退款日期不正确')

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new Error('退款日期不正确')
  }
  return date.getTime()
}

export const validateRefundAmount = (amount, originalAmount) => {
  const refundAmount = Number(amount)
  const maximumAmount = Math.abs(Number(originalAmount))

  if (!Number.isFinite(maximumAmount) || maximumAmount <= 0) {
    throw new Error('原账单金额不正确')
  }
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error('退款金额必须大于0')
  }

  const roundedAmount = roundMoney(refundAmount)
  if (roundedAmount > maximumAmount) {
    throw new Error(`退款金额不能超过原金额 ${maximumAmount.toFixed(2)}`)
  }
  return roundedAmount
}

export const getRefundTransactionAmount = (originalAmount, refundAmount) => (
  Number(originalAmount) < 0 ? Number(refundAmount) : -Number(refundAmount)
)
