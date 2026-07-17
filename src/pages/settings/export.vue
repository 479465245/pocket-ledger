<template>
  <scroll-view scroll-y class="container">
    <view class="content-card neu-card">
      <view class="icon-wrapper">
        <text class="icon">📤</text>
      </view>
      <text class="title">导出数据</text>
      <text class="description">将账单数据导出为 Excel 格式，包含多币种字段</text>
      
      <!-- 日期范围选择 -->
      <view class="date-range-section">
        <text class="section-title">选择日期范围</text>
        <view class="date-inputs">
          <view class="date-input-wrapper">
            <text class="date-label">开始日期</text>
            <picker 
              mode="date" 
              :value="startDate" 
              @change="onStartDateChange"
              class="date-picker neu-input"
            >
              <view class="date-text">{{ startDate }}</view>
            </picker>
          </view>
          <view class="date-input-wrapper">
            <text class="date-label">结束日期</text>
            <picker 
              mode="date" 
              :value="endDate" 
              @change="onEndDateChange"
              class="date-picker neu-input"
            >
              <view class="date-text">{{ endDate }}</view>
            </picker>
          </view>
        </view>
        
        <!-- 快速选择按钮 -->
        <view class="quick-select">
          <button 
            v-for="option in quickOptions" 
            :key="option.key"
            class="quick-btn neu-btn"
            @click="selectQuickRange(option.key)"
          >
            {{ option.label }}
          </button>
        </view>
      </view>
      
      <!-- 导出按钮 -->
      <button 

        class="neu-btn primary-btn" 

        @click="handleExport"

        :disabled="isExporting"

      >

        <text v-if="isExporting">导出中...</text>

        <text v-else>导出账单</text>

      </button>



      <button 

        class="neu-btn upload-btn" 

        @click="handleUploadNetwork"

        :disabled="isExporting"

      >

        上传到网络文件

      </button>

      <view v-if="exportProgress.visible" class="progress-section">
        <view class="progress-header">
          <text class="progress-title">{{ exportProgress.title }}</text>
          <text class="progress-percent">{{ exportProgressPercent }}%</text>
        </view>
        <view class="progress-track">
          <view class="progress-bar" :style="{ width: exportProgressPercent + '%' }"></view>
        </view>
        <text class="progress-text">{{ exportProgress.message }}</text>
      </view>
      
      <!-- 导出说明 -->
      <view class="tips">
        <text class="tip-title">导出说明：</text>
        <text class="tip-item">1. 包含指定日期范围内的所有账单记录</text>
        <text class="tip-item">2. 导出格式为 Excel (.xls)</text>
        <text class="tip-item">3. 包含列：日期、类型、资产、币种、金额、目标资产、目标币种、目标金额、一级分类、二级分类、手续费、统计金额、AA组ID、AA角色、AA本人承担、AA待收、分期组ID、当前期数、总期数、分期总额、分期手续费、每期金额、是否计入统计、备注</text>
        <text class="tip-item">4. 可在电脑上进行数据分析</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useAssetStore } from '@/store/asset'
import { useCategoryStore } from '@/store/category'
import { chooseNetworkFileConfig, uploadNetworkFile } from '@/utils/networkFile'
import { saveLocalFile } from '@/utils/fileSaver.js'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '数据导出 - 记账本', path: '/pages/settings/index' })

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()

const isExporting = ref(false)
const startDate = ref(getDateString(new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000))) // 30天前
const endDate = ref(getDateString(new Date()))
const exportProgress = reactive({ visible: false, title: '', message: '', current: 0, total: 0 })
const exportProgressPercent = computed(() => {
  if (!exportProgress.visible) return 0
  if (!exportProgress.total) return exportProgress.current ? 100 : 0
  return Math.min(100, Math.round((exportProgress.current / exportProgress.total) * 100))
})
const setExportProgress = ({ title = exportProgress.title, message = '', current = 0, total = 0 }) => {
  exportProgress.visible = true
  exportProgress.title = title
  exportProgress.message = message
  exportProgress.current = current
  exportProgress.total = total
}

const quickOptions = [
  { key: '7days', label: '近7天' },
  { key: '30days', label: '近30天' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' }
]

onShow(() => {
  billStore.init()
  assetStore.init()
  categoryStore.init()
})

function getDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function onStartDateChange(e) {
  startDate.value = e.detail.value
}

function onEndDateChange(e) {
  endDate.value = e.detail.value
}

function selectQuickRange(key) {
  const today = new Date()
  let start, end
  
  switch (key) {
    case '7days':
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      end = today
      break
    case '30days':
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      end = today
      break
    case 'thisMonth':
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = today
      break
    case 'lastMonth':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
      break
  }
  
  startDate.value = getDateString(start)
  endDate.value = getDateString(end)
}

const buildExportPayload = () => {
  if (new Date(startDate.value) > new Date(endDate.value)) {
    throw new Error('开始日期不能晚于结束日期')
  }

  const startTimestamp = new Date(startDate.value + ' 00:00:00').getTime()
  const endTimestamp = new Date(endDate.value + ' 23:59:59').getTime()

  const filteredBills = billStore.bills.filter(bill => bill.timestamp >= startTimestamp && bill.timestamp <= endTimestamp)

  if (filteredBills.length === 0) {
    throw new Error('指定日期范围内无数据')
  }

  const exportData = filteredBills.map(bill => {
    const date = new Date(bill.timestamp)
    const dateStr = getDateString(date)
    const asset = assetStore.getAsset(bill.assetId)
    const assetName = asset ? asset.name : '未知资产'

    let targetAssetName = ''
    if (bill.type === 'transfer' && bill.targetAssetId) {
      const targetAsset = assetStore.getAsset(bill.targetAssetId)
      targetAssetName = targetAsset ? targetAsset.name : '未知目标资产'
    }

    const parentCategoryName = categoryStore.getCategoryName(bill.parentCategoryId)
    let categoryName = ''
    if (bill.categoryId && bill.categoryId !== bill.parentCategoryId) {
      categoryName = categoryStore.getCategoryName(bill.categoryId)
    }

    const typeMap = {
      income: '收入',
      expense: '支出',
      transfer: '转账',
      refund: '退款',
      adjustment: '资产调整'
    }
    const typeText = typeMap[bill.type] || '支出'

    return {
      '日期': dateStr,
      '类型': typeText,
      '资产': assetName,
      '币种': bill.currency || 'CNY',
      '金额': bill.amount,
      '目标资产': targetAssetName,
      '目标币种': bill.type === 'transfer' ? (bill.targetCurrency || bill.currency || 'CNY') : '',
      '目标金额': bill.type === 'transfer' ? (bill.targetAmount ?? Math.abs(Number(bill.amount || 0))) : '',
      '一级分类': parentCategoryName,
      '二级分类': categoryName,
      '手续费': bill.type === 'transfer' ? (bill.fee || 0) : '',
      '统计金额': bill.statAmount !== undefined ? bill.statAmount : '',
      'AA组ID': bill.aa?.groupId || '',
      'AA角色': bill.aa?.role || '',
      'AA本人承担': bill.aa?.ownAmount !== undefined ? bill.aa.ownAmount : '',
      'AA待收': bill.aa?.receivableAmount !== undefined ? bill.aa.receivableAmount : '',
      '分期组ID': bill.installment?.groupId || '',
      '当前期数': bill.installment?.period || '',
      '总期数': bill.installment?.totalPeriods || '',
      '分期总额': bill.installment?.totalAmount !== undefined ? bill.installment.totalAmount : '',
      '分期手续费': bill.installment?.fee !== undefined ? bill.installment.fee : '',
      '每期金额': bill.installment?.periodAmount !== undefined ? bill.installment.periodAmount : '',
      '是否计入统计': bill.isIncludedInStats === false ? '否' : '是',
      '备注': bill.remark || bill.note || ''
    }
  })

  return {
    fileName: `账单数据_${startDate.value}_${endDate.value}.xls`,
    content: generateXLS(exportData),
    count: exportData.length
  }
}

const handleExport = async () => {
  if (isExporting.value) return
  isExporting.value = true
  setExportProgress({ title: '导出进度', message: '正在筛选账单...', current: 1, total: 4 })

  try {
    const payload = buildExportPayload()
    setExportProgress({ title: '导出进度', message: '正在生成文件...', current: 3, total: 4 })
    await saveLocalFile({
      fileName: payload.fileName,
      content: payload.content,
      mimeType: 'application/vnd.ms-excel;charset=utf-8',
      openType: 'xls'
    })
    setExportProgress({ title: '导出进度', message: '导出完成：共 ' + payload.count + ' 条记录', current: 4, total: 4 })
    uni.showToast({ title: `导出成功，共${payload.count}条记录`, icon: 'success', duration: 2000 })
  } catch (error) {
    if (error.message === '已取消选择') {
      setExportProgress({ title: '导出进度', message: '已取消选择保存位置', current: 1, total: 1 })
      return
    }
    console.error('导出失败:', error)
    uni.showToast({ title: error.message || '导出失败，请重试', icon: 'none' })
  } finally {
    isExporting.value = false
  }
}

const handleUploadNetwork = async () => {
  if (isExporting.value) return
  isExporting.value = true
  setExportProgress({ title: '上传进度', message: '请选择上传位置...', current: 1, total: 5 })

  try {
    const config = await chooseNetworkFileConfig('upload')
    setExportProgress({ title: '上传进度', message: '正在准备导出文件...', current: 2, total: 5 })
    const payload = buildExportPayload()
    setExportProgress({ title: '上传进度', message: '正在上传文件...', current: 4, total: 5 })
    uni.showLoading({ title: '上传中...' })
    await uploadNetworkFile(config, payload.fileName, payload.content)
    setExportProgress({ title: '上传进度', message: '上传完成：共 ' + payload.count + ' 条记录', current: 5, total: 5 })
    uni.showToast({ title: `上传成功，共${payload.count}条记录`, icon: 'success', duration: 2000 })
  } catch (error) {
    if (error.message !== '已取消选择') {
      console.error('上传失败:', error)
      uni.showToast({ title: error.message || '上传失败，请重试', icon: 'none' })
    }
  } finally {
    uni.hideLoading()
    isExporting.value = false
  }
}

function generateXLS(data) {
  if (data.length === 0) return ''
  
  // 获取表头
  const headers = Object.keys(data[0])
  
  // 生成HTML表格内容，模拟XLS格式
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
  html += '<head><meta charset="utf-8"><style>table { border-collapse: collapse; } th, td { border: 1px solid black; padding: 5px; }</style></head><body>'
  html += '<table>'
  
  // 添加表头
  html += '<tr>'
  headers.forEach(header => {
    html += `<th>${header}</th>`
  })
  html += '</tr>'
  
  // 添加数据行
  data.forEach(row => {
    html += '<tr>'
    headers.forEach(header => {
      let value = row[header]
      if (value === null || value === undefined) {
        value = ''
      } else if (typeof value === 'number') {
        // 金额格式化为两位小数
        if (['金额', '目标金额', '手续费'].includes(header)) {
          value = value.toFixed(2)
        }
      }
      html += `<td>${value}</td>`
    })
    html += '</tr>'
  })
  
  html += '</table></body></html>'
  return html
}

</script>

<style scoped>
.container {

  height: 100vh;

  box-sizing: border-box;

  padding: 20px;

  background-color: #FFF9F0;

  display: block;

  overflow-y: auto;

}


.content-card {

  width: 100%;

  padding: 30px 20px;

  margin-bottom: calc(20px + env(safe-area-inset-bottom));
  background: #FFF9F0;
  border-radius: 20px;
  box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #FFF9F0;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.icon {
  font-size: 40px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.description {
  font-size: 14px;
  color: #666;
  margin-bottom: 30px;
}

.date-range-section {
  width: 100%;
  margin-bottom: 30px;
}

.section-title {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.date-inputs {
  display: flex;
  margin-bottom: 15px;
}

.date-input-wrapper:first-child {
  margin-right: 15px;
}

.date-input-wrapper {
  flex: 1;
}

.date-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.date-picker {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: #FFF9F0;
  box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.1), inset -2px -2px 5px rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: #333;
}

.date-text {
  text-align: center;
  line-height: 1.5;
}

.quick-select {
  display: flex;
  flex-wrap: wrap;
  margin-right: -10px;
}

.quick-btn {
  flex: 1;
  min-width: 60px;
  padding: 8px 12px;
  font-size: 12px;
  margin-right: 10px;
  margin-bottom: 0;
}

.neu-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 10px;
  background: #FFF9F0;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.1), -3px -3px 10px rgba(255, 255, 255, 0.7);
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.neu-btn:active {
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}

.neu-btn:disabled {
  opacity: 0.6;
}

.primary-btn {
  color: #FF8D5D;
}

.upload-btn {
  color: #333;
}

.progress-section { width: 100%; box-sizing: border-box; padding: 14px; margin-top: 14px; border-radius: 14px; background: rgba(255,255,255,.68); }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.progress-title { color: #333; font-size: 14px; font-weight: 800; }
.progress-percent { color: var(--color-primary, #FF8D5D); font-size: 13px; font-weight: 800; }
.progress-track { height: 8px; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,.08); }
.progress-bar { height: 100%; border-radius: 999px; background: var(--color-primary, #FF8D5D); transition: width .25s ease; }
.progress-text { display: block; margin-top: 8px; color: #777; font-size: 12px; }

.tips {
  width: 100%;
  text-align: left;
  margin-top: 20px;
}

.tip-title {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.tip-item {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  line-height: 1.5;
}
</style>
