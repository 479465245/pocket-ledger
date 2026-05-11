<template>
  <view class="container">
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
      
      <!-- 导出说明 -->
      <view class="tips">
        <text class="tip-title">导出说明：</text>
        <text class="tip-item">1. 包含指定日期范围内的所有账单记录</text>
        <text class="tip-item">2. 导出格式为 Excel (.xls)</text>
        <text class="tip-item">3. 包含列：日期、类型、资产、币种、金额、目标资产、目标币种、目标金额、一级分类、分类、手续费、备注</text>
        <text class="tip-item">4. 可在电脑上进行数据分析</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useBillStore } from '@/store/bill'
import { useAssetStore } from '@/store/asset'
import { useCategoryStore } from '@/store/category'

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()

const isExporting = ref(false)
const startDate = ref(getDateString(new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000))) // 30天前
const endDate = ref(getDateString(new Date()))

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

const handleExport = async () => {
  if (isExporting.value) return
  
  // 验证日期范围
  if (new Date(startDate.value) > new Date(endDate.value)) {
    uni.showToast({
      title: '开始日期不能晚于结束日期',
      icon: 'none'
    })
    return
  }
  
  isExporting.value = true
  
  try {
    // 获取日期范围内的账单数据
    const startTimestamp = new Date(startDate.value + ' 00:00:00').getTime()
    const endTimestamp = new Date(endDate.value + ' 23:59:59').getTime()
    
    const filteredBills = billStore.bills.filter(bill => {
      return bill.timestamp >= startTimestamp && bill.timestamp <= endTimestamp
    })
    
    if (filteredBills.length === 0) {
      uni.showToast({
        title: '指定日期范围内无数据',
        icon: 'none'
      })
      return
    }
    
    // 格式化数据
    const exportData = filteredBills.map(bill => {
      const date = new Date(bill.timestamp)
      const dateStr = getDateString(date)
      const asset = assetStore.getAsset(bill.assetId)
      const assetName = asset ? asset.name : '未知资产'
      
      // 获取目标资产名称（转账类型）
      let targetAssetName = ''
      if (bill.type === 'transfer' && bill.targetAssetId) {
        const targetAsset = assetStore.getAsset(bill.targetAssetId)
        targetAssetName = targetAsset ? targetAsset.name : '未知目标资产'
      }
      
      // 获取分类名称
      const parentCategoryName = categoryStore.getCategoryName(bill.parentCategoryId)
      let categoryName = ''
      
      if (bill.categoryId && bill.categoryId !== bill.parentCategoryId) {
        categoryName = categoryStore.getCategoryName(bill.categoryId)
      }
      
      // 获取类型文本
      const typeMap = {
        'income': '收入',
        'expense': '支出',
        'transfer': '转账',
        'refund': '退款',
        'adjustment': '资产调整'
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
        '分类': categoryName,
        '手续费': bill.type === 'transfer' ? (bill.fee || 0) : '',
        '备注': bill.remark || bill.note || ''
      }
    })
    
    // 生成XLS内容（HTML表格格式）
    const xlsContent = generateXLS(exportData)
    
    // 保存文件
    const fileName = `账单数据_${startDate.value}_${endDate.value}.xls`
    saveXLSFile(fileName, xlsContent)
    
    uni.showToast({
      title: `导出成功，共${exportData.length}条记录`,
      icon: 'success',
      duration: 2000
    })
    
  } catch (error) {
    console.error('导出失败:', error)
    uni.showToast({
      title: '导出失败，请重试',
      icon: 'none'
    })
  } finally {
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

function saveXLSFile(fileName, content) {
  // #ifdef H5
  // 在H5环境下创建下载
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // #endif
  
  // #ifndef H5
  // 在其他平台下提示用户
  // 在App端，可以使用uni.saveFile或分享功能，这里简化处理，提示用户
  // 实际项目中可能需要使用 native.js 或 uni.share 等
  const filePath = `${uni.env.USER_DATA_PATH}/${fileName}`
  const fs = uni.getFileSystemManager()
  
  try {
    fs.writeFile({
      filePath: filePath,
      data: content,
      encoding: 'utf8',
      success: () => {
        uni.showModal({
          title: '导出完成',
          content: `文件已保存到：${filePath}\n您可以使用文件管理器查看或分享`,
          confirmText: '复制路径',
          success: (res) => {
            if (res.confirm) {
              uni.setClipboardData({
                data: filePath
              })
            }
          }
        })
      },
      fail: (err) => {
        console.error('保存文件失败', err)
        uni.showToast({
          title: '保存文件失败',
          icon: 'none'
        })
      }
    })
  } catch (e) {
    console.error('文件系统操作失败', e)
    uni.showModal({
      title: '导出完成',
      content: `数据已准备完成，文件名：${fileName}\n请在H5平台使用导出功能以获得最佳体验。`,
      showCancel: false
    })
  }
  // #endif
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #FFF9F0;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.content-card {
  width: 100%;
  padding: 30px 20px;
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

