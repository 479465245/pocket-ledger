import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAAAmounts } from '../src/utils/aaAmounts.js'

test('keeps total unchanged and calculates the receivable after editing own amount', () => {
  assert.deepEqual(calculateAAAmounts(300, 120), {
    editedAmount: 120,
    counterpartAmount: 180
  })
})

test('keeps total unchanged and calculates own amount after editing receivable', () => {
  assert.deepEqual(calculateAAAmounts(300, 80), {
    editedAmount: 80,
    counterpartAmount: 220
  })
})

test('caps an edited amount at the fixed total', () => {
  assert.deepEqual(calculateAAAmounts(300, 350), {
    editedAmount: 300,
    counterpartAmount: 0
  })
})
