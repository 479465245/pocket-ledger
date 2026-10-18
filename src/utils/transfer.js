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

  if (!billData.assetId) throw new Error('转账缺少转出账户')
  if (!billData.targetAssetId) throw new Error('转账缺少转入账户')
  if (billData.assetId === billData.targetAssetId) throw new Error('转出账户和转入账户不能相同')
  if (!Number.isFinite(amount) || amount === 0) throw new Error('转出金额必须大于0')
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) throw new Error('转入金额必须大于0')
  if (!Number.isFinite(fee) || fee < 0) throw new Error('手续费不能小于0')

  return {
    ...billData,
    amount: -Math.abs(amount),
    targetAmount: Math.abs(targetAmount),
    targetCurrency: billData.targetCurrency || billData.currency || 'CNY',
    fee
  }
}
