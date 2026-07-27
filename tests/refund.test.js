import test from 'node:test'
import assert from 'node:assert/strict'
import { getRefundTransactionAmount, validateRefundAmount } from '../src/utils/refund.js'

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
