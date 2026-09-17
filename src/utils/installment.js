const roundMoney = (value) => Number(Number(value || 0).toFixed(2))
const toCents = (value) => Math.round(Number(value || 0) * 100)
const fromCents = (value) => roundMoney(Number(value || 0) / 100)

const splitCents = (totalCents, count) => {
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}

const validateMoneyAmount = (value, message) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - toCents(amount)) > 0.000001) {
    throw new Error(message)
  }
  return toCents(amount)
}

export const buildInstallmentPlan = ({ totalAmount, fee = 0, periods, periodAmounts } = {}) => {
  const principalCents = validateMoneyAmount(totalAmount, '分期总金额不正确')
  const feeAmount = Number(fee || 0)
  if (!Number.isFinite(feeAmount) || feeAmount < 0 || Math.abs(feeAmount * 100 - toCents(feeAmount)) > 0.000001) {
    throw new Error('分期手续费不正确')
  }
  if (!Number.isInteger(Number(periods)) || Number(periods) < 2) {
    throw new Error('分期期数至少为2期')
  }

  const totalPeriods = Number(periods)
  const feeCents = toCents(feeAmount)
  if (!Array.isArray(periodAmounts)) {
    const principalParts = splitCents(principalCents, totalPeriods)
    const feeParts = splitCents(feeCents, totalPeriods)
    return principalParts.map((periodPrincipal, index) => ({
      periodPrincipal: fromCents(periodPrincipal),
      periodFee: fromCents(feeParts[index]),
      periodAmount: fromCents(periodPrincipal + feeParts[index])
    }))
  }

  if (periodAmounts.length !== totalPeriods) {
    throw new Error('请填写每一期还款金额')
  }
  const periodAmountCents = periodAmounts.map((amount, index) => validateMoneyAmount(amount, `第${index + 1}期还款金额不正确`))
  const expectedTotalCents = principalCents + feeCents
  const actualTotalCents = periodAmountCents.reduce((sum, amount) => sum + amount, 0)
  if (actualTotalCents !== expectedTotalCents) {
    throw new Error('每期还款金额合计必须等于消费总额加手续费')
  }

  const feeParts = splitCents(feeCents, totalPeriods)
  if (periodAmountCents.some((amount, index) => amount < feeParts[index])) {
    throw new Error('每期还款金额不能低于该期手续费')
  }
  return periodAmountCents.map((periodAmount, index) => ({
    periodPrincipal: fromCents(periodAmount - feeParts[index]),
    periodFee: fromCents(feeParts[index]),
    periodAmount: fromCents(periodAmount)
  }))
}

export const getDefaultInstallmentPeriodAmounts = ({ totalAmount, fee = 0, periods } = {}) => (
  buildInstallmentPlan({ totalAmount, fee, periods }).map(item => item.periodAmount)
)
