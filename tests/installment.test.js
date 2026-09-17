import test from 'node:test'
import assert from 'node:assert/strict'
import { buildInstallmentPlan } from '../src/utils/installment.js'

test('builds custom installment amounts while preserving the configured fee total', () => {
  assert.deepEqual(
    buildInstallmentPlan({
      totalAmount: 100,
      fee: 6,
      periods: 3,
      periodAmounts: [20, 35, 51]
    }),
    [
      { periodPrincipal: 18, periodFee: 2, periodAmount: 20 },
      { periodPrincipal: 33, periodFee: 2, periodAmount: 35 },
      { periodPrincipal: 49, periodFee: 2, periodAmount: 51 }
    ]
  )
})

test('rejects custom installment amounts that do not equal total amount plus fee', () => {
  assert.throws(
    () => buildInstallmentPlan({
      totalAmount: 100,
      fee: 6,
      periods: 3,
      periodAmounts: [20, 35, 50]
    }),
    /每期还款金额合计必须等于消费总额加手续费/
  )
})

test('keeps the existing even split when no custom installment amounts are given', () => {
  assert.deepEqual(
    buildInstallmentPlan({ totalAmount: 100, fee: 1, periods: 3 }),
    [
      { periodPrincipal: 33.34, periodFee: 0.34, periodAmount: 33.68 },
      { periodPrincipal: 33.33, periodFee: 0.33, periodAmount: 33.66 },
      { periodPrincipal: 33.33, periodFee: 0.33, periodAmount: 33.66 }
    ]
  )
})
