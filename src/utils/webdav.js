const STORAGE_KEY = 'webdav_configs'

const safeParse = (value, fallback = []) => {
  try {
    if (!value) return fallback
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch (error) {
    console.error('解析 WebDAV 配置失败:', error)
    return fallback
  }
}

const trimSlashes = (value = '') => String(value).replace(/^\/+|\/+$/g, '')

const normalizeBaseUrl = (url = '') => String(url || '').trim().replace(/\/+$/g, '')

const normalizeDirectory = (directory = '') => trimSlashes(directory)

const encodePath = (path = '') => trimSlashes(path).split('/').filter(Boolean).map(encodeURIComponent).join('/')

const isH5 = () => typeof window !== 'undefined' && typeof document !== 'undefined' && typeof fetch === 'function'

const toBase64 = (value) => {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(value)))
  if (typeof Buffer !== 'undefined') return Buffer.from(value).toString('base64')
  throw new Error('当前平台不支持生成认证信息')
}

const buildAuthHeader = (config) => {
  if (!config.username && !config.password) return ''
  return `Basic ${toBase64(`${config.username || ''}:${config.password || ''}`)}`
}

const buildHeaders = (config, extra = {}) => {
  const headers = { ...extra }
  const auth = buildAuthHeader(config)
  if (auth) headers.Authorization = auth
  return headers
}

const logWebDavRequest = ({ method = 'GET', url, config, headers = {} }) => {
  console.info('[WebDAV]', method, url, {
    username: config?.username || '',
    hasPassword: Boolean(config?.password),
    hasAuthorization: Boolean(headers.Authorization)
  })
}

const normalizeFetchError = (error) => {
  if (error instanceof TypeError) {
    return new Error('请求被浏览器拦截，请确认 WebDAV 服务端已允许 H5 跨域访问')
  }
  return error
}

const buildStatusError = (status, action = '请求') => {
  if (status === 401) return new Error('WebDAV 认证失败，请检查用户名、密码或应用授权码')
  if (status === 403) return new Error('WebDAV 无访问权限，请检查账号权限或远程目录权限')
  return new Error(`${action}失败：HTTP ${status}`)
}

export const buildWebDavUrl = (config, fileName = '') => {
  const parts = [normalizeDirectory(config.directory)]
  if (fileName) parts.push(fileName)
  const path = encodePath(parts.filter(Boolean).join('/'))
  return path ? `${normalizeBaseUrl(config.url)}/${path}` : `${normalizeBaseUrl(config.url)}/`
}

export const getWebDavConfigs = () => {
  const configs = safeParse(uni.getStorageSync(STORAGE_KEY), [])
  return Array.isArray(configs) ? configs : []
}

export const saveWebDavConfigs = (configs = []) => {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(configs))
}

export const upsertWebDavConfig = (config) => {
  const configs = getWebDavConfigs()
  const now = Date.now()
  const nextConfig = {
    id: config.id || `webdav-${now}`,
    name: String(config.name || '').trim(),
    url: normalizeBaseUrl(config.url),
    directory: normalizeDirectory(config.directory),
    username: String(config.username || '').trim(),
    password: String(config.password || ''),
    updatedAt: now,
    createdAt: config.createdAt || now
  }

  const index = configs.findIndex(item => item.id === nextConfig.id)
  if (index >= 0) {
    configs.splice(index, 1, nextConfig)
  } else {
    configs.unshift(nextConfig)
  }

  saveWebDavConfigs(configs)
  return nextConfig
}

export const deleteWebDavConfig = (id) => {
  saveWebDavConfigs(getWebDavConfigs().filter(item => item.id !== id))
}

export const validateWebDavConfig = (config) => {
  if (!config) return '请选择 WebDAV 配置'
  if (!config.name) return '请输入配置名称'
  if (!config.url) return '请输入 WebDAV 地址'
  if (!/^https?:\/\//i.test(config.url)) return 'WebDAV 地址必须以 http:// 或 https:// 开头'
  return ''
}

const requestText = ({ url, method = 'GET', headers = {}, data }) => {
  if (isH5()) {
    return fetch(url, { method, headers, body: data }).then(async response => {
      const text = await response.text()
      if (!response.ok) throw buildStatusError(response.status, '请求')
      return text
    }).catch(error => { throw normalizeFetchError(error) })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      header: headers,
      data,
      responseType: 'text',
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(buildStatusError(res.statusCode, '请求'))
          return
        }
        resolve(typeof res.data === 'string' ? res.data : String(res.data || ''))
      },
      fail: (error) => reject(new Error(error.errMsg || '请求失败'))
    })
  })
}

const requestArrayBuffer = ({ url, headers = {} }) => {
  if (isH5()) {
    return fetch(url, { method: 'GET', headers }).then(async response => {
      if (!response.ok) throw buildStatusError(response.status, '下载')
      return response.arrayBuffer()
    }).catch(error => { throw normalizeFetchError(error) })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      header: headers,
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(buildStatusError(res.statusCode, '下载'))
          return
        }
        resolve(res.data)
      },
      fail: (error) => reject(new Error(error.errMsg || '下载失败'))
    })
  })
}

const putText = ({ url, headers = {}, content }) => {
  if (isH5()) {
    return fetch(url, { method: 'PUT', headers, body: content }).then(response => {
      if (!response.ok) throw buildStatusError(response.status, '上传')
      return response
    }).catch(error => { throw normalizeFetchError(error) })
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'PUT',
      header: headers,
      data: content,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(buildStatusError(res.statusCode, '上传'))
          return
        }
        resolve(res)
      },
      fail: (error) => reject(new Error(error.errMsg || '上传失败'))
    })
  })
}

const stripXmlTag = (value = '') => value.replace(/<[^>]+>/g, '').trim()

const decodeXml = (value = '') => stripXmlTag(value)
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")

const parsePropfind = (xml = '', config) => {
  const basePath = new URL(buildWebDavUrl(config), 'http://placeholder').pathname.replace(/\/+$/g, '')
  const responses = xml.match(/<[^>]*response[\s\S]*?<\/[^>]*response>/gi) || []

  return responses.map(block => {
    const hrefMatch = block.match(/<[^>]*href[^>]*>([\s\S]*?)<\/[^>]*href>/i)
    if (!hrefMatch) return null
    const href = decodeXml(hrefMatch[1])
    const pathname = new URL(href, 'http://placeholder').pathname.replace(/\/+$/g, '')
    if (pathname === basePath) return null
    const fileName = decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1))
    if (!fileName || !fileName.toLowerCase().endsWith('.json')) return null
    const sizeMatch = block.match(/<[^>]*getcontentlength[^>]*>([\s\S]*?)<\/[^>]*getcontentlength>/i)
    const modifiedMatch = block.match(/<[^>]*getlastmodified[^>]*>([\s\S]*?)<\/[^>]*getlastmodified>/i)
    return {
      name: fileName,
      size: Number(stripXmlTag(sizeMatch?.[1] || 0)),
      modifiedAt: stripXmlTag(modifiedMatch?.[1] || '')
    }
  }).filter(Boolean).sort((a, b) => String(b.name).localeCompare(String(a.name)))
}

export const listWebDavBackupFiles = async (config) => {
  const message = validateWebDavConfig(config)
  if (message) throw new Error(message)
  const url = buildWebDavUrl(config)
  const headers = buildHeaders(config, { Depth: '1' })
  logWebDavRequest({ method: 'PROPFIND', url, config, headers })
  const xml = await requestText({
    url,
    method: 'PROPFIND',
    headers
  })
  return parsePropfind(xml, config)
}

export const uploadWebDavBackup = async (config, fileName, content) => {
  const message = validateWebDavConfig(config)
  if (message) throw new Error(message)
  const url = buildWebDavUrl(config, fileName)
  const headers = buildHeaders(config, { 'Content-Type': 'application/json;charset=utf-8' })
  logWebDavRequest({ method: 'PUT', url, config, headers })
  return putText({
    url,
    headers,
    content
  })
}

export const downloadWebDavBackup = async (config, fileName) => {
  const message = validateWebDavConfig(config)
  if (message) throw new Error(message)
  const url = buildWebDavUrl(config, fileName)
  const headers = buildHeaders(config)
  logWebDavRequest({ method: 'GET', url, config, headers })
  return requestArrayBuffer({
    url,
    headers
  })
}
