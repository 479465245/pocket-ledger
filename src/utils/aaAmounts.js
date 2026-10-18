export const calculateAAAmounts = (total, editedAmount) => {
  const totalAmount = Number(Math.max(0, Number(total) || 0).toFixed(2))
  const amount = Number(Math.min(totalAmount, Math.max(0, Number(editedAmount) || 0)).toFixed(2))

  return {
    editedAmount: amount,
    counterpartAmount: Number((totalAmount - amount).toFixed(2))
  }
}
