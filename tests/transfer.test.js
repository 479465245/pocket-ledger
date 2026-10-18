import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTransferBill, syncTransferAmountIfEmpty } from '../src/utils/transfer.js'

test('syncs a transfer amount when the opposite amount is empty', () => {
  assert.equal(syncTransferAmountIfEmpty('120', ''), '120')
})

test('keeps a manually entered opposite transfer amount', () => {
  assert.equal(syncTransferAmountIfEmpty('120', '95'), '95')
})

test('continues syncing an opposite amount that was filled automatically', () => {
  assert.equal(syncTransferAmountIfEmpty('88', '8', true), '88')
})

test('keeps zero entered for the opposite transfer amount', () => {
  assert.equal(syncTransferAmountIfEmpty('120', '0'), '0')
})

test('normalizes a transfer with both accounts and target amount', () => {
  const bill = normalizeTransferBill({
    type: 'transfer',
    amount: 100,
    assetId: 'source',
    targetAssetId: 'target',
    currency: 'USD',
    targetCurrency: 'EUR',
    targetAmount: 92,
    fee: '1.5'
  })

  assert.equal(bill.amount, -100)
  assert.equal(bill.targetAmount, 92)
  assert.equal(bill.targetCurrency, 'EUR')
  assert.equal(bill.fee, 1.5)
})

test('fills the target amount for legacy same-value transfers', () => {
  const bill = normalizeTransferBill({
    type: 'transfer',
    amount: -80,
    assetId: 'source',
    targetAssetId: 'target',
    currency: 'CNY'
  })

  assert.equal(bill.targetAmount, 80)
  assert.equal(bill.targetCurrency, 'CNY')
})

test('rejects incomplete or self transfers', () => {
  assert.throws(
    () => normalizeTransferBill({ type: 'transfer', amount: -10, assetId: 'source' }),
    /缺少转入账户/
  )
  assert.throws(
    () => normalizeTransferBill({ type: 'transfer', amount: -10, assetId: 'same', targetAssetId: 'same' }),
    /不能相同/
  )
  assert.throws(
    () => normalizeTransferBill({
      type: 'transfer',
      amount: -10,
      assetId: 'source',
      targetAssetId: 'target',
      targetAmount: 0
    }),
    /转入金额必须大于0/
  )
})

test('leaves non-transfer bills unchanged', () => {
  const bill = { type: 'expense', amount: -12, assetId: 'source' }

  assert.equal(normalizeTransferBill(bill), bill)
})
