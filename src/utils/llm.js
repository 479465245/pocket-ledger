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
  return {
    ...DEFAULT_LLM_CONFIG,
    ...(stored || {})
  }
}

export const saveLlmConfig = (config = {}) => {
  const nextConfig = {
    ...DEFAULT_LLM_CONFIG,
    ...config,
    baseUrl: String(config.baseUrl || DEFAULT_LLM_CONFIG.baseUrl).trim().replace(/\/+$/g, ''),
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

const normalizeLlmError = (error, status) => {
  if (status === 401 || status === 403) return new Error('AI 鉴权失败，请检查 API Key')
  if (status) return new Error(`AI 请求失败：HTTP ${status}`)
  if (error instanceof TypeError) return new Error('请求被浏览器拦截，请确认 AI 服务或中转站允许 H5 跨域访问')
  return error
}

export const createChatCompletion = async ({
  config = getLlmConfig(),
  messages = [],
  temperature,
  maxTokens
} = {}) => {
  const validationError = validateLlmConfig(config)
  if (validationError) throw new Error(validationError)
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('AI 消息不能为空')

  let response
  try {
    response = await fetch(buildChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
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

  if (!response.ok) throw normalizeLlmError(new Error('AI 请求失败'), response.status)

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 服务响应格式不符合 OpenAI 接口规范')
  return content
}

export const testLlmConnection = async (config = getLlmConfig()) => {
  return createChatCompletion({
    config,
    messages: [
      { role: 'system', content: '你是一个连接测试助手。' },
      { role: 'user', content: '请只回复“连接成功”。' }
    ],
    maxTokens: 20
  })
}
