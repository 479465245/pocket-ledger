export const BACKUP_VERSION = 2

const clone = (value) => JSON.parse(JSON.stringify(value))

const migrateBackup = (backup) => {
  const migrated = {
    ...backup,
    version: Number(backup.version || 1),
    data: {
      ...backup.data,
      bills: clone(backup.data.bills),
      assets: clone(backup.data.assets),
      categories: clone(backup.data.categories)
    }
  }

  migrated.data.bills = migrated.data.bills.map(bill => ({
    ...bill,
    currency: bill.currency || 'CNY',
    targetCurrency: bill.targetCurrency || bill.currency || 'CNY',
    remark: bill.remark ?? bill.note ?? '',
    isIncludedInStats: bill.type === 'transfer' ? false : bill.isIncludedInStats,
    statAmount: bill.statAmount !== undefined ? Number(bill.statAmount) : undefined,
    aa: bill.aa ? { ...bill.aa } : undefined,
    installment: bill.installment ? { ...bill.installment } : undefined
  }))

  return migrated
}

export const buildBackupData = ({ bills = [], assets = [], categories = [] }) => ({
  app: 'account-book',
  type: 'full-backup',
  version: BACKUP_VERSION,
  createdAt: new Date().toISOString(),
  data: {
    bills: clone(bills),
    assets: clone(assets),
    categories: clone(categories)
  }
})

export const validateBackup = (backup) => {
  if (!backup || backup.app !== 'account-book' || backup.type !== 'full-backup' || !backup.data) {
    throw new Error('不是有效的备份文件')
  }
  const version = Number(backup.version || 1)
  if (!Number.isInteger(version) || version < 1 || version > BACKUP_VERSION) {
    throw new Error(`不支持的备份版本：${backup.version}`)
  }
  if (!Array.isArray(backup.data.bills)) throw new Error('备份缺少账单数据')
  if (!Array.isArray(backup.data.assets)) throw new Error('备份缺少资产数据')
  if (!Array.isArray(backup.data.categories)) throw new Error('备份缺少分类数据')
  return migrateBackup(backup)
}

export const getBackupCounts = (backup) => ({
  bills: backup.data.bills.length,
  assets: backup.data.assets.length,
  categories: backup.data.categories.length
})

export const applyBackupToStores = async (backup, { billStore, assetStore, categoryStore }) => {
  const migrated = validateBackup(backup)

  categoryStore.categories = clone(migrated.data.categories)
  categoryStore.save()

  assetStore.assets = clone(migrated.data.assets)
  assetStore.save()

  billStore.bills = clone(migrated.data.bills)
  billStore.save()

  for (const asset of assetStore.assets) {
    await billStore.recalculateAssetBalance(asset.id)
  }
  return migrated
}

export const formatBackupDateTime = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${m}${d}_${h}${min}${s}`
}

export const getBackupFileName = (date = new Date()) => `记账备份_${formatBackupDateTime(date)}.json`
