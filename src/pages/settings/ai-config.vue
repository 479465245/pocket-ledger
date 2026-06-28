<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">AI 配置</text>
      <text class="subtitle">配置兼容 OpenAI Chat Completions 的服务。API Key 仅保存在本机。</text>
    </view>

    <view class="card">
      <view class="section switch-row">
        <view>
          <text class="label">启用 AI 功能</text>
          <text class="hint">关闭后 AI 助手和 PDF AI 识别不可用。</text>
        </view>
        <switch :checked="form.enabled" color="#FF8D5D" @change="form.enabled = $event.detail.value" />
      </view>

      <view class="section">
        <text class="label">API 地址</text>
        <input class="input" v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
        <text class="hint">填写到 /v1，应用会自动拼接 /chat/completions。</text>
      </view>

      <view class="section">
        <text class="label">API Key</text>
        <input class="input" v-model="form.apiKey" password placeholder="sk-..." />
      </view>

      <view class="section">
        <text class="label">模型名称</text>
        <input class="input" v-model="form.model" placeholder="gpt-4o-mini" />
      </view>

      <view class="section two-cols">
        <view class="field-item">
          <text class="label">Temperature</text>
          <input class="input" type="digit" v-model="form.temperature" placeholder="0.2" />
        </view>
        <view class="field-item">
          <text class="label">Max Tokens</text>
          <input class="input" type="number" v-model="form.maxTokens" placeholder="2000" />
        </view>
      </view>

      <view class="notice">
        <text>AI 功能会把你选择的账本摘要、PDF 提取文本或页面图片发送到当前配置的模型服务。AI 结果仅作辅助，不会直接修改账本。</text>
      </view>

      <button class="primary-btn" :disabled="loading" @click="saveConfig">保存配置</button>
      <button class="secondary-btn" :disabled="loading" @click="testConfig">测试连接</button>
    </view>
  </scroll-view>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLlmConfig, saveLlmConfig, testLlmConnection, validateLlmConfig } from '@/utils/llm'
import { usePageShare } from '@/utils/share'

usePageShare({ title: 'AI 配置 - 记账本', path: '/pages/settings/index' })

const loading = ref(false)
const form = reactive({
  enabled: false,
  baseUrl: '',
  apiKey: '',
  model: '',
  temperature: 0.2,
  maxTokens: 2000
})

const loadConfig = () => {
  Object.assign(form, getLlmConfig())
}

onShow(() => {
  loadConfig()
})

const saveConfig = () => {
  const saved = saveLlmConfig(form)
  Object.assign(form, saved)
  uni.showToast({ title: '已保存', icon: 'success' })
}

const testConfig = async () => {
  const config = saveLlmConfig(form)
  Object.assign(form, config)
  const validationError = validateLlmConfig(config)
  if (validationError) {
    uni.showToast({ title: validationError, icon: 'none' })
    return
  }

  loading.value = true
  uni.showLoading({ title: '测试中...' })
  try {
    await testLlmConnection(config)
    uni.showToast({ title: '连接成功', icon: 'success' })
  } catch (error) {
    console.error(error)
    uni.showToast({ title: error.message || '连接失败', icon: 'none' })
  } finally {
    loading.value = false
    uni.hideLoading()
  }
}
</script>

<style scoped>
.container { min-height: 100vh; padding: 20px; box-sizing: border-box; background: linear-gradient(180deg, #FFF9F0 0%, #FFF3E7 100%); }
.header { margin-bottom: 18px; padding: 4px 2px; }
.title { display: block; font-size: 25px; font-weight: 800; color: var(--color-text, #333); margin-bottom: 8px; }
.subtitle, .hint { display: block; font-size: 13px; line-height: 20px; color: var(--color-text-light, #777); }
.card { padding: 18px; border-radius: 24px; background: rgba(255,249,240,.96); box-shadow: 8px 8px 18px rgba(217,212,204,.78), -8px -8px 18px rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.65); }
.section { margin-bottom: 18px; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.label { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 800; color: #333; }
.input { min-height: 46px; padding: 0 14px; border-radius: 15px; background: rgba(255,255,255,.72); color: #333; box-shadow: inset 3px 3px 8px rgba(217,212,204,.62), inset -3px -3px 8px rgba(255,255,255,.86); }
.two-cols { display: flex; gap: 12px; }
.field-item { flex: 1; min-width: 0; }
.notice { margin-bottom: 18px; padding: 13px; border-radius: 14px; background: rgba(255,255,255,.68); color: #777; font-size: 13px; line-height: 20px; }
.primary-btn, .secondary-btn { width: 100%; min-height: 46px; border: 0; border-radius: 15px; font-size: 15px; font-weight: 800; background: var(--color-primary, #FF8D5D); color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 5px 5px 12px rgba(217,125,82,.22), -5px -5px 12px rgba(255,255,255,.8); }
.secondary-btn { margin-top: 10px; background: #fff3e7; color: #333; }
.primary-btn[disabled], .secondary-btn[disabled] { opacity: .55; }
</style>
