<template>
  <scroll-view scroll-y class="container">
    <view class="header">
      <text class="title">AI 助手</text>
      <text class="subtitle">基于本地聚合摘要进行账本分析，不会直接修改账单、资产或分类。</text>
    </view>

    <view class="card">
      <view class="section two-cols">
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

      <view class="section">
        <text class="label">想问什么</text>
        <textarea class="textarea" v-model="question" maxlength="300" placeholder="例如：这个时间段的收支有什么异常？" />
      </view>

      <view class="quick-list">
        <button v-for="item in quickQuestions" :key="item" class="quick-btn" @click="question = item">{{ item }}</button>
      </view>

      <view class="summary-box">
        <text>将发送：{{ contextPreview }}</text>
      </view>

      <button class="primary-btn" :disabled="loading" @click="generateAnalysis">{{ loading ? '分析中...' : '生成分析' }}</button>
      <button class="secondary-btn" @click="goConfig">AI 配置</button>
    </view>

    <view v-if="answer" class="answer-card">
      <text class="answer-title">分析结果</text>
      <text class="answer-text">{{ answer }}</text>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { createChatCompletion, getLlmConfig, validateLlmConfig } from '@/utils/llm'
import { buildBillAnalysisContext } from '@/utils/llmContext'
import { usePageShare } from '@/utils/share'

usePageShare({ title: 'AI 助手 - 记账本', path: '/pages/assistant/index' })

const billStore = useBillStore()
const assetStore = useAssetStore()
const categoryStore = useCategoryStore()
const today = new Date().toISOString().slice(0, 10)

const startDate = ref(today.slice(0, 8) + '01')
const endDate = ref(today)
const question = ref('这个时间段的收支有什么异常？')
const answer = ref('')
const loading = ref(false)

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

const goConfig = () => {
  uni.navigateTo({ url: '/pages/settings/ai-config' })
}

const generateAnalysis = async () => {
  if (!question.value.trim()) {
    uni.showToast({ title: '请输入问题', icon: 'none' })
    return
  }
  if (new Date(startDate.value) > new Date(endDate.value)) {
    uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
    return
  }

  const config = getLlmConfig()
  const validationError = validateLlmConfig(config)
  if (validationError) {
    uni.showToast({ title: validationError, icon: 'none' })
    return
  }

  loading.value = true
  answer.value = ''
  uni.showLoading({ title: '分析中...' })
  try {
    const content = await createChatCompletion({
      config,
      messages: [
        {
          role: 'system',
          content: '你是一个本地记账应用的数据分析助手。只能基于用户提供的账本摘要分析，不要编造不存在的账单，不要建议直接修改数据。输出中文，重点指出趋势、异常和可执行建议。'
        },
        {
          role: 'user',
          content: `用户问题：${question.value.trim()}\n\n账本摘要 JSON：\n${JSON.stringify(analysisContext.value, null, 2)}`
        }
      ]
    })
    answer.value = content
  } catch (error) {
    console.error(error)
    uni.showToast({ title: error.message || '分析失败', icon: 'none' })
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
.subtitle { display: block; font-size: 13px; line-height: 20px; color: var(--color-text-light, #777); }
.card, .answer-card { padding: 18px; border-radius: 24px; background: rgba(255,249,240,.96); box-shadow: 8px 8px 18px rgba(217,212,204,.78), -8px -8px 18px rgba(255,255,255,.9); border: 1px solid rgba(255,255,255,.65); }
.answer-card { margin-top: 18px; }
.section { margin-bottom: 18px; }
.two-cols { display: flex; gap: 12px; }
.date-item { flex: 1; min-width: 0; }
.label { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 800; color: #333; }
.picker-box, .textarea { min-height: 46px; padding: 0 14px; border-radius: 15px; background: rgba(255,255,255,.72); color: #333; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: inset 3px 3px 8px rgba(217,212,204,.62), inset -3px -3px 8px rgba(255,255,255,.86); }
.textarea { width: 100%; min-height: 118px; padding: 12px 14px; box-sizing: border-box; text-align: left; line-height: 20px; }
.quick-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.quick-btn { min-height: 34px; padding: 0 10px; border: 0; border-radius: 12px; background: #fff3e7; color: #333; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.summary-box { margin-bottom: 18px; padding: 12px; border-radius: 14px; background: rgba(255,255,255,.68); color: #777; font-size: 13px; line-height: 20px; }
.primary-btn, .secondary-btn { width: 100%; min-height: 46px; border: 0; border-radius: 15px; font-size: 15px; font-weight: 800; background: var(--color-primary, #FF8D5D); color: #fff; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 5px 5px 12px rgba(217,125,82,.22), -5px -5px 12px rgba(255,255,255,.8); }
.secondary-btn { margin-top: 10px; background: #fff3e7; color: #333; }
.primary-btn[disabled] { opacity: .55; }
.answer-title { display: block; margin-bottom: 12px; font-size: 17px; font-weight: 800; color: #333; }
.answer-text { display: block; white-space: pre-wrap; color: #333; font-size: 14px; line-height: 22px; }
</style>
