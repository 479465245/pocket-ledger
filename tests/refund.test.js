import test from 'node:test'
import assert from 'node:assert/strict'
import { getRefundInputValue, getRefundSummary, getRefundTimestamp, getRefundTransactionAmount, validateRefundAmount } from '../src/utils/refund.js'

test('accepts a custom refund amount within the original amount', () => {
  assert.equal(validateRefundAmount('32.5', -100), 32.5)
  assert.equal(getRefundTransactionAmount(-100, 32.5), 32.5)
})

test('rejects a refund amount above the original amount', () => {
  assert.throws(() => validateRefundAmount(100.01, -100), /不能超过原金额/)
})

test('creates the opposite transaction direction for income refunds', () => {
  assert.equal(getRefundTransactionAmount(100, 32.5), -32.5)
})

test('creates a local timestamp from the selected refund date', () => {
  assert.equal(
    getRefundTimestamp('2026-08-14'),
    new Date(2026, 7, 14).getTime()
  )
})

test('rejects an invalid refund date', () => {
  assert.throws(() => getRefundTimestamp('2026-02-30'), /退款日期不正确/)
})

test('reads refund input from uni-app and native input events', () => {
  assert.equal(getRefundInputValue({ detail: { value: '32.5' } }), '32.5')
  assert.equal(getRefundInputValue({ target: { value: '18' } }), '18')
})

test('summarizes all refund records for an original bill', () => {
  const original = { id: 'expense-1', type: 'expense', amount: -100 }
  const bills = [
    original,
    { id: 'refund-1', type: 'refund', originalBillId: 'expense-1', amount: 30 },
    { id: 'refund-2', type: 'refund', originalBillId: 'expense-1', amount: 20 },
    { id: 'other-refund', type: 'refund', originalBillId: 'expense-2', amount: 80 }
  ]

  assert.deepEqual(getRefundSummary(bills, original), {
    originalAmount: 100,
    refundedAmount: 50,
    remainingAmount: 50,
    refundCount: 2
  })
})
