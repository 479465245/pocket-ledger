import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAssetBalanceReport } from '../src/utils/statReports.js'

const billStore = {
  getStatType(bill) {
    if (['transfer', 'refund', 'adjustment'].includes(bill.type)) return bill.type
    return bill.type
  },
  getStatAmount(bill) {
    if (bill.statAmount !== undefined) return Math.abs(Number(bill.statAmount || 0))
    if (bill.aa?.ownAmount !== undefined) return Math.abs(Number(bill.aa.ownAmount || 0))
    return Math.abs(Number(bill.amount || 0))
  }
}

const assets = [
  { id: 'wallet', name: '钱包', initialBalance: 100, initialBalances: { CNY: 100 }, includeInTotal: true },
  { id: 'bank', name: '银行卡', initialBalance: 0, initialBalances: { CNY: 0 }, includeInTotal: true }
]

const bills = [
  {
    id: 'before-period',
    type: 'expense',
    amount: -20,
    assetId: 'wallet',
    timestamp: new Date(2026, 8, 30).getTime(),
    isIncludedInStats: false
  },
  {
    id: 'aa-payment',
    type: 'expense',
    amount: -100,
    statAmount: 40,
    assetId: 'wallet',
    timestamp: new Date(2026, 9, 1).getTime(),
    isIncludedInStats: true,
    aa: { enabled: true, ownAmount: 40 }
  },
  {
    id: 'refund',
    type: 'refund',
    amount: 50,
    assetId: 'wallet',
    timestamp: new Date(2026, 9, 2).getTime(),
    isIncludedInStats: false
  },
  {
    id: 'transfer',
    type: 'transfer',
    amount: -10,
    fee: 1,
    assetId: 'wallet',
    targetAssetId: 'bank',
    targetAmount: 9,
    currency: 'CNY',
    targetCurrency: 'CNY',
    timestamp: new Date(2026, 9, 3).getTime(),
    isIncludedInStats: false
  },
  {
    id: 'aa-repayment',
    type: 'income',
    amount: 60,
    assetId: 'bank',
    timestamp: new Date(2026, 9, 4).getTime(),
    isIncludedInStats: false,
    aa: { role: 'repayment' }
  }
]

const reportFor = (period) => buildAssetBalanceReport({
  bills,
  assets,
  billStore,
  period,
  date: period === 'year' ? '2026' : '2026-10',
  currency: 'CNY'
})

test('uses real account movements for monthly balance and asset changes', () => {
  const report = reportFor('month')
  const wallet = report.accounts.find(item => item.asset.id === 'wallet')
  const bank = report.accounts.find(item => item.asset.id === 'bank')

  assert.deepEqual(
    { opening: wallet.opening, closing: wallet.closing, change: wallet.change },
    { opening: 80, closing: 19, change: -61 }
  )
  assert.deepEqual(
    { opening: bank.opening, closing: bank.closing, change: bank.change },
    { opening: 0, closing: 69, change: 69 }
  )
  assert.deepEqual(
    { opening: report.total.opening, closing: report.total.closing, change: report.total.change },
    { opening: 80, closing: 88, change: 8 }
  )
  assert.equal(wallet.series[0], -20)
  assert.equal(wallet.series[1], 30)
  assert.equal(wallet.series[2], 19)
  assert.equal(bank.series[3], 69)
})

test('uses the same real movements for annual balance and asset changes', () => {
  const report = reportFor('year')
  const wallet = report.accounts.find(item => item.asset.id === 'wallet')
  const bank = report.accounts.find(item => item.asset.id === 'bank')

  assert.equal(wallet.opening, 100)
  assert.equal(wallet.closing, 19)
  assert.equal(bank.closing, 69)
  assert.equal(report.total.change, -12)
  assert.equal(wallet.series[8], 80)
  assert.equal(wallet.series[9], 19)
  assert.equal(bank.series[9], 69)
})

test('applies transfer movements using the currency on each side', () => {
  const report = buildAssetBalanceReport({
    bills: [{
      type: 'transfer',
      amount: -100,
      fee: 2,
      assetId: 'wallet',
      targetAssetId: 'bank',
      currency: 'USD',
      targetCurrency: 'EUR',
      targetAmount: 91,
      timestamp: new Date(2026, 9, 5).getTime()
    }],
    assets,
    billStore,
    period: 'month',
    date: '2026-10',
    currency: 'EUR'
  })

  const wallet = report.accounts.find(item => item.asset.id === 'wallet')
  const bank = report.accounts.find(item => item.asset.id === 'bank')

  assert.equal(wallet.closing, 0)
  assert.equal(bank.closing, 91)
})
