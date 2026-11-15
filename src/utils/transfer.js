export const syncTransferAmountIfEmpty = (editedAmount, oppositeAmount, isOppositeAutoSynced) => (
  oppositeAmount === '' || isOppositeAutoSynced ? editedAmount : oppositeAmount
)

export const normalizeTransferBill = (billData = {}) => {
  if (billData.type !== 'transfer') return billData

  const amount = Number(billData.amount)
  const targetAmount = billData.targetAmount === undefined
    ? Math.abs(amount)
    : Number(billData.targetAmount)
  const fee = Number(billData.fee || 0)
  const currency = billData.currency || 'CNY'
  const targetCurrency = billData.targetCurrency || currency
  const fxGainLossAmount = billData.fxGainLossAmount === undefined || billData.fxGainLossAmount === ''
    ? 0
    : Number(billData.fxGainLossAmount)
  const isSameAssetCurrencyConversion = billData.assetId === billData.targetAssetId && currency !== targetCurrency

  if (!billData.assetId) throw new Error('转账缺少转出账户')
  if (!billData.targetAssetId) throw new Error('转账缺少转入账户')
  if (billData.assetId === billData.targetAssetId && currency === targetCurrency) {
    throw new Error('同一账户转出和转入币种不能相同')
  }
  if (!Number.isFinite(fxGainLossAmount)) throw new Error('汇兑损益金额不正确')
  if (fxGainLossAmount !== 0 && !isSameAssetCurrencyConversion) {
    throw new Error('汇兑损益仅支持同资产跨币种转账')
  }
  if (!Number.isFinite(amount) || amount === 0) throw new Error('转出金额必须大于0')
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) throw new Error('转入金额必须大于0')
  if (!Number.isFinite(fee) || fee < 0) throw new Error('手续费不能小于0')

  return {
    ...billData,
    amount: -Math.abs(amount),
    targetAmount: Math.abs(targetAmount),
    targetCurrency,
    fee,
    fxGainLossAmount: isSameAssetCurrencyConversion
      ? Number(fxGainLossAmount.toFixed(2))
      : undefined
  }
}
