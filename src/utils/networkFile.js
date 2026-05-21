const STORAGE_KEY = 'network_file_configs'

const isH5 = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const safeParse = (value, fallback = []) => {
  try {
    if (!value) return fallback
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch (error) {
    console.error('解析网络文件配置失败:', error)
    return fallback
  }
}

export const getNetworkFileConfigs = () => {
  const stored = uni.getStorageSync(STORAGE_KEY)
  const configs = safeParse(stored, [])
  return Array.isArray(configs) ? configs : []
}

export const saveNetworkFileConfigs = (configs = []) => {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(configs))
}

export const upsertNetworkFileConfig = (config) => {
  const configs = getNetworkFileConfigs()
  const now = Date.now()
  const nextConfig = {
    id: config.id || `network-file-${now}`,
    name: String(config.name || '').trim(),
    downloadUrl: String(config.downloadUrl || '').trim(),
    uploadUrl: String(config.uploadUrl || '').trim(),
    updatedAt: now,
    createdAt: config.createdAt || now
  }

  const index = configs.findIndex(item => item.id === nextConfig.id)
  if (index >= 0) {
    configs.splice(index, 1, nextConfig)
  } else {
    configs.unshift(nextConfig)
  }

  saveNetworkFileConfigs(configs)
  return nextConfig
}

export const deleteNetworkFileConfig = (id) => {
  saveNetworkFileConfigs(getNetworkFileConfigs().filter(item => item.id !== id))
}

export const validateNetworkFileConfig = (config, type = 'download') => {
  if (!config) return '请选择网络文件配置'
  if (type === 'download' && !config.downloadUrl) return '该配置没有下载地址'
  if (type === 'upload' && !config.uploadUrl) return '该配置没有上传地址'
  return ''
}

export const chooseNetworkFileConfig = (type = 'download') => {
  const configs = getNetworkFileConfigs()
  const available = configs.filter(config => type === 'upload' ? config.uploadUrl : config.downloadUrl)

  return new Promise((resolve, reject) => {
    if (!available.length) {
      reject(new Error(type === 'upload' ? '请先在设置中配置上传地址' : '请先在设置中配置下载地址'))
      return
    }

    uni.showActionSheet({
      itemList: available.map(config => config.name || '未命名配置'),
      success: (res) => resolve(available[res.tapIndex]),
      fail: () => reject(new Error('已取消选择'))
    })
  })
}

const getFileNameFromUrl = (url = '') => {
  const cleanUrl = url.split('?')[0]
  const name = decodeURIComponent(cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) || '')
  return name || `网络文件_${Date.now()}.xls`
}

export const downloadNetworkFile = async (config) => {
  const message = validateNetworkFileConfig(config, 'download')
  if (message) throw new Error(message)

  if (isH5()) {
    const response = await fetch(config.downloadUrl)
    if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`)
    const blob = await response.blob()
    const fileName = getFileNameFromUrl(config.downloadUrl)
    return new File([blob], fileName, { type: blob.type || 'application/octet-stream' })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: config.downloadUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`下载失败：HTTP ${res.statusCode}`))
          return
        }
        resolve({
          name: getFileNameFromUrl(config.downloadUrl),
          size: res.data?.byteLength || 0,
          arrayBuffer: res.data
        })
      },
      fail: (error) => reject(new Error(error.errMsg || '下载失败'))
    })
  })
}

export const readFileAsArrayBuffer = (file) => {
  if (file?.arrayBuffer) {
    return typeof file.arrayBuffer === 'function'
      ? file.arrayBuffer()
      : Promise.resolve(file.arrayBuffer)
  }

  if (isH5()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => resolve(event.target.result)
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    fs.readFile({
      filePath: file.path || file.tempFilePath,
      success: (res) => resolve(res.data),
      fail: () => reject(new Error('读取文件失败'))
    })
  })
}

export const uploadNetworkFile = async (config, fileName, content) => {
  const message = validateNetworkFileConfig(config, 'upload')
  if (message) throw new Error(message)

  if (isH5()) {
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const formData = new FormData()
    formData.append('file', blob, fileName)
    const response = await fetch(config.uploadUrl, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error(`上传失败：HTTP ${response.status}`)
    return response
  }

  const filePath = `${uni.env.USER_DATA_PATH}/${fileName}`
  const fs = uni.getFileSystemManager()
  await new Promise((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: content,
      encoding: 'utf8',
      success: resolve,
      fail: () => reject(new Error('生成上传文件失败'))
    })
  })

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: config.uploadUrl,
      filePath,
      name: 'file',
      formData: { fileName },
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`上传失败：HTTP ${res.statusCode}`))
          return
        }
        resolve(res)
      },
      fail: (error) => reject(new Error(error.errMsg || '上传失败'))
    })
  })
}
