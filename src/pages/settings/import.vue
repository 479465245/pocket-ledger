<template>
  <view class="container">
    <view class="header">
      <text class="title">导入账单数据</text>
      <text class="subtitle">请选择要导入的XLS文件</text>
    </view>
    
    <view class="content">
      <view class="file-section">
        <button class="select-btn" @click="selectFile" :disabled="isImporting">
          {{ selectedFile ? '重新选择文件' : '选择XLS文件' }}
        </button>
        
        <view v-if="selectedFile" class="file-info">
          <text class="file-name">已选择: {{ selectedFile.name }}</text>
          <text class="file-size">大小: {{ formatFileSize(selectedFile.size) }}</text>
        </view>
      </view>
      
      <view v-if="previewData.length > 0" class="preview-section">
        <text class="section-title">数据预览（前5条）</text>
        <scroll-view scroll-x class="preview-table">
          <view class="table-header">
            <text class="header-cell">日期</text>
            <text class="header-cell">类型</text>
            <text class="header-cell">资产</text>
            <text class="header-cell">目标资产</text>
            <text class="header-cell">一级分类</text>
            <text class="header-cell">二级分类</text>
            <text class="header-cell">金额</text>
            <text class="header-cell">手续费</text>
            <text class="header-cell">备注</text>
          </view>
          <view v-for="(row, index) in previewData.slice(0, 5)" :key="index" class="table-row">
            <text class="cell">{{ row.date }}</text>
            <text class="cell">{{ row.typeText }}</text>
            <text class="cell">{{ row.asset }}</text>
            <text class="cell">{{ row.targetAsset || '-' }}</text>
            <text class="cell">{{ row.category1 }}</text>
            <text class="cell">{{ row.category2 || '-' }}</text>
            <text class="cell">{{ row.amount }}</text>
            <text class="cell">{{ row.fee || '-' }}</text>
            <text class="cell">{{ row.note }}</text>
          </view>
        </scroll-view>
      </view>
      
      <view v-if="validationResults.length > 0" class="validation-section">
        <text class="section-title">数据校验结果</text>
        <view v-for="(result, index) in validationResults" :key="index" class="validation-item">
          <text :class="['validation-text', result.type]">
            第{{ result.row }}行: {{ result.message }}
          </text>
        </view>
      </view>
      
      <view class="actions">
        <button 
          class="import-btn" 
          @click="startImport" 
          :disabled="!selectedFile || isImporting"
          v-if="validationResults.length === 0 && previewData.length > 0"
        >
          {{ isImporting ? '导入中...' : '开始导入' }}
        </button>
        
        <button 
          class="continue-btn" 
          @click="continueImport" 
          :disabled="isImporting"
          v-if="validationResults.length > 0 && hasOnlyMissingAssets"
        >
          继续导入（自动创建缺失资产）
        </button>
      </view>
    </view>
    
    <view class="tips">
      <text class="tip-text">提示：</text>
      <text class="tip-item">• 支持导入.xls和.xlsx格式文件</text>
      <text class="tip-item">• 第一行为表头，不导入数据</text>
      <text class="tip-item">• 文件列顺序：日期、类型、资产、目标资产、一级分类、二级分类、金额、手续费、备注</text>
      <text class="tip-item">• 如果资产不存在，会提示您新建资产</text>
      <text class="tip-item">• 如果分类不存在，会自动创建对应分类</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useBillStore } from '@/store/bill.js'
import { useCategoryStore } from '@/store/category.js'
import { useAssetStore } from '@/store/asset.js'

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

const selectedFile = ref(null)
const isImporting = ref(false)
const previewData = ref([])
const validationResults = ref([])
const importData = ref([])

const hasOnlyMissingAssets = computed(() => {
  return validationResults.value.length > 0 && 
         validationResults.value.every(result => result.type === 'warning' && result.message.includes('资产不存在'))
})

const selectFile = () => {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xls,.xlsx'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      selectedFile.value = file
      parseFile(file)
    }
  }
  input.click()
  // #endif
  
  // #ifndef H5
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['xls', 'xlsx'],
    success: (res) => {
      if (res.tempFiles && res.tempFiles.length > 0) {
        selectedFile.value = res.tempFiles[0]
        parseFile(res.tempFiles[0])
      }
    },
    fail: (err) => {
      uni.showToast({
        title: '文件选择失败',
        icon: 'none'
      })
    }
  })
  // #endif
}

const parseFile = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) {
        uni.showToast({
          title: '文件中没有数据',
          icon: 'none'
        })
        return
      }
      
      // 跳过第一行表头，从第二行开始解析数据
      const rows = jsonData.slice(1)
      
      const parsedData = rows.map((row, index) => {
        // 解析类型，默认为支出
        const rawType = String(row[1] || '').toLowerCase().trim()
        let type = 'expense'
        let typeText = '支出'
        
        if (rawType === '收入' || rawType === 'income') {
          type = 'income'
          typeText = '收入'
        } else if (rawType === '转账' || rawType === 'transfer') {
          type = 'transfer'
          typeText = '转账'
        } else if (rawType === '退款' || rawType === 'refund') {
          type = 'refund'
          typeText = '退款'
        }
        
        return {
          rowIndex: index + 2, // Excel行号从2开始（第一行是表头）
          date: formatExcelDate(row[0]),
          type: type,
          typeText: typeText,
          asset: String(row[2] || ''),
          targetAsset: String(row[3] || ''),
          category1: String(row[4] || ''),
          category2: String(row[5] || ''),
          amount: parseFloat(row[6]) || 0,
          fee: parseFloat(row[7]) || 0,
          note: String(row[8] || '')
        }
      }).filter(item => item.date && item.asset && item.amount !== 0)
      
      previewData.value = parsedData
      importData.value = parsedData
      validateData(parsedData)
      
    } catch (error) {
      console.error('解析文件失败:', error)
      uni.showToast({
        title: '文件解析失败，请检查文件格式',
        icon: 'none'
      })
    }
  }
  reader.readAsArrayBuffer(file)
}

const formatExcelDate = (excelDate) => {
  if (!excelDate) return ''
  
  // Excel日期可能是数字格式
  if (typeof excelDate === 'number') {
    const date = new Date((excelDate - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }
  
  // 如果是字符串格式，直接返回
  if (typeof excelDate === 'string') {
    return excelDate
  }
  
  return ''
}

const validateData = (data) => {
  const results = []
  
  data.forEach((item, index) => {
    // 验证日期
    if (!item.date) {
      results.push({
        row: item.rowIndex,
        type: 'error',
        message: '日期不能为空'
      })
    }
    
    // 验证类型
    if (!['income', 'expense', 'transfer', 'refund'].includes(item.type)) {
      results.push({
        row: item.rowIndex,
        type: 'warning',
        message: `类型"${item.type}"无效，将默认为支出`
      })
    }
    
    // 验证资产
    const asset = assetStore.assets.find(a => a.name === item.asset)
    if (!asset && item.asset) {
      results.push({
        row: item.rowIndex,
        type: 'warning',
        message: `资产"${item.asset}"不存在`
      })
    }
    
    // 验证目标资产（转账类型）
    if (item.type === 'transfer' && item.targetAsset) {
      const targetAsset = assetStore.assets.find(a => a.name === item.targetAsset)
      if (!targetAsset) {
        results.push({
          row: item.rowIndex,
          type: 'warning',
          message: `目标资产"${item.targetAsset}"不存在`
        })
      }
      if (item.asset === item.targetAsset) {
        results.push({
          row: item.rowIndex,
          type: 'error',
          message: '转出资产和目标资产不能相同'
        })
      }
    }
    
    // 验证分类
    if (!item.category1 && !item.category2) {
      results.push({
        row: item.rowIndex,
        type: 'error',
        message: '分类不能为空'
      })
    }
    
    // 验证金额
    if (item.amount <= 0) {
      results.push({
        row: item.rowIndex,
        type: 'error',
        message: '金额必须大于0'
      })
    }
    
    // 验证手续费（转账类型）
    if (item.type === 'transfer' && item.fee < 0) {
      results.push({
        row: item.rowIndex,
        type: 'error',
        message: '手续费不能为负数'
      })
    }
  })
  
  validationResults.value = results
}

const startImport = async () => {
  if (validationResults.value.length > 0) {
    uni.showToast({
      title: '请先解决数据校验问题',
      icon: 'none'
    })
    return
  }
  
  isImporting.value = true
  
  try {
    let successCount = 0
    let errorCount = 0
    
    for (const item of importData.value) {
      try {
        // 查找或创建资产
        let assetId = null
        const asset = assetStore.assets.find(a => a.name === item.asset)
        if (asset) {
          assetId = asset.id
        } else {
          // 创建新资产
          const newAsset = await assetStore.addAsset({
            name: item.asset,
            type: 'cash',
            balance: 0
          })
          assetId = newAsset.id
        }
        
        // 查找或创建目标资产（转账类型）
        let targetAssetId = null
        if (item.type === 'transfer' && item.targetAsset) {
          const targetAsset = assetStore.assets.find(a => a.name === item.targetAsset)
          if (targetAsset) {
            targetAssetId = targetAsset.id
          } else {
            // 创建新目标资产
            const newTargetAsset = await assetStore.addAsset({
              name: item.targetAsset,
              type: 'cash',
              balance: 0
            })
            targetAssetId = newTargetAsset.id
          }
        }
        
        // 根据类型设置分类类型
        const categoryType = item.type === 'income' ? 'income' : 'expense'
        
        // 查找或创建分类
        let parentCategoryId = null
        let categoryId = null
        
        if (item.category2) {
          // 有二级分类
          const parentCategory = categoryStore.categories.find(c => 
            c.name === item.category1 && c.type === categoryType
          )
          if (parentCategory) {
            parentCategoryId = parentCategory.id
            const subCategory = parentCategory.children.find(c => c.name === item.category2)
            if (subCategory) {
              categoryId = subCategory.id
            } else {
              // 创建子分类
              const newSubCategory = await categoryStore.addCategory({
                name: item.category2,
                parentId: parentCategoryId,
                type: categoryType
              })
              categoryId = newSubCategory.id
            }
          } else {
            // 创建父分类和子分类
            const newParentCategory = await categoryStore.addCategory({
              name: item.category1,
              type: categoryType
            })
            parentCategoryId = newParentCategory.id
            
            const newSubCategory = await categoryStore.addCategory({
              name: item.category2,
              parentId: parentCategoryId,
              type: categoryType
            })
            categoryId = newSubCategory.id
          }
        } else if (item.category1) {
          // 只有一级分类
          const category = categoryStore.categories.find(c => 
            c.name === item.category1 && c.type === categoryType
          )
          if (category) {
            parentCategoryId = category.id
            categoryId = category.id // 一级分类的categoryId就是parentCategoryId
          } else {
            // 创建分类
            const newCategory = await categoryStore.addCategory({
              name: item.category1,
              type: categoryType
            })
            parentCategoryId = newCategory.id
            categoryId = newCategory.id
          }
        }
        
        // 创建账单数据
        const billData = {
          amount: item.amount,
          assetId: assetId,
          parentCategoryId: parentCategoryId,
          categoryId: categoryId,
          note: item.note,
          timestamp: new Date(item.date).getTime(),
          type: item.type,
          fee: item.type === 'transfer' ? item.fee : undefined
        }
        
        // 添加目标资产ID（转账类型）
        if (targetAssetId) {
          billData.targetAssetId = targetAssetId
        }
        
        // 创建账单
        await billStore.addBill(billData)
        
        successCount++
        
      } catch (error) {
        console.error('导入失败:', error)
        errorCount++
      }
    }
    
    uni.showToast({
      title: `导入完成：成功${successCount}条，失败${errorCount}条`,
      icon: 'success',
      duration: 3000
    })
    
    // 重置状态
    selectedFile.value = null
    previewData.value = []
    validationResults.value = []
    importData.value = []
    
  } catch (error) {
    console.error('导入过程出错:', error)
    uni.showToast({
      title: '导入失败，请重试',
      icon: 'none'
    })
  } finally {
    isImporting.value = false
  }
}

const continueImport = () => {
  // 继续导入，自动创建缺失的资产
  startImport()
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.content {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.file-section {
  margin-bottom: 20px;
}

.select-btn {
  width: 100%;
  height: 48px;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 12px;
}

.select-btn[disabled] {
  background: #ccc;
}

.file-info {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
}

.file-name {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.file-size {
  display: block;
  font-size: 12px;
  color: #666;
}

.preview-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12px;
}

.preview-table {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
}

.table-header {
  display: flex;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.header-cell {
  flex: 1;
  font-size: 12px;
  font-weight: bold;
  color: #333;
  text-align: center;
  min-width: 80px;
}

.table-row {
  display: flex;
  margin-bottom: 6px;
}

.cell {
  flex: 1;
  font-size: 12px;
  color: #666;
  text-align: center;
  min-width: 80px;
  padding: 4px;
}

.validation-section {
  margin-bottom: 20px;
}

.validation-item {
  margin-bottom: 8px;
}

.validation-text {
  font-size: 14px;
}

.validation-text.error {
  color: #ff3b30;
}

.validation-text.warning {
  color: #ff9500;
}

.actions {
  display: flex;
  gap: 12px;
}

.import-btn, .continue-btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
}

.import-btn {
  background: #34c759;
  color: white;
}

.import-btn[disabled] {
  background: #ccc;
}

.continue-btn {
  background: #ff9500;
  color: white;
}

.continue-btn[disabled] {
  background: #ccc;
}

.tips {
  background: #e3f2fd;
  border-radius: 8px;
  padding: 16px;
}

.tip-text {
  font-size: 14px;
  font-weight: bold;
  color: #1976d2;
  display: block;
  margin-bottom: 8px;
}

.tip-item {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 4px;
}
</style>
