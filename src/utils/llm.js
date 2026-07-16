export const LLM_CONFIG_KEY = 'llm_config'

export const DEFAULT_LLM_CONFIG = {
  enabled: false,
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 2000,
  updatedAt: 0
}

const parseStoredConfig = (stored) => {
  if (!stored) return null
  try {
    return typeof stored === 'string' ? JSON.parse(stored) : stored
  } catch (error) {
    console.error('解析 AI 配置失败:', error)
    return null
  }
}

export const getLlmConfig = () => {
  const stored = parseStoredConfig(uni.getStorageSync(LLM_CONFIG_KEY))
  return { ...DEFAULT_LLM_CONFIG, ...(stored || {}) }
}

export const saveLlmConfig = (config = {}) => {
  const nextConfig = {
    ...DEFAULT_LLM_CONFIG,
    ...config,
    apiKey: String(config.apiKey || '').trim(),
    model: String(config.model || '').trim(),
    temperature: Number(config.temperature ?? DEFAULT_LLM_CONFIG.temperature),
    maxTokens: Number(config.maxTokens ?? DEFAULT_LLM_CONFIG.maxTokens),
    updatedAt: Date.now()
  }
  uni.setStorageSync(LLM_CONFIG_KEY, JSON.stringify(nextConfig))
  return nextConfig
}

export const validateLlmConfig = (config = getLlmConfig()) => {
  if (!config.enabled) return '请先启用 AI 功能'
  if (!config.baseUrl) return '请输入 AI 服务地址'
  if (!/^https?:\/\//i.test(config.baseUrl)) return 'AI 服务地址必须以 http:// 或 https:// 开头'
  if (!config.apiKey) return '请输入 API Key'
  if (!config.model) return '请输入模型名称'
  if (Number.isNaN(Number(config.temperature))) return 'Temperature 必须是数字'
  if (Number.isNaN(Number(config.maxTokens)) || Number(config.maxTokens) <= 0) return 'Max Tokens 必须大于 0'
  return ''
}

const buildChatCompletionsUrl = (baseUrl) => `${String(baseUrl || '').replace(/\/+$/g, '')}/chat/completions`
const buildPollUrl = (baseUrl, job) => {
  const explicitUrl = job?.pollUrl || job?.status_url || job?.statusUrl || job?.url
  if (explicitUrl) return explicitUrl
  const id = job?.id || job?.task_id || job?.taskId
  return id ? `${String(baseUrl || '').replace(/\/+$/g, '')}/chat/completions/${encodeURIComponent(id)}` : ''
}

const normalizeLlmError = (error, status) => {
  if (status === 401 || status === 403) return new Error('AI 鉴权失败，请检查 API Key')
  if (status) return new Error(`AI 请求失败：HTTP ${status}`)
  if (error instanceof TypeError) return new Error('请求被浏览器拦截，请确认 AI 服务或中转站允许 H5 跨域访问')
  return error instanceof Error ? error : new Error(String(error || 'AI 请求失败'))
}

const sleep = (milliseconds, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(Object.assign(new Error('请求已取消'), { name: 'AbortError' })); return }
  const timer = setTimeout(resolve, milliseconds)
  signal?.addEventListener('abort', () => { clearTimeout(timer); reject(Object.assign(new Error('请求已取消'), { name: 'AbortError' })) }, { once: true })
})

const getStatus = (data) => String(
  data?.status || data?.state || data?.data?.status || data?.task?.status || ''
).toLowerCase()

const isPendingStatus = (status) => ['queued', 'pending', 'processing', 'running', 'in_progress', 'in-progress', 'submitted'].includes(status)
const isFailedStatus = (status) => ['failed', 'error', 'cancelled', 'canceled', 'expired'].includes(status)

const getCompletionContent = (data) => {
  if (data?.choices?.[0]?.message?.content != null) return data.choices[0].message.content
  if (data?.data?.choices?.[0]?.message?.content != null) return data.data.choices[0].message.content
  if (data?.choices?.[0]?.message?.images?.length) return { text: data.choices[0].message.content || '', images: data.choices[0].message.images }
  if (data?.data?.choices?.[0]?.message?.images?.length) return { text: data.data.choices[0].message.content || '', images: data.data.choices[0].message.images }
  if (data?.images?.length) return { images: data.images }
  if (data?.output?.content != null) return data.output.content
  if (data?.data?.output?.content != null) return data.data.output.content
  if (data?.output != null && (typeof data.output === 'string' || Array.isArray(data.output))) return data.output
  if (data?.content != null && (typeof data.content === 'string' || Array.isArray(data.content))) return data.content
  return null
}

const readJsonResponse = async (response) => {
  let data
  try {
    data = await response.json()
  } catch (error) {
    throw new Error('AI 服务返回了无法解析的结果')
  }
  if (!response.ok) {
    const detail = data?.error?.message || data?.message
    throw normalizeLlmError(new Error(detail || 'AI 请求失败'), response.status)
  }
  return data
}

const isAsyncJob = (data) => {
  if (getCompletionContent(data) != null) return false
  const status = getStatus(data)
  return Boolean(buildPollUrl('', data) || data?.id || data?.task_id || data?.taskId) && (isPendingStatus(status) || !status)
}

const pollCompletion = async ({ config, initialData, interval = 1600, timeout = 120000, onPoll, signal }) => {
  const pollUrl = buildPollUrl(config.baseUrl, initialData)
  if (!pollUrl) throw new Error('AI 服务未返回可轮询的任务地址')
  const startedAt = Date.now()
  let latest = initialData

  while (Date.now() - startedAt < timeout) {
    const status = getStatus(latest)
    if (isFailedStatus(status)) throw new Error(latest?.error?.message || latest?.message || 'AI 对话处理失败')
    const content = getCompletionContent(latest)
    if (content != null) return content
    if (typeof onPoll === 'function') onPoll({ status: status || 'pending', elapsed: Date.now() - startedAt })
    await sleep(interval, signal)
    let response
    try {
      response = await fetch(pollUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal
      })
    } catch (error) {
      throw normalizeLlmError(error)
    }
    latest = await readJsonResponse(response)
  }
  throw new Error('AI 对话轮询超时，请稍后重试')
}

export const createChatCompletion = async ({
  config = getLlmConfig(),
  messages = [],
  temperature,
  maxTokens,
  pollInterval = 1600,
  pollTimeout = 120000,
  onPoll,
  signal
} = {}) => {
  const validationError = validateLlmConfig(config)
  if (validationError) throw new Error(validationError)
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('AI 消息不能为空')

  let response
  try {
    response = await fetch(buildChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: Number(temperature ?? config.temperature ?? DEFAULT_LLM_CONFIG.temperature),
        max_tokens: Number(maxTokens ?? config.maxTokens ?? DEFAULT_LLM_CONFIG.maxTokens)
      })
    })
  } catch (error) {
    throw normalizeLlmError(error)
  }

  const data = await readJsonResponse(response)
  const immediateContent = getCompletionContent(data)
  if (immediateContent != null) return immediateContent
  if (isAsyncJob(data)) {
    return pollCompletion({
      config,
      initialData: data,
      interval: pollInterval,
      timeout: pollTimeout,
      onPoll,
      signal
    })
  }
  throw new Error('AI 服务响应格式不符合 OpenAI 接口规范')
}

/** 将 uni-app 临时图片路径转换为可发送给视觉模型的 data URL。 */
export const readImageAsDataUrl = async (filePath, mimeType = 'image/jpeg') => {
  if (!filePath) throw new Error('图片路径为空')
  if (/^data:image\//i.test(filePath)) return filePath

  if (typeof fetch === 'function' && typeof FileReader !== 'undefined') {
    try {
      const blob = await fetch(filePath).then((response) => {
        if (!response.ok) throw new Error('读取图片失败')
        return response.blob()
      })
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('读取图片失败'))
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.warn('通过浏览器读取图片失败，尝试使用本地文件系统:', error)
    }
  }

  return new Promise((resolve, reject) => {
    const fileSystem = typeof uni !== 'undefined' && uni.getFileSystemManager ? uni.getFileSystemManager() : null
    if (!fileSystem) {
      resolve(filePath)
      return
    }
    fileSystem.readFile({
      filePath,
      encoding: 'base64',
      success: (result) => resolve(`data:${mimeType};base64,${result.data}`),
      fail: () => reject(new Error('读取图片失败，请重新选择图片'))
    })
  })
}

const isSafeImageUrl = (value) => /^data:image\//i.test(value) || /^https?:\/\//i.test(value)

/** 把文本、视觉模型 content 数组和常见图片字段统一为可渲染消息。 */
export const parseAssistantContent = (content) => {
  const images = []
  const textParts = []
  const addImage = (value) => {
    const url = typeof value === 'string' ? value : value?.url || value?.image_url?.url || value?.imageUrl
    if (url && isSafeImageUrl(url) && !images.includes(url)) images.push(url)
  }
  const addPart = (part) => {
    if (part == null) return
    if (typeof part === 'string') {
      const markdown = /!\[[^\]]*\]\(([^)]+)\)/g
      let last = 0
      let match
      while ((match = markdown.exec(part))) {
        textParts.push(part.slice(last, match.index))
        addImage(match[1].trim().replace(/^<|>$/g, ''))
        last = markdown.lastIndex
      }
      const remainder = part.slice(last)
      const imageUrl = /((?:https?:\/\/|data:image\/)[^\s)"']+)/gi
      let imageMatch
      let textLast = 0
      while ((imageMatch = imageUrl.exec(remainder))) {
        const candidate = imageMatch[1].replace(/[.,;!?]+$/, '')
        if (/^data:image\//i.test(candidate) || /\.(?:png|jpe?g|gif|webp|svg)(?:\?|$)/i.test(candidate) || /\/images?\//i.test(candidate)) {
          textParts.push(remainder.slice(textLast, imageMatch.index))
          addImage(candidate)
          textLast = imageUrl.lastIndex
        }
      }
      textParts.push(remainder.slice(textLast))
      return
    }
    if (Array.isArray(part)) {
      part.forEach(addPart)
      return
    }
    if (part.type === 'image_url' || part.type === 'image' || part.image_url || part.imageUrl) {
      addImage(part)
      return
    }
    if (part.type === 'text' || part.text != null) addPart(part.text)
    if (part.images) part.images.forEach(addImage)
  }
  addPart(content)
  return { text: textParts.join('').replace(/\n{3,}/g, '\n\n').trim(), images }
}

export const testLlmConnection = async (config = getLlmConfig()) => createChatCompletion({
  config,
  messages: [
    { role: 'system', content: '你是一个连接测试助手。' },
    { role: 'user', content: '请只回复“连接成功”。' }
  ],
  maxTokens: 20
})
