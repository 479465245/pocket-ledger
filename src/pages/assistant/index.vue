<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <view class="header-row">
        <view>
          <text class="title">AI 助手</text>
          <text class="subtitle">可以连续追问，也可以把账单截图交给我一起看。</text>
        </view>
        <button v-if="conversation.length" class="clear-btn" @click="clearConversation">清空</button>
      </view>
    </view>

    <view v-if="!conversation.length" class="welcome-card">
      <text class="welcome-title">从你的账本开始</text>
      <text class="welcome-text">我会基于本地聚合摘要分析，不会直接修改账单、资产或分类。</text>
      <view class="quick-list">
        <button v-for="item in quickQuestions" :key="item" class="quick-btn" @click="question = item">{{ item }}</button>
      </view>
    </view>

    <view v-for="(message, index) in conversation" :key="`${message.role}-${index}`" class="message-row" :class="message.role">
      <view class="message-bubble">
        <text v-if="message.role === 'assistant'" class="message-name">AI 助手</text>
        <text v-if="message.text" class="answer-text">{{ message.text }}</text>
        <view v-if="message.images && message.images.length" class="image-grid">
          <image
            v-for="image in message.images"
            :key="image"
            class="message-image"
            :src="image"
            mode="aspectFill"
            @tap="previewImage(image, message.images)"
          />
        </view>
        <view v-if="message.role === 'assistant' && !message.text && !message.images.length" class="answer-text">（模型返回了空内容）</view>
      </view>
    </view>

    <view v-if="loading" class="status-card">
      <view class="loading-dot"></view>
      <text>{{ statusText }}</text>
      <button class="stop-btn" @click="cancelRequest">停止</button>
    </view>

    <view class="card composer-card">
      <view class="date-row">
        <view class="date-item">
          <text class="label">开始日期</text>
          <picker mode="date" :value="startDate" @change="startDate = $event.detail.value">
            <view class="picker-box">{{ startDate }}</view>
          </picker>
        </view>
        <view class="date-item">
          <text class="label">结束日期</text>
          <picker mode="date" :value="endDate" @change="endDate = $event.detail.value">
            <view class="picker-box">{{ endDate }}</view>
          </picker>
        </view>
      </view>

      <textarea
        class="textarea"
        v-model="question"
        maxlength="500"
        placeholder="输入问题，或先添加一张图片..."
        @paste="handlePaste"
      />

      <view v-if="attachments.length" class="attachment-list">
        <view v-for="(item, index) in attachments" :key="item.path" class="attachment-item">
          <image class="attachment-image" :src="item.path" mode="aspectFill" @tap="previewImage(item.path, attachmentPaths)" />
          <button class="remove-btn" @click="removeAttachment(index)">×</button>
        </view>
      </view>

      <view class="tool-row">
        <button class="image-btn" @click="chooseImages">＋ 图片</button>
        <text class="hint">支持 JPG、PNG、WEBP，单张不超过 8MB</text>
      </view>
      <text class="summary-box">将发送：{{ contextPreview }}{{ attachments.length ? `，${attachments.length} 张图片` : '' }}</text>

      <view class="action-row">
        <button class="config-btn" @click="goConfig">AI 配置</button>
        <button class="primary-btn" :disabled="loading" @click="sendMessage">{{ loading ? '处理中...' : '发送' }}</button>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { createChatCompletion, getLlmConfig, parseAssistantContent, readImageAsDataUrl, validateLlmConfig } from '@/utils/llm'
import { buildBillAnalysisContext } from '@/utils/llmContext'
import { usePageShare } from '@/utils/share'

usePageShare({ title: 'AI 助手 - 记账本', path: '/pages/assistant/index' })

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()
const today = new Date().toISOString().slice(0, 10)
const startDate = ref(today.slice(0, 8) + '01')
const endDate = ref(today)
const question = ref('')
const attachments = ref([])
const conversation = ref([])
const loading = ref(false)
const statusText = ref('正在提交对话...')
let activeController = null

const quickQuestions = [
  '这个时间段的收支有什么异常？',
  '哪些分类支出最值得关注？',
  '帮我总结本期现金流情况。'
]

onShow(() => {
  billStore.init()
  assetStore.init()
  categoryStore.init()
})

const analysisContext = computed(() => buildBillAnalysisContext({
  bills: billStore.bills,
  assets: assetStore.assets,
  categories: categoryStore.categories,
  billStore,
  startDate: startDate.value,
  endDate: endDate.value
}))

const contextPreview = computed(() => {
  const summary = analysisContext.value.summary
  return `${summary.billCount} 条统计账单，收入 ${summary.incomeTotal.toFixed(2)}，支出 ${summary.expenseTotal.toFixed(2)}`
})
const attachmentPaths = computed(() => attachments.value.map((item) => item.path))

const goConfig = () => uni.navigateTo({ url: '/pages/settings/ai-config' })

const showError = (message) => uni.showToast({ title: message || '操作失败', icon: 'none' })

const addImageFiles = (files = []) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const next = []
  Array.from(files).slice(0, 3 - attachments.value.length).forEach((file) => {
    const path = file.path || file.tempFilePath || file.url
    const type = file.type || (/\.(png)$/i.test(path) ? 'image/png' : /\.(webp)$/i.test(path) ? 'image/webp' : 'image/jpeg')
    const size = Number(file.size || 0)
    if (!path || (file.type && !allowed.includes(file.type))) return showError('只支持 JPG、PNG、WEBP 或 GIF 图片')
    if (size > 8 * 1024 * 1024) return showError('单张图片不能超过 8MB')
    if (!next.some((item) => item.path === path) && !attachments.value.some((item) => item.path === path)) next.push({ path, type, size })
  })
  attachments.value = attachments.value.concat(next)
  if (files.length > next.length && attachments.value.length >= 3) showError('最多添加 3 张图片')
}

const chooseImages = () => {
  uni.chooseImage({
    count: Math.max(1, 3 - attachments.value.length),
    sizeType: ['compressed', 'original'],
    sourceType: ['album', 'camera'],
    success: ({ tempFiles = [], tempFilePaths = [] }) => addImageFiles(tempFiles.length ? tempFiles : tempFilePaths.map((path) => ({ path })))
  })
}

const handlePaste = (event) => {
  const files = event?.clipboardData?.files
  if (files?.length) addImageFiles(files)
}

const removeAttachment = (index) => attachments.value.splice(index, 1)

const previewImage = (current, urls = []) => uni.previewImage({ current, urls: urls.length ? urls : [current] })

const downloadImage = (url) => {
  if (typeof document !== 'undefined') {
    const link = document.createElement('a')
    link.href = url
    link.download = `ai-image-${Date.now()}.png`
    link.target = '_blank'
    link.click()
    return
  }
  uni.downloadFile({ url, success: (result) => {
    if (result.statusCode === 200 && uni.saveImageToPhotosAlbum) uni.saveImageToPhotosAlbum({ filePath: result.tempFilePath })
  }, fail: () => showError('图片下载失败') })
}

const createUserContent = async (text, items) => {
  const content = [{ type: 'text', text }]
  for (const item of items) {
    const dataUrl = await readImageAsDataUrl(item.path, item.type)
    content.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } })
  }
  return content
}

const sendMessage = async () => {
  const text = question.value.trim()
  if (!text && !attachments.value.length) return showError('请输入问题或添加一张图片')
  if (new Date(startDate.value) > new Date(endDate.value)) return showError('开始日期不能晚于结束日期')

  const config = getLlmConfig()
  const validationError = validateLlmConfig(config)
  if (validationError) return showError(validationError)

  const prompt = `${text || '请分析这张图片'}\n\n账本摘要 JSON：\n${JSON.stringify(analysisContext.value, null, 2)}`
  const localImages = attachments.value.map((item) => item.path)
  loading.value = true
  statusText.value = '正在准备图片和对话...'
  activeController = typeof AbortController !== 'undefined' ? new AbortController() : null
  try {
    const userContent = await createUserContent(prompt, attachments.value)
    conversation.value.push({ role: 'user', text: text || '请分析这张图片', images: localImages, content: userContent })
    question.value = ''
    attachments.value = []
    const messages = [
      { role: 'system', content: '你是一个本地记账应用的数据分析助手。只能基于用户提供的账本摘要和图片分析，不要编造账单，不要直接修改数据。输出中文，重点指出趋势、异常和可执行建议。若生成图片，请返回图片 URL 或 Markdown 图片。' },
      ...conversation.value.map((message) => ({ role: message.role, content: message.content || message.text }))
    ]
    statusText.value = '正在等待模型响应...'
    const content = await createChatCompletion({
      config,
      messages,
      onPoll: ({ status }) => { statusText.value = `模型处理中（${status}）...` },
      signal: activeController?.signal
    })
    const parsed = parseAssistantContent(content)
    conversation.value.push({ role: 'assistant', text: parsed.text, images: parsed.images, content })
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error(error)
      showError(error.message || '分析失败')
    }
  } finally {
    loading.value = false
    activeController = null
  }
}

const cancelRequest = () => {
  activeController?.abort()
  loading.value = false
  statusText.value = '已停止本次对话'
}

const clearConversation = () => {
  if (loading.value) return showError('请先停止当前对话')
  conversation.value = []
}
</script>

<style scoped>
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: linear-gradient(180deg, #FFF9F0 0%, #FFF3E7 100%); }
.header { margin-bottom: 18px; padding: 4px 2px; }
.header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.title { display: block; font-size: 25px; font-weight: 800; color: var(--color-text, #333); margin-bottom: 8px; }
.subtitle { display: block; max-width: 290px; font-size: 13px; line-height: 20px; color: var(--color-text-light, #777); }
.card, .welcome-card, .message-bubble, .status-card { padding: 18px; border-radius: 24px; background: rgba(255,249,240,.96); box-shadow: 8px 8px 18px rgba(217,212,204,.78), -8px -8px 18px rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.65); }
.welcome-card { margin-bottom: 18px; }
.welcome-title { display: block; margin-bottom: 8px; font-size: 18px; font-weight: 800; color: #333; }
.welcome-text { display: block; margin-bottom: 16px; color: #777; font-size: 13px; line-height: 20px; }
.message-row { display: flex; margin-bottom: 14px; }
.message-row.user { justify-content: flex-end; }
.message-row.assistant { justify-content: flex-start; }
.message-bubble { max-width: 88%; padding: 14px 16px; }
.message-row.user .message-bubble { background: #ffe1c8; }
.message-row.assistant .message-bubble { background: rgba(255,249,240,.96); }
.message-name { display: block; margin-bottom: 8px; color: #e17443; font-size: 12px; font-weight: 800; }
.answer-text { display: block; white-space: pre-wrap; color: #333; font-size: 14px; line-height: 22px; }
.status-card { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; padding: 12px 15px; color: #9b684c; font-size: 13px; }
.loading-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff8d5d; animation: pulse 1s infinite ease-in-out; }
.stop-btn, .clear-btn, .remove-btn { border: 0; }
.stop-btn { margin-left: auto; padding: 0 10px; min-height: 30px; border-radius: 10px; background: #fff; color: #d86e45; font-size: 12px; }
.clear-btn { padding: 0 10px; min-height: 30px; border-radius: 10px; background: #fff3e7; color: #b87957; font-size: 12px; }
.composer-card { margin-top: 18px; padding: 16px; }
.date-row { display: flex; gap: 12px; margin-bottom: 16px; }
.date-item { flex: 1; min-width: 0; }
.label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 800; color: #555; }
.picker-box, .textarea { width: 100%; box-sizing: border-box; border-radius: 14px; background: rgba(255,255,255,.72); color: #333; box-shadow: inset 3px 3px 8px rgba(217,212,204,.62), inset -3px -3px 8px rgba(255,255,255,.86); }
.picker-box { padding: 12px; font-size: 13px; }
.textarea { min-height: 100px; padding: 12px 14px; text-align: left; line-height: 20px; }
.quick-list { display: flex; flex-wrap: wrap; gap: 8px; }
.quick-btn { min-height: 34px; padding: 0 10px; border: 0; border-radius: 12px; background: #fff3e7; color: #333; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.attachment-list { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.attachment-item { position: relative; width: 72px; height: 72px; }
.attachment-image, .message-image { border-radius: 12px; background: #f4e8dc; }
.attachment-image { width: 72px; height: 72px; }
.remove-btn { position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; line-height: 20px; padding: 0; border-radius: 50%; background: #6f6259; color: #fff; font-size: 18px; }
.tool-row { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
.image-btn, .config-btn { min-height: 34px; padding: 0 12px; border: 0; border-radius: 11px; background: #fff3e7; color: #9b684c; font-size: 12px; }
.hint { flex: 1; color: #a3968d; font-size: 11px; line-height: 16px; }
.summary-box { display: block; margin: 14px 0; padding: 11px 12px; border-radius: 13px; background: rgba(255,255,255,.68); color: #8c7b70; font-size: 12px; line-height: 18px; }
.action-row { display: flex; align-items: center; gap: 10px; }
.config-btn { flex: 0 0 auto; min-height: 44px; }
.primary-btn { flex: 1; min-height: 44px; border: 0; border-radius: 14px; background: var(--color-primary, #FF8D5D); color: #fff; font-size: 15px; font-weight: 800; box-shadow: 5px 5px 12px rgba(217,125,82,.22), -5px -5px 12px rgba(255,255,255,.8); }
.primary-btn[disabled] { opacity: .55; }
.image-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.message-image { width: 150px; height: 150px; }
@keyframes pulse { 0%, 100% { opacity: .35; transform: scale(.8); } 50% { opacity: 1; transform: scale(1); } }
</style>
