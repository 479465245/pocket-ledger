export const BACKUP_VERSION = 1

export const buildBackupData = ({ bills = [], assets = [], categories = [] }) => ({
  app: 'account-book',
  type: 'full-backup',
  version: BACKUP_VERSION,
  createdAt: new Date().toISOString(),
  data: {
    bills: JSON.parse(JSON.stringify(bills)),
    assets: JSON.parse(JSON.stringify(assets)),
    categories: JSON.parse(JSON.stringify(categories))
  }
})

export const validateBackup = (backup) => {
  if (!backup || backup.type !== 'full-backup' || !backup.data) {
    throw new Error('不是有效的备份文件')
  }
  if (!Array.isArray(backup.data.bills)) throw new Error('备份缺少账单数据')
  if (!Array.isArray(backup.data.assets)) throw new Error('备份缺少资产数据')
  if (!Array.isArray(backup.data.categories)) throw new Error('备份缺少分类数据')
}

export const getBackupCounts = (backup) => ({
  bills: backup.data.bills.length,
  assets: backup.data.assets.length,
  categories: backup.data.categories.length
})

export const applyBackupToStores = (backup, { billStore, assetStore, categoryStore }) => {
  validateBackup(backup)

  categoryStore.categories = JSON.parse(JSON.stringify(backup.data.categories))
  categoryStore.save()

  assetStore.assets = JSON.parse(JSON.stringify(backup.data.assets))
  assetStore.save()

  billStore.bills = JSON.parse(JSON.stringify(backup.data.bills))
  billStore.save()
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
