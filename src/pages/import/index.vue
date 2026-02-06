<template>
  <view class="container">
    <!-- Header -->
    <view class="header">
      <text class="title">数据导入</text>
      <text class="subtitle">支持Excel/CSV格式文件</text>
    </view>

    <!-- Upload Area -->
    <view class="upload-area" @click="chooseFile">
      <view class="upload-icon">📁</view>
      <text class="upload-text">点击选择文件</text>
      <text class="upload-desc">支持 .xlsx, .xls, .csv 格式</text>
      <text class="upload-desc">最大支持 10MB</text>
    </view>

    <!-- File Info -->
    <view v-if="selectedFile" class="file-info">
      <view class="file-item">
        <text class="file-name">{{ selectedFile.name }}</text>
        <text class="file-size">{{ formatFileSize(selectedFile.size) }}</text>
        <view class="file-remove" @click="removeFile">✕</view>
      </view>
    </view>

    <!-- Data Preview -->
    <view v-if="previewData.length > 0" class="preview-section">
      <view class="section-header">
        <text class="section-title">数据预览</text>
        <text class="section-desc">前5行数据</text>
      </view>
      
      <scroll-view scroll-x class="preview-table">
        <view class="table-header">
          <view v-for="(header, index) in tableHeaders" :key="index" class="table-cell header">
            {{ header }}
          </view>
        </view>
        <view v-for="(row, rowIndex) in previewData.slice(0, 5)" :key="rowIndex" class="table-row">
          <view v-for="(cell, cellIndex) in row" :key="cellIndex" class="table-cell">
            {{ cell }}
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Field Mapping -->
    <view v-if="showMapping" class="mapping-section">
      <view class="section-header">
        <text class="section-title">字段映射</text>
        <text class="section-desc">请确认或调整字段对应关系</text>
      </view>
      
      <view class="mapping-list">
        <view v-for="(field, index) in requiredFields" :key="index" class="mapping-item">
          <view class="field-required">
            <text class="field-name">{{ field.label }}</text>
            <text class="required-mark">*</text>
          </view>
          <picker 
            mode="selector" 
            :range="availableColumns" 
            :value="getMappingValue(field.key)" 
            @change="(e) => updateMapping(field.key, e.detail.value)"
            class="field-picker"
          >
            <view class="picker-content">
              <text :class="['picker-text', fieldMappings[field.key] ? '' : 'placeholder']">
                {{ fieldMappings[field.key] || '请选择对应列' }}
              </text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- Import Button -->
    <view class="bottom-section">
      <view v-if="importResult" class="result-info" :class="importResult.success ? 'success' : 'error'">
        <text class="result-text">{{ importResult.message }}</text>
      </view>
      
      <button 
        class="import-btn" 
        @click="startImport" 
        :disabled="!canImport"
        :class="{ disabled: !canImport }"
      >
        开始导入
      </button>
      
      <text class="import-tips">导入前建议备份现有数据</text>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'

const billStore = useBillStore()
const categoryStore = useCategoryStore()
const assetStore = useAssetStore()

// 状态管理
const selectedFile = ref(null)
const fileContent = ref('')
const previewData = ref([])
const tableHeaders = ref([])
const showMapping = ref(false)
const fieldMappings = ref({})
const loading = ref(false)
const loadingText = ref('')
const importResult = ref(null)

// 必需字段定义
const requiredFields = [
  { key: 'date', label: '日期', type: 'date' },
  { key: 'type', label: '类型', type: 'string' },
  { key: 'amount', label: '金额', type: 'number' },
  { key: 'category', label: '分类', type: 'string' },
  { key: 'asset', label: '账户', type: 'string' },
  { key: 'remark', label: '备注', type: 'string', required: false }
]

// 计算属性
const availableColumns = computed(() => {
  return tableHeaders.value
})

const canImport = computed(() => {
  return selectedFile.value && 
         previewData.value.length > 0 && 
         requiredFields.every(field => fieldMappings.value[field.key] || !field.required)
})

// 方法
const chooseFile = () => {
  uni.chooseFile({
    count: 1,
    type: 'all',
    extension: ['.xlsx', '.xls', '.csv'],
    success: (res) => {
      const file = res.tempFiles[0]
      if (file.size > 10 * 1024 * 1024) {
        uni.showToast({ title: '文件大小不能超过10MB', icon: 'none' })
        return
      }
      selectedFile.value = file
      readFile(file)
    },
    fail: (err) => {
      console.error('选择文件失败:', err)
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    }
  })
}

const readFile = (file) => {
  loading.value = true
  loadingText.value = '正在读取文件...'
  
  // 读取文件内容
  const fileReader = new FileReader()
  fileReader.onload = (e) => {
    fileContent.value = e.target.result
    parseFileContent()
  }
  fileReader.onerror = () => {
    loading.value = false
    uni.showToast({ title: '文件读取失败', icon: 'none' })
  }
  fileReader.readAsText(file)
}

const parseFileContent = () => {
  try {
    const content = fileContent.value
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      loading.value = false
      uni.showToast({ title: '文件格式错误：至少需要标题行和一行数据', icon: 'none' })
      return
    }
    
    // 解析CSV格式
    const headers = parseCSVLine(lines[0])
    const data = []
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i])
      if (row.length === headers.length) {
        data.push(row)
      }
    }
    
    tableHeaders.value = headers
    previewData.value = data
    showMapping.value = true
    
    // 自动字段映射
    autoMapping(headers)
    
    loading.value = false
  } catch (error) {
    loading.value = false
    console.error('解析文件失败:', error)
    uni.showToast({ title: '文件解析失败', icon: 'none' })
  }
}

const parseCSVLine = (line) => {
  // 简单的CSV解析，支持引号包裹的字段
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

const autoMapping = (headers) => {
  const mapping = {}
  
  requiredFields.forEach(field => {
    const matchedHeader = headers.find(header => {
      const headerLower = header.toLowerCase()
      const fieldLower = field.label.toLowerCase()
      return headerLower.includes(fieldLower) || fieldLower.includes(headerLower)
    })
    
    if (matchedHeader) {
      mapping[field.key] = matchedHeader
    }
  })
  
  fieldMappings.value = mapping
}

const getMappingValue = (fieldKey) => {
  const value = fieldMappings.value[fieldKey]
  return value ? availableColumns.value.indexOf(value) : -1
}

const updateMapping = (fieldKey, columnIndex) => {
  if (columnIndex >= 0) {
    fieldMappings.value[fieldKey] = availableColumns.value[columnIndex]
  } else {
    delete fieldMappings.value[fieldKey]
  }
}

const removeFile = () => {
  selectedFile.value = null
  fileContent.value = ''
  previewData.value = []
  tableHeaders.value = []
  showMapping.value = false
  fieldMappings.value = {}
  importResult.value = null
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const startImport = async () => {
  if (!canImport.value) {
    uni.showToast({ title: '请完成字段映射', icon: 'none' })
    return
  }
  
  loading.value = true
  loadingText.value = '正在导入数据...'
  
  try {
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    // 获取所有数据
    const allData = previewData.value
    
    for (let i = 0; i < allData.length; i++) {
      try {
        const row = allData[i]
        const billData = await parseRowData(row, i)
        
        if (billData) {
          await billStore.addBill(billData)
          successCount++
        }
      } catch (error) {
        errorCount++
        errors.push(`第${i + 1}行: ${error.message}`)
        console.error(`导入第${i + 1}行失败:`, error)
      }
    }
    
    loading.value = false
    
    // 显示结果
    const message = `导入完成！成功: ${successCount}条，失败: ${errorCount}条`
    importResult.value = {
      success: errorCount === 0,
      message: message,
      errors: errors
    }
    
    if (errorCount > 0) {
      uni.showModal({
        title: '导入结果',
        content: message + '\n\n失败详情:\n' + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : ''),
        showCancel: false
      })
    } else {
      uni.showToast({ title: '导入成功！', icon: 'success' })
    }
    
  } catch (error) {
    loading.value = false
    console.error('导入失败:', error)
    uni.showToast({ title: '导入失败: ' + error.message, icon: 'none' })
  }
}

const parseRowData = async (row, rowIndex) => {
  const data = {}
  
  // 构建行数据