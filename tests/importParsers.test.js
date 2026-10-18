import test from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDER_OPTIONS, parseImportRows } from '../src/utils/importParsers.js'

const icbcHeaders = [
  '交易日期',
  '摘要',
  '交易详情',
  '交易场所',
  '交易国家或地区简称',
  '钞/汇',
  '交易金额(收入)',
  '交易金额(支出)',
  '交易币种',
  '记账金额(收入)',
  '记账金额(支出)',
  '记账币种',
  '余额',
  '对方户名',
  '对方账户'
]

const icbcRows = [
  ['明细查询文件下载'],
  ['交易日期'],
  ['卡号: 6212****6782', '卡别名: '],
  ['子账户序号: 00000', '子账户类别: 活期', '子账户别名: '],
  icbcHeaders,
  [
    '2026-10-09',
    '转账',
    '',
    '手机银行',
    'CHN',
    '钞',
    '-',
    '-',
    '-',
    '',
    '12,594.11',
    '人民币',
    '746.17',
    '金云',
    '6251****5612'
  ],
  [
    '2026-10-08',
    '工资',
    '',
    '网上银行',
    'CHN',
    '钞',
    '-',
    '-',
    '-',
    '8,000.00',
    '',
    '人民币',
    '13,340.28',
    '公司',
    '6222****1234'
  ],
  ['人民币合计', '', '', '', '', '', '', '', '', '8,000.00', '12,594.11']
]

test('lists ICBC as a supported statement provider', () => {
  assert.deepEqual(
    PROVIDER_OPTIONS.find(option => option.value === 'icbc'),
    { value: 'icbc', label: '工商银行' }
  )
})

test('auto-detects ICBC statements after the metadata rows', () => {
  const result = parseImportRows(icbcRows, 'auto')

  assert.equal(result.provider, 'icbc')
  assert.equal(result.errors.length, 0)
  assert.equal(result.rows.length, 2)
})

test('uses ICBC bookkeeping expense and income columns with signed amounts', () => {
  const result = parseImportRows(icbcRows, 'icbc')

  assert.deepEqual(
    result.rows.map(row => ({ date: row.date, type: row.type, amount: row.amount, currency: row.currency })),
    [
      { date: '2026-10-09', type: 'expense', amount: -12594.11, currency: 'CNY' },
      { date: '2026-10-08', type: 'income', amount: 8000, currency: 'CNY' }
    ]
  )
})

test('falls back to ICBC transaction amount columns when bookkeeping amounts are empty', () => {
  const rows = [
    icbcHeaders,
    [
      '2026-10-07', '消费', '', '柜面', 'CHN', '钞', '', '18.50', '人民币', '', '', '人民币',
      '727.67', '商户', '6222****1234'
    ]
  ]

  const result = parseImportRows(rows, 'icbc')

  assert.equal(result.errors.length, 0)
  assert.equal(result.rows[0].amount, -18.5)
  assert.equal(result.rows[0].type, 'expense')
})

test('prefers a complete ICBC header over a higher-scoring partial header row', () => {
  const rows = [
    ['交易日期', '摘要', '交易详情', '交易场所', '交易国家或地区简称', '钞/汇', '交易币种', '记账币种', '余额', '对方户名', '对方账户'],
    ['交易日期', '摘要', '交易金额(收入)', '记账金额(收入)'],
    ['2026-10-06', '工资', '100.00', '100.00']
  ]

  const result = parseImportRows(rows, 'auto')

  assert.equal(result.provider, 'icbc')
  assert.equal(result.rows.length, 1)
  assert.equal(result.rows[0].amount, 100)
  assert.equal(result.rows[0].type, 'income')
})

test('ignores ICBC total rows before attempting to parse their amount cells', () => {
  const result = parseImportRows(icbcRows, 'icbc')

  assert.equal(result.rows.some(row => row.date.includes('合计')), false)
  assert.equal(result.ignoredRows, 5)
})
