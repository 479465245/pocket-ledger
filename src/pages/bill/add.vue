<template>
  <view class="container">
    <view class="header-tabs">
        <view 
            v-for="t in tabs" 
            :key="t.value" 
            :class="['tab-item', currentTab === t.value ? 'active' : '']"
            @click="switchTab(t.value)"
        >
            {{ t.label }}
        </view>
    </view>

    <!-- Category Grid -->
    <scroll-view scroll-y class="category-area" v-if="currentTab !== 'transfer'" :show-scrollbar="false">
        <view class="section-caption">
            <text class="section-caption-title">选择分类</text>
            <text class="section-caption-value">{{ selectedCategoryName }}</text>
        </view>
        <swiper class="category-swiper" :indicator-dots="categoryPages.length > 1" indicator-color="rgba(74,74,74,.18)" indicator-active-color="#88B194">
            <swiper-item v-for="(page, pageIndex) in categoryPages" :key="pageIndex" class="category-swiper-item">
                <view class="category-page">
                    <view 
                        v-for="cat in page" 
                        :key="cat.id" 
                        class="grid-item"
                        @click="cat.isSetting ? goManageCategories() : selectCategory(cat)"
                    >
                        <view :class="['icon-wrapper', cat.isSetting ? 'setting' : '', selectedCategoryId === cat.id ? 'selected' : '']">
                            <text class="icon-text">{{ cat.isSetting ? '⚙️' : (cat.icon || cat.name[0]) }}</text>
                            <view v-if="!cat.isSetting && cat.children && cat.children.length > 0" class="plus-badge">+</view>
                        </view>
                        <text :class="['cat-name', selectedCategoryId === cat.id ? 'selected-text' : '']">{{ cat.name }}</text>
                    </view>
                </view>
            </swiper-item>
        </swiper>

        <!-- Sub Categories Expansion -->
        <view v-if="subCategories.length > 0" class="sub-category-panel">
            <view class="sub-divider">
                <text class="divider-text">选择子分类</text>
            </view>
            <swiper class="category-swiper sub-swiper" :indicator-dots="subCategoryPages.length > 1" indicator-color="rgba(74,74,74,.18)" indicator-active-color="#88B194">
                <swiper-item v-for="(page, pageIndex) in subCategoryPages" :key="pageIndex" class="category-swiper-item">
                    <view class="category-page">
                        <view 
                            v-for="sub in page" 
                            :key="sub.id" 
                            class="grid-item"
                            @click="selectSubCategory(sub)"
                        >
                            <view :class="['icon-wrapper', form.categoryId === sub.id ? 'selected' : '']">
                                <text class="icon-text">{{ sub.icon || sub.name[0] }}</text>
                            </view>
                            <text :class="['cat-name', form.categoryId === sub.id ? 'selected-text' : '']">{{ sub.name }}</text>
                        </view>
                    </view>
                </swiper-item>
            </swiper>
        </view>
    </scroll-view>

    <!-- Transfer Area -->
    <view class="transfer-area" v-if="currentTab === 'transfer'">
        <view class="transfer-card">
            <view class="transfer-row source-account-row" @click="openAssetPicker('source')">

                <view class="row-label">

                    <text>转出账户</text>

                </view>

                <view class="row-right">

                    <text class="row-value">{{ selectedAssetName }}</text>

                    <text class="chevron">›</text>

                </view>

            </view>



            <view class="transfer-row" @click="openAssetPicker('target')">

                <view class="row-label">

                    <text>转入账户</text>

                </view>

                <view class="row-right">

                    <text class="row-value">{{ assets.find(a => a.id === form.targetAssetId)?.name || '选择账户' }}</text>

                    <text class="chevron">›</text>

                </view>

            </view>



            <view class="transfer-row input-row">

                <view class="row-label">

                    <text>转出金额</text>

                </view>

                <view class="row-right">

                    <input

                        class="fee-input"

                        type="digit"

                        :value="displayAmount"

                        placeholder="转出金额"

                        @input="onAmountInput"

                    />

                    <view class="fee-unit currency-selector" @click="openCurrencyPicker('source')">{{ form.currency }}</view>

                </view>

            </view>

            <view class="transfer-row input-row">
                <view class="row-label">

                    <text>转入金额</text>

                </view>

                <view class="row-right">

                    <input

                        class="fee-input"

                        type="digit"

                        :value="form.targetAmountStr"

                        placeholder="转入金额"

                        @input="onTargetAmountInput"

                    />

                    <view class="fee-unit currency-selector" @click="openCurrencyPicker('target')">{{ form.targetCurrency }}</view>

                </view>

            </view>

            <view v-if="isSameAssetCurrencyConversion" class="transfer-row fx-adjustment-row">
                <view class="row-label">
                    <text>汇兑损益</text>
                </view>
                <view class="fx-mode-options">
                    <view
                        v-for="option in fxGainLossModes"
                        :key="option.value"
                        :class="['fx-mode-option', { active: form.fxGainLossType === option.value }]"
                        @click="form.fxGainLossType = option.value"
                    >
                        {{ option.label }}
                    </view>
                </view>
            </view>

            <view v-if="isSameAssetCurrencyConversion && form.fxGainLossType !== 'none'" class="transfer-row input-row">
                <view class="row-label">
                    <text>{{ form.fxGainLossType === 'gain' ? '收益金额' : '损失金额' }}</text>
                </view>
                <view class="row-right">
                    <input
                        class="fee-input"
                        type="digit"
                        :value="form.fxGainLossAmountStr"
                        placeholder="0.00"
                        @input="onFxGainLossAmountInput"
                    />
                    <text class="fee-unit">CNY</text>
                </view>
            </view>

            

            <!-- 手续费输入 -->

            <view class="transfer-row">

                <view class="row-label">

                    <text>手续费</text>

                </view>

                <view class="row-right">

                    <input 

                        class="fee-input" 

                        type="digit" 

                        v-model="form.fee" 

                        placeholder="0"

                        @input="onFeeInput"

                    />

                    <text class="fee-unit">{{ form.currency }}</text>

                </view>

            </view>
        </view>
    </view>

    <!-- Bottom Panel -->
    <view class="bottom-panel neu-card-top">
        <!-- Amount, Asset, Date, Currency and Stats -->
        <scroll-view scroll-x class="options-scroll" :show-scrollbar="false">
            <view class="options-row">
                <view class="amount-entry" v-if="currentTab !== 'transfer'">
                    <view class="amount-input-wrap">
                        <text class="currency">{{ displayCurrencySymbol }}</text>
                        <input
                            class="amount-input"
                            type="digit"
                            :value="displayAmount"
                            placeholder="0.00"
                            @input="onAmountInput"
                        />
                    </view>
                </view>
                <view class="option-tag" @click="openAssetPicker('source')" v-if="currentTab !== 'transfer'">
                    <text>{{ selectedAssetName }}</text>
                </view>
                <picker class="option-picker" mode="date" :value="form.date" @change="onDateChange">
                    <view class="option-tag">
                        <text>{{ displayDate }}</text>
                    </view>
                </picker>
                <view class="option-tag" @click="openCurrencyPicker('source')" v-if="currentTab !== 'transfer'">
                    <text>{{ form.currency }}</text>
                </view>
                <view class="option-tag" @click="form.isIncludedInStats = !form.isIncludedInStats" v-if="currentTab !== 'transfer'">
                    <text>{{ form.isIncludedInStats ? '计入统计' : '不计入统计' }}</text>
                </view>
                <picker
                    v-if="canBatchAddBills"
                    class="option-picker"
                    mode="selector"
                    :range="batchBillCountOptions"
                    :value="batchBillCount - 1"
                    @change="onBatchBillCountChange"
                >
                    <view class="option-tag">
                        <text>新增 {{ batchBillCount }} 笔</text>
                    </view>
                </picker>
                <view class="option-tag disabled" v-if="currentTab === 'transfer'">
                    <text>不计入统计</text>
                </view>
            </view>
        </scroll-view>
        <!-- Remark -->
        <view class="remark-box">
            <input class="remark-input" v-model="form.remark" placeholder="添加备注（选填）" />
        </view>

        <scroll-view v-if="remarkSuggestions.length > 0" scroll-x class="remark-suggestions" :show-scrollbar="false">
            <view class="remark-suggestion-row">
                <view
                    v-for="remark in remarkSuggestions"
                    :key="remark"
                    class="remark-suggestion"
                    @click="selectRemarkSuggestion(remark)"
                >
                    {{ remark }}
                </view>
            </view>
        </scroll-view>

        <view v-if="currentTab === 'income'" class="advanced-option aa-receipt-entry" @click="openAAReceiptPicker">
            <view>
                <text>AA 收款</text>
                <text class="aa-receipt-hint">{{ selectedAAReceipt ? '已关联代垫账单' : '选择未收齐的 AA 代垫分摊' }}</text>
            </view>
            <text class="advanced-value">{{ selectedAAReceipt ? `待收 ${aaSettlement.outstanding.toFixed(2)} ›` : '选择 ›' }}</text>
        </view>

        <view v-if="currentTab === 'expense' && !isAARepayment" class="feature-section">
            <view class="feature-section-head">
                <view>
                    <text class="section-label">特殊记账方式</text>
                    <text class="section-hint">AA 和分期只能选择一种</text>
                </view>
                <text class="section-state">{{ form.aaEnabled || form.installmentEnabled ? '已配置' : '普通账单' }}</text>
            </view>
            <view class="feature-grid">
                <view :class="['feature-card', 'aa-card', { active: form.aaEnabled }]" @click="toggleAA">
                    <view class="feature-card-top">
                        <text class="feature-icon">AA</text>
                        <text class="feature-switch">{{ form.aaEnabled ? '已开启' : '开启' }}</text>
                    </view>
                    <text class="feature-card-title">代垫分摊</text>
                    <text class="feature-card-desc">保留全额流水，统计本人承担</text>
                    <text v-if="form.aaEnabled" class="feature-card-value">本人 {{ form.aaOwnAmountStr || '0' }} · 待收 {{ aaReceivableAmount.toFixed(2) }}</text>
                </view>
                <view :class="['feature-card', 'installment-card', { active: form.installmentEnabled }]" @click="toggleInstallment">
                    <view class="feature-card-top">
                        <text class="feature-icon">分</text>
                        <text class="feature-switch">{{ form.installmentEnabled ? '已开启' : '开启' }}</text>
                    </view>
                    <text class="feature-card-title">分期账单</text>
                    <text class="feature-card-desc">按月生成每期流水和手续费</text>
                    <text v-if="form.installmentEnabled" class="feature-card-value">{{ form.installmentPeriods }} 期 · 每期约 {{ installmentPeriodAmount.toFixed(2) }}</text>
                </view>
            </view>
        </view>
        <view v-if="currentTab === 'expense' && form.aaEnabled" class="advanced-form">
            <view class="feature-detail-head">
                <view>
                    <text class="feature-detail-title">AA 分摊明细</text>
                    <text class="feature-detail-subtitle">总额固定，修改一项自动补足另一项</text>
                </view>
                <text class="feature-detail-total">总额 {{ form.amountStr || '0' }}</text>
            </view>
            <view class="amount-breakdown">
                <view class="breakdown-item editable">
                    <text class="breakdown-label">本人承担</text>
                    <input class="breakdown-value own" type="digit" :value="form.aaOwnAmountStr" placeholder="0.00" @input="onAAOwnAmountInput" />
                </view>
                <view class="breakdown-divider">+</view>
                <view class="breakdown-item editable">
                    <text class="breakdown-label">代垫待收</text>
                    <input class="breakdown-value receivable" type="digit" :value="form.aaReceivableAmountStr" placeholder="0.00" @input="onAAReceivableAmountInput" />
                </view>
            </view>
            <view class="aa-settlement-summary">
                <text>已收总金额</text>
                <text>{{ aaSettlement.settled.toFixed(2) }}</text>
            </view>
            <text class="advanced-tip">保存后可从首页 AA 账单直接新增还款</text>
            <view v-if="canAddAARepayment" class="advanced-option repayment-entry" @click="addAARepayment">
                <text>新增 AA 还款</text>
                <text class="advanced-value">待收 {{ aaSettlement.outstanding.toFixed(2) }} ›</text>
            </view>
        </view>

        <view v-if="currentTab === 'expense' && form.installmentEnabled" class="advanced-form">
            <view class="feature-detail-head">
                <view>
                    <text class="feature-detail-title">分期计划</text>
                    <text class="feature-detail-subtitle">首期会计入统计，后续期不重复统计</text>
                </view>
                <text class="feature-detail-total">总额 {{ form.amountStr || '0' }}</text>
            </view>
            <view class="installment-preview">
                <view class="preview-item">
                    <text class="preview-label">期数</text>
                    <text class="preview-value">{{ form.installmentPeriods || '0' }} 期</text>
                </view>
                <view class="preview-item">
                    <text class="preview-label">手续费</text>
                    <text class="preview-value">{{ form.installmentFeeStr || '0.00' }}</text>
                </view>
                <view class="preview-item highlight">
                    <text class="preview-label">每期均分</text>
                    <text class="preview-value">{{ installmentPeriodAmount.toFixed(2) }}</text>
                </view>
            </view>
            <view class="advanced-row">
                <text>分期期数</text>
                <input class="fee-input" type="number" :value="form.installmentPeriods" @input="onInstallmentPeriodsInput" />
                <text class="fee-unit">期</text>
            </view>
            <view class="advanced-row">
                <text>总手续费</text>
                <input class="fee-input" type="digit" v-model="form.installmentFeeStr" placeholder="0" @input="onInstallmentFeeInput" />
                <text class="fee-unit">元</text>
            </view>
            <view class="installment-amounts-head">
                <text>每期还款金额</text>
                <text @click="resetInstallmentPeriodAmounts">均分重置</text>
            </view>
            <view class="installment-amounts">
                <view v-for="(_, index) in form.installmentPeriodAmounts" :key="index" class="installment-amount-row">
                    <text>第 {{ index + 1 }} 期</text>
                    <input
                        class="installment-amount-input"
                        type="digit"
                        :value="form.installmentPeriodAmounts[index]"
                        placeholder="0.00"
                        @input="onInstallmentPeriodAmountInput(index, $event)"
                    />
                    <text>{{ form.currency }}</text>
                </view>
            </view>
            <view class="installment-amount-summary">
                <text>还款合计 {{ installmentPeriodTotal.toFixed(2) }}</text>
                <text :class="{ warning: installmentPeriodDifference !== 0 }">应还 {{ installmentStatAmount.toFixed(2) }}</text>
            </view>
            <text class="advanced-tip">首期统计 {{ installmentStatAmount.toFixed(2) }}，之后每期只影响余额</text>
        </view>

        <view class="form-actions">
            <button class="form-action secondary" @click="isEditMode ? cancelEdit() : resetForm">{{ isEditMode ? '取消' : '清空' }}</button>
            <button class="form-action primary" @click="submit">{{ isEditMode ? '保存修改' : '保存' }}</button>
        </view>
    </view>
    
    <!-- Asset Picker Modal -->
    <view v-if="showAssetPicker" class="picker-mask" @click="showAssetPicker = false">
        <view class="picker-modal neu-card" @click.stop>
            <view class="picker-title">选择账户</view>
            <view class="asset-list">
                <view 
                    v-for="a in assets" 
                    :key="a.id" 
                    class="asset-option"
                    @click="selectAsset(a)"
                >
                    {{ a.name }}
                </view>
            </view>
        </view>
    </view>
    <!-- Currency Picker Modal -->

    <view v-if="showCurrencyPicker" class="picker-mask" @click="showCurrencyPicker = false">

        <view class="picker-modal neu-card" @click.stop>

            <view class="picker-title">选择币种</view>

            <view class="asset-list">

                <view

                    v-for="c in currencies"

                    :key="c.code"

                    class="asset-option"

                    @click="selectCurrency(c.code)"

                >

                    {{ c.name }} ({{ c.code }})

                </view>

            </view>

        </view>

    </view>

    <view v-if="showAAReceiptPicker" class="picker-mask" @click="showAAReceiptPicker = false">
        <view class="picker-modal aa-receipt-picker neu-card" @click.stop>
            <view class="picker-title">选择 AA 收款来源</view>
            <view v-if="aaReceiptCandidates.length" class="asset-list">
                <view
                    v-for="item in aaReceiptCandidates"
                    :key="item.payer.id"
                    class="asset-option aa-receipt-option"
                    @click="selectAAReceipt(item)"
                >
                    <view class="aa-receipt-option-main">
                        <text>{{ item.payer.remark || 'AA 代垫分摊' }}</text>
                        <text>{{ item.assetName }}</text>
                    </view>
                    <view class="aa-receipt-option-meta">
                        <text>{{ item.date }}</text>
                        <text>待收 {{ item.outstanding.toFixed(2) }} {{ item.payer.currency || 'CNY' }}</text>
                    </view>
                </view>
            </view>
            <view v-else class="aa-receipt-empty">暂无未收齐的 AA 代垫分摊账单</view>
        </view>
    </view>

    

  </view>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useCategoryStore } from '@/store/category'
import { useAssetStore } from '@/store/asset'
import { usePageShare } from '@/utils/share'

usePageShare({ title: '记一笔 - 记账本', path: '/pages/index/index' })

import { useBillStore } from '@/store/bill'

import { CURRENCIES, getCurrencySymbol } from '@/utils/currency'
import { calculateAAAmounts } from '@/utils/aaAmounts'
import { getDefaultInstallmentPeriodAmounts } from '@/utils/installment'
import { syncTransferAmountIfEmpty } from '@/utils/transfer'


const categoryStore = useCategoryStore()
const assetStore = useAssetStore()
const billStore = useBillStore()

// 编辑模式相关
const isEditMode = ref(false)
const editBillId = ref('')

const tabs = [
    { label: '支出', value: 'expense' },
    { label: '收入', value: 'income' },
    { label: '转账', value: 'transfer' }
]

const currentTab = ref('expense')
const scrollTop = ref(0)
const batchBillCount = ref(1)
const batchBillCountOptions = Array.from({ length: 10 }, (_, index) => `${index + 1} 笔`)
const selectedCategoryId = ref('')
const selectedParentId = ref('') // To track which parent is expanded
const showAssetPicker = ref(false)
const transferAmountSyncSource = ref('')

const showCurrencyPicker = ref(false)
const showAAReceiptPicker = ref(false)

const pickingAssetType = ref('source')

const assetTouched = ref(false)

const pickingCurrencyType = ref('source')

const currencies = CURRENCIES

const toLocalDateString = (date = new Date()) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const parseLocalDate = (dateText) => {
    const [y, m, d] = String(dateText || toLocalDateString()).split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
}

const form = reactive({
    amountStr: '0',
    remark: '',
    date: toLocalDateString(),
    assetId: '',
    parentCategoryId: '', // 一级分类ID，用于层级展示
    categoryId: '', // 实际分类ID（可以是父级或子级）
    currency: 'CNY',
    targetCurrency: 'CNY',
    targetAmountStr: '',
    isIncludedInStats: true,
    aaEnabled: false,
    aaOwnAmountStr: '',
    aaReceivableAmountStr: '',
    aaGroupId: '',
    aaPayerBillId: '',
    installmentEnabled: false,
    installmentPeriods: '2',
    installmentFeeStr: '0',
    installmentPeriodAmounts: [],
    installmentAmountsCustomized: false,
    // 转账相关字段
    targetAssetId: '',
    fee: '0',
    fxGainLossType: 'none',
    fxGainLossAmountStr: ''
})

const fxGainLossModes = [
    { value: 'none', label: '不记录' },
    { value: 'gain', label: '收益' },
    { value: 'loss', label: '损失' }
]
const isSameAssetCurrencyConversion = computed(() =>
    currentTab.value === 'transfer'
    && !!form.assetId
    && form.assetId === form.targetAssetId
    && form.currency !== form.targetCurrency
)
const categories = computed(() => {
    return categoryStore.categories.filter(c => c.type === currentTab.value && !c.hidden)
})
const assets = computed(() => assetStore.assets)
const CATEGORY_PAGE_SIZE = 15
const SUB_CATEGORY_PAGE_SIZE = 5
const chunkItems = (items, size = CATEGORY_PAGE_SIZE) => {
    const pages = []
    for (let index = 0; index < items.length; index += size) {
        pages.push(items.slice(index, index + size))
    }
    return pages.length ? pages : [[]]
}

const categoryPages = computed(() => {
    const settingItem = { id: '__setting__', name: '设置', icon: '⚙️', isSetting: true }
    return chunkItems([...categories.value, settingItem])
})

const subCategoryPages = computed(() => chunkItems(subCategories.value, SUB_CATEGORY_PAGE_SIZE))

const subCategories = computed(() => {
    if (!selectedParentId.value) return []
    // Use store directly to avoid filtered list issues
    const parent = categoryStore.categories.find(c => c.id === selectedParentId.value)
    const children = parent ? (parent.children || []) : []
    return children
})

const selectedAssetName = computed(() => {
    const a = assets.value.find(x => x.id === form.assetId)
    return a ? a.name : '账户'
})

const displayDate = computed(() => {
    const today = toLocalDateString()
    if (form.date === today) return '今天'
    return form.date.substring(5) // MM-DD
})

const displayAmount = computed(() => {
    return form.amountStr === '0' ? '' : form.amountStr
})

const displayCurrencySymbol = computed(() => {
    return getCurrencySymbol(form.currency)
})

const amountLabel = computed(() => {
    if (currentTab.value === 'income') return '收入金额'
    if (currentTab.value === 'transfer') return '转出金额'
    return '支出金额'
})

const selectedCategoryName = computed(() => {
    if (!form.categoryId) return '未选择'
    const direct = categoryStore.categories.find(category => category.id === form.categoryId)
    if (direct) return direct.name
    for (const parent of categoryStore.categories) {
        const child = (parent.children || []).find(category => category.id === form.categoryId)
        if (child) return parent.name + ' · ' + child.name
    }
    return '未选择'
})

const displayTransferInAmount = computed(() => {
    return form.targetAmountStr || '0'
})

const isAARepayment = computed(() => currentTab.value === 'income' && !!form.aaGroupId)
const canBatchAddBills = computed(() =>
    !isEditMode.value
    && !form.aaEnabled
    && !form.installmentEnabled
    && !isAARepayment.value
)
const aaSettlement = computed(() => form.aaGroupId
    ? billStore.getAASettlement(form.aaGroupId)
    : { receivable: 0, settled: 0, outstanding: 0 })
const canAddAARepayment = computed(() => isEditMode.value && form.aaEnabled && !!form.aaGroupId && aaSettlement.value.outstanding > 0)
const aaReceivableAmount = computed(() => Math.max(0, Number(form.aaReceivableAmountStr || 0)))
const currentAAReceipt = computed(() => isEditMode.value
    ? billStore.bills.find(bill => bill.id === editBillId.value && bill.aa?.role === 'repayment')
    : null)
const aaReceiptCandidates = computed(() => billStore.bills
    .filter(bill => bill.type === 'expense' && bill.aa?.role === 'payer' && bill.aa?.groupId)
    .map(payer => {
        const settlement = billStore.getAASettlement(payer.aa.groupId)
        const currentAmount = currentAAReceipt.value?.aa?.payerBillId === payer.id
            ? Number(currentAAReceipt.value.aa.settlementAmount ?? Math.abs(currentAAReceipt.value.amount || 0))
            : 0
        return {
            groupId: payer.aa.groupId,
            payer,
            outstanding: Number((settlement.outstanding + currentAmount).toFixed(2)),
            assetName: assets.value.find(asset => asset.id === payer.assetId)?.name || '原付款账户',
            date: toLocalDateString(new Date(payer.timestamp))
        }
    })
    .filter(item => item.outstanding > 0))
const selectedAAReceipt = computed(() => aaReceiptCandidates.value.find(item => item.payer.id === form.aaPayerBillId)
    || (form.aaPayerBillId ? { payer: billStore.getAAPayerById(form.aaPayerBillId) } : null))
const installmentPeriodAmount = computed(() => {
    const total = Math.max(0, Number(form.amountStr || 0))
    const fee = Math.max(0, Number(form.installmentFeeStr || 0))
    const periods = Math.max(1, Number(form.installmentPeriods || 1))
    return (total + fee) / periods
})
const installmentStatAmount = computed(() => Number(form.amountStr || 0) + Number(form.installmentFeeStr || 0))
const installmentPeriodTotal = computed(() => form.installmentPeriodAmounts
    .reduce((sum, amount) => sum + Number(amount || 0), 0))
const installmentPeriodDifference = computed(() => Math.round((installmentPeriodTotal.value - installmentStatAmount.value) * 100) / 100)


const addAARepayment = () => {
    if (!form.aaGroupId || aaSettlement.value.outstanding <= 0) return
    uni.navigateTo({ url: `/pages/bill/add?type=income&aaGroupId=${encodeURIComponent(form.aaGroupId)}` })
}

const sortedBillsDesc = computed(() => {
    return [...billStore.bills].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
})

const getLatestBillByCategory = (categoryId) => {
    if (!categoryId || currentTab.value !== 'expense') return null
    return sortedBillsDesc.value.find(bill => (
        bill.type === 'expense'
        && bill.assetId
        && (bill.categoryId === categoryId || bill.parentCategoryId === categoryId)
    ))
}

const applyRecentAssetByCategory = (categoryId) => {
    if (currentTab.value !== 'expense' || assetTouched.value) return
    const latestBill = getLatestBillByCategory(categoryId)
    if (!latestBill) return
    const exists = assets.value.some(asset => asset.id === latestBill.assetId)
    if (exists) {
        form.assetId = latestBill.assetId
        form.currency = latestBill.currency || form.currency
        form.targetCurrency = form.currency
    }
}

const remarkSuggestions = computed(() => {
    if (currentTab.value === 'transfer' || !form.categoryId || !form.assetId) return []
    const suggestions = []
    const seen = new Set()

    for (const bill of sortedBillsDesc.value) {
        const remark = String(bill.remark || '').trim()
        if (
            bill.type === currentTab.value
            && bill.assetId === form.assetId
            && (bill.categoryId === form.categoryId || bill.parentCategoryId === form.categoryId)
            && remark
            && !seen.has(remark)
        ) {
            seen.add(remark)
            suggestions.push(remark)
            if (suggestions.length >= 5) break
        }
    }

    return suggestions
})

// Watch categories change to ensure selection is valid
import { watch } from 'vue'
watch(categories, (newVal) => {
    if (newVal.length > 0) {
        // 编辑模式下，如果已经有分类选择，不要自动覆盖
        if (isEditMode.value && (selectedCategoryId.value || form.categoryId)) {
            // 检查当前选中的分类是否在新列表中
            const exists = newVal.find(c => c.id === selectedCategoryId.value)
            if (!exists && form.categoryId) {
                // 如果当前选中的分类不存在，但form中有categoryId，尝试找到对应的父分类
                const parentCat = newVal.find(c => c.children && c.children.some(child => child.id === form.categoryId))
                if (parentCat) {
                    selectedParentId.value = parentCat.id
                    selectedCategoryId.value = parentCat.id
                }
            }
            return
        }
        
        // 非编辑模式或没有选择时，选择第一个分类
        const exists = newVal.find(c => c.id === selectedCategoryId.value)
        if (!exists) {
            selectCategory(newVal[0])
        }
    } else {
        selectedCategoryId.value = ''
        form.parentCategoryId = ''
        form.categoryId = ''
    }
})

const initStores = () => {

    categoryStore.init()

    assetStore.init()

    billStore.init()

}



onMounted(() => {

    initStores()

    if (!isEditMode.value && !assetTouched.value && !form.assetId && assets.value.length > 0) {

        form.assetId = assets.value[0].id

    }

    // 只有在非编辑模式下才自动选择第一个分类

    if (categories.value.length > 0 && !isEditMode.value) {

        selectCategory(categories.value[0])

    }

})

// 处理编辑模式
onLoad((options) => {
    initStores()
    if (options.id) {
        // 编辑模式
        isEditMode.value = true
        editBillId.value = options.id
        loadBillData(options.id)
        return
    }

    if (options.aaGroupId) {
        switchTab('income')
        form.aaGroupId = options.aaGroupId
        form.aaEnabled = false
        form.installmentEnabled = false
        const payer = billStore.getAAPayer(options.aaGroupId)
        if (payer) {
            selectAAReceipt({
                groupId: options.aaGroupId,
                payer,
                outstanding: billStore.getAASettlement(options.aaGroupId).outstanding
            })
        }
    }


    if (options.assetId && assets.value.some(asset => asset.id === options.assetId)) {
        form.assetId = options.assetId
        assetTouched.value = true
    }
    if (options.type) {
        switchTab(options.type)
    }

})

// 加载账单数据

const loadBillData = (id) => {
    const bill = billStore.bills.find(b => b.id === id)
    if (!bill) {
        uni.showToast({ title: '账单不存在', icon: 'none' })
        uni.navigateBack()
        return
    }
    if (bill.installment?.groupId) {
        uni.redirectTo({ url: `/pages/bill/installment?id=${encodeURIComponent(id)}` })
        return
    }

    // 设置当前标签页
    currentTab.value = bill.type
    
    // 填充表单数据
    const sourceAmount = Math.abs(Number(bill.amount || 0))
    form.amountStr = sourceAmount.toString()
    form.remark = bill.remark || ''
    form.date = toLocalDateString(new Date(bill.timestamp))
    form.assetId = bill.assetId
    form.parentCategoryId = bill.parentCategoryId
    form.categoryId = bill.categoryId
    form.currency = bill.currency || 'CNY'
    form.targetCurrency = bill.targetCurrency || form.currency
    form.targetAmountStr = ''
    form.fxGainLossType = 'none'
    form.fxGainLossAmountStr = ''
    form.isIncludedInStats = bill.isIncludedInStats !== false
    form.aaEnabled = !!bill.aa?.enabled && bill.aa?.role !== 'repayment'
    form.aaOwnAmountStr = bill.aa?.ownAmount !== undefined ? String(bill.aa.ownAmount) : ''
    form.aaReceivableAmountStr = bill.aa?.role === 'payer'
        ? String(bill.aa.receivableAmount ?? Math.max(0, Math.abs(Number(bill.amount || 0)) - Number(bill.aa.ownAmount || 0)))
        : ''
    form.aaGroupId = bill.aa?.groupId || ''
    form.aaPayerBillId = bill.aa?.payerBillId || ''
    form.installmentEnabled = false
    form.installmentPeriods = '2'
    form.installmentFeeStr = '0'

    if (bill.type === 'transfer') {
        form.targetAssetId = bill.targetAssetId || ''
        const targetAmount = Math.abs(Number(bill.targetAmount))
        form.targetAmountStr = Number.isFinite(targetAmount) && targetAmount > 0
            ? targetAmount.toString()
            : sourceAmount.toString()
        form.targetCurrency = bill.targetCurrency || form.currency
        form.fee = bill.fee ? bill.fee.toString() : '0'

        const fxGainLossAmount = Number(bill.fxGainLossAmount || 0)
        form.fxGainLossType = fxGainLossAmount > 0 ? 'gain' : fxGainLossAmount < 0 ? 'loss' : 'none'
        form.fxGainLossAmountStr = fxGainLossAmount ? Math.abs(fxGainLossAmount).toString() : ''
    }
    
    // 设置选中的分类
    if (bill.parentCategoryId) {
        selectedParentId.value = bill.parentCategoryId
        selectedCategoryId.value = bill.parentCategoryId
    } else if (bill.categoryId) {
        // 如果没有parentCategoryId，尝试找到父分类
        const parentCat = categoryStore.categories.find(c => 
            c.children && c.children.some(child => child.id === bill.categoryId)
        )
        if (parentCat) {
            selectedParentId.value = parentCat.id
            selectedCategoryId.value = parentCat.id
        } else {
            // 如果本身就是父分类
            selectedParentId.value = bill.categoryId
            selectedCategoryId.value = bill.categoryId
        }
    }
}

const switchTab = (val) => {
    transferAmountSyncSource.value = ''
    batchBillCount.value = 1
    if (val !== currentTab.value) {
        form.aaGroupId = ''
        form.aaPayerBillId = ''
    }
    currentTab.value = val
    assetTouched.value = false
    if (val !== 'expense') {
        form.aaEnabled = false
        form.installmentEnabled = false
        form.aaOwnAmountStr = ''
        form.aaReceivableAmountStr = ''
        form.installmentPeriodAmounts = []
        form.installmentAmountsCustomized = false
    }
    if (val === 'transfer') {
        form.isIncludedInStats = false
        form.aaGroupId = ''

        form.currency = form.currency || 'CNY'
        if (!form.targetCurrency) form.targetCurrency = 'CNY'
        if (!form.targetAssetId && assets.value.length > 1) {
            form.targetAssetId = assets.value.find(a => a.id !== form.assetId)?.id || ''
        }
        if (!form.fee) {
            form.fee = '0'
        }
    } else {
        form.isIncludedInStats = true
        form.fee = '0'
        form.targetAmountStr = ''
        form.targetCurrency = form.currency
        form.targetAssetId = ''
    }
}

const toggleAA = () => {
    if (isEditMode.value && !form.aaEnabled) return
    form.aaEnabled = !form.aaEnabled
    if (form.aaEnabled) {
        batchBillCount.value = 1
        form.installmentEnabled = false
        if (!form.aaOwnAmountStr) form.aaOwnAmountStr = form.amountStr
        if (!form.aaReceivableAmountStr) form.aaReceivableAmountStr = '0'
    }
}

const toggleInstallment = () => {
    if (isEditMode.value && !form.installmentEnabled) return
    form.installmentEnabled = !form.installmentEnabled
    if (form.installmentEnabled) {
        batchBillCount.value = 1
        form.aaEnabled = false
        form.aaOwnAmountStr = ''
        form.aaReceivableAmountStr = ''
        resetInstallmentPeriodAmounts()
    }
}

const onAAOwnAmountInput = (e) => {
    form.aaOwnAmountStr = normalizeAmountInput(e.detail.value)
    syncAAAmount('own')
}

const onAAReceivableAmountInput = (e) => {
    form.aaReceivableAmountStr = normalizeAmountInput(e.detail.value)
    syncAAAmount('receivable')
}

const normalizeAmountInput = (input) => {
    let value = String(input || '').replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
    if (parts[1]?.length > 2) value = parts[0] + '.' + parts[1].slice(0, 2)
    return value.slice(0, 10)
}

const syncAAAmount = (editedField) => {
    const isOwnAmount = editedField === 'own'
    const amountStr = isOwnAmount ? form.aaOwnAmountStr : form.aaReceivableAmountStr
    const { editedAmount, counterpartAmount } = calculateAAAmounts(form.amountStr, amountStr)

    if (Number(amountStr || 0) > Number(form.amountStr || 0)) {
        if (isOwnAmount) {
            form.aaOwnAmountStr = editedAmount.toFixed(2)
        } else {
            form.aaReceivableAmountStr = editedAmount.toFixed(2)
        }
    }

    if (isOwnAmount) {
        form.aaReceivableAmountStr = counterpartAmount.toFixed(2)
    } else {
        form.aaOwnAmountStr = counterpartAmount.toFixed(2)
    }
}

const syncAAFromTotal = () => {
    const total = Math.max(0, Number(form.amountStr || 0))
    const ownAmount = Math.min(total, Math.max(0, Number(form.aaOwnAmountStr || 0)))
    form.aaOwnAmountStr = ownAmount.toFixed(2)
    form.aaReceivableAmountStr = (total - ownAmount).toFixed(2)
}

watch(() => [form.amountStr, form.installmentFeeStr], () => {
    if (form.installmentEnabled && !form.installmentAmountsCustomized) resetInstallmentPeriodAmounts()
})

const openAAReceiptPicker = () => {
    showAAReceiptPicker.value = true
}

const selectAAReceipt = (item) => {
    const payer = item?.payer
    if (!payer) return
    form.aaGroupId = item.groupId
    form.aaPayerBillId = payer.id
    form.amountStr = item.outstanding.toFixed(2)
    form.assetId = payer.assetId
    form.currency = payer.currency || 'CNY'
    form.targetCurrency = form.currency
    form.remark = payer.remark ? `AA收款：${payer.remark}` : 'AA收款'
    form.isIncludedInStats = false
    batchBillCount.value = 1
    assetTouched.value = true
    showAAReceiptPicker.value = false
}

const onInstallmentFeeInput = (e) => {
    let value = e.detail.value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
    if (parts[1]?.length > 2) value = parts[0] + '.' + parts[1].slice(0, 2)
    form.installmentFeeStr = value
    if (!form.installmentAmountsCustomized) resetInstallmentPeriodAmounts()
}

const onInstallmentPeriodsInput = (e) => {
    form.installmentPeriods = String(e.detail.value || '').replace(/\D/g, '')
    resetInstallmentPeriodAmounts()
}

const resetInstallmentPeriodAmounts = () => {
    const totalAmount = Number(form.amountStr || 0)
    const fee = Number(form.installmentFeeStr || 0)
    const periods = Number(form.installmentPeriods || 0)
    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || !Number.isFinite(fee) || fee < 0 || !Number.isInteger(periods) || periods < 2) {
        form.installmentPeriodAmounts = Array.from({ length: Math.max(0, periods) }, () => '0')
    } else {
        form.installmentPeriodAmounts = getDefaultInstallmentPeriodAmounts({ totalAmount, fee, periods }).map(String)
    }
    form.installmentAmountsCustomized = false
}

const onInstallmentPeriodAmountInput = (index, e) => {
    form.installmentPeriodAmounts.splice(index, 1, normalizeAmountInput(e.detail.value))
    form.installmentAmountsCustomized = true
}

const selectCategory = (cat) => {
    console.log('Select Category:', cat.name, cat.id)
    selectedCategoryId.value = cat.id
    selectedParentId.value = cat.id // Always set as parent context
    form.parentCategoryId = cat.id

    // 默认选择父分类作为categoryId，如果用户选择子分类会覆盖
    form.categoryId = cat.id
    applyRecentAssetByCategory(cat.id)
    
    console.log('Children:', cat.children)
}

const selectSubCategory = (sub) => {
    form.categoryId = sub.id  // 子分类ID覆盖父分类ID
    applyRecentAssetByCategory(sub.id)
    console.log('Select Sub Category:', sub.name, sub.id)
}

const selectRemarkSuggestion = (remark) => {
    form.remark = remark
}

const goManageCategories = () => {
    uni.navigateTo({ url: '/pages/categories/index' })
}

const openAssetPicker = (type) => {
    pickingAssetType.value = type
    showAssetPicker.value = true
}

const selectAsset = (a) => {
    assetTouched.value = true
    if (pickingAssetType.value === 'source') {
        form.assetId = a.id
    } else {
        form.targetAssetId = a.id
    }
    showAssetPicker.value = false
}

const openCurrencyPicker = (type) => {

    pickingCurrencyType.value = type

    showCurrencyPicker.value = true

}



const isSameTransferCurrency = () => {
    return currentTab.value === 'transfer' && form.currency === form.targetCurrency
}

const syncTargetAmountFromSource = () => {
    const isTargetAutoSynced = transferAmountSyncSource.value === 'source'
    if (isSameTransferCurrency() && (form.targetAmountStr === '' || isTargetAutoSynced)) {
        form.targetAmountStr = syncTransferAmountIfEmpty(
            form.amountStr === '0' ? '' : form.amountStr,
            form.targetAmountStr,
            isTargetAutoSynced
        )
        transferAmountSyncSource.value = 'source'
    }
}

const syncSourceAmountFromTarget = () => {
    const isSourceAutoSynced = transferAmountSyncSource.value === 'target'
    if (isSameTransferCurrency() && (displayAmount.value === '' || isSourceAutoSynced)) {
        form.amountStr = syncTransferAmountIfEmpty(
            form.targetAmountStr || '0',
            displayAmount.value,
            isSourceAutoSynced
        ) || '0'
        transferAmountSyncSource.value = 'target'
    }
}

const syncSameCurrencyAmount = () => {
    if (!isSameTransferCurrency()) return

    if (form.amountStr && form.amountStr !== '0') {
        form.targetAmountStr = form.amountStr
    } else if (form.targetAmountStr) {
        form.amountStr = form.targetAmountStr
    }
}

const selectCurrency = (code) => {



    if (pickingCurrencyType.value === 'target') {



        form.targetCurrency = code



    } else {



        form.currency = code



        if (currentTab.value === 'transfer') {
            form.isIncludedInStats = false
        }







        if (currentTab.value !== 'transfer') {



            form.targetCurrency = code



            form.isIncludedInStats = true



        }



    }



    syncSameCurrencyAmount()

    showCurrencyPicker.value = false



}




const onDateChange = (e) => {
    form.date = e.detail.value
}

const onBatchBillCountChange = (e) => {
    batchBillCount.value = Number(e.detail.value) + 1
}

const onAmountInput = (e) => {
    let value = e.detail.value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('')
    if (parts[1]?.length > 2) value = parts[0] + '.' + parts[1].slice(0, 2)
    if (value.length > 10) value = value.slice(0, 10)
    form.amountStr = value || '0'
    if (currentTab.value === 'transfer' && transferAmountSyncSource.value === 'target') {
        transferAmountSyncSource.value = ''
    }
    if (form.aaEnabled) syncAAFromTotal()
    syncTargetAmountFromSource()
}

const onTargetAmountInput = (e) => {
    let value = e.detail.value
    value = value.replace(/[^\d.]/g, '')
    const parts = value.split('.')
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
    }
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    if (value.length > 10) value = value.slice(0, 10)
    form.targetAmountStr = value
    if (currentTab.value === 'transfer' && transferAmountSyncSource.value === 'source') {
        transferAmountSyncSource.value = ''
    }
    syncSourceAmountFromTarget()
}

// 手续费输入处理
const onFeeInput = (e) => {
    let value = e.detail.value
    // 只允许数字和小数点
    value = value.replace(/[^\d.]/g, '')
    // 确保只有一个小数点
    const parts = value.split('.')
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('')
    }
    // 限制小数点后两位
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2)
    }
    form.fee = value
}

const onFxGainLossAmountInput = (e) => {
    form.fxGainLossAmountStr = normalizeAmountInput(e.detail.value)
}

const cancelEdit = () => {
    uni.navigateBack()
}

const resetForm = () => {

    form.amountStr = '0'
    batchBillCount.value = 1
    transferAmountSyncSource.value = ''

    form.remark = ''
    form.aaGroupId = ''
    form.aaPayerBillId = ''
    form.aaOwnAmountStr = ''
    form.aaReceivableAmountStr = ''
    form.installmentPeriods = '2'
    form.installmentFeeStr = '0'
    form.installmentPeriodAmounts = []
    form.installmentAmountsCustomized = false
    form.fxGainLossType = 'none'
    form.fxGainLossAmountStr = ''

    form.isIncludedInStats = currentTab.value !== 'transfer'

    if (currentTab.value === 'transfer') {

        form.fee = '0'

        form.targetAmountStr = ''

    }

}


const submit = async () => {
    const val = parseFloat(form.amountStr)

    if (currentTab.value === 'transfer') {
        if (!form.assetId) {
             uni.showToast({ title: '请选择转出账户', icon: 'none' })
             return
        }
        if (!form.targetAssetId) {
             uni.showToast({ title: '请选择转入账户', icon: 'none' })
             return
        }
        if (!form.currency) {
             uni.showToast({ title: '请选择转出币种', icon: 'none' })
             return
        }
        if (!form.targetCurrency) {
             uni.showToast({ title: '请选择转入币种', icon: 'none' })
             return
        }
        if (form.assetId === form.targetAssetId && form.currency === form.targetCurrency) {
             uni.showToast({ title: '同一账户转账需要使用不同币种', icon: 'none' })
             return
        }
        if (!val || val <= 0) {
             uni.showToast({ title: '请输入转出金额', icon: 'none' })
             return
        }

        const targetVal = parseFloat(form.targetAmountStr)
        if (!targetVal || targetVal <= 0) {
             uni.showToast({ title: '请输入转入金额', icon: 'none' })
             return
        }

        const feeVal = form.fee === '' ? 0 : parseFloat(form.fee)
        if (Number.isNaN(feeVal) || feeVal < 0) {
             uni.showToast({ title: '请输入正确手续费', icon: 'none' })
             return
        }
        if (isSameAssetCurrencyConversion.value && form.fxGainLossType !== 'none') {
            const fxAmount = Number(form.fxGainLossAmountStr)
            if (!Number.isFinite(fxAmount) || fxAmount <= 0) {
                uni.showToast({ title: '请输入正确的汇兑损益金额', icon: 'none' })
                return
            }
        }
    } else {
        if (!form.assetId) {
             uni.showToast({ title: '请选择账户', icon: 'none' })
             return
        }
        if (!form.currency) {
             uni.showToast({ title: '请选择币种', icon: 'none' })
             return
        }
        if (!form.categoryId) {
             uni.showToast({ title: '请选择分类', icon: 'none' })
             return
        }
        if (!val || val <= 0) {
             uni.showToast({ title: currentTab.value === 'income' ? '请输入收入金额' : '请输入支出金额', icon: 'none' })
             return
        }
    }

    try {
        let finalAmount = val
        if (currentTab.value === 'expense' || currentTab.value === 'transfer') {
            finalAmount = -Math.abs(val)
        } else {
            finalAmount = Math.abs(val)
        }

        // Create timestamp with current time for proper sorting
        // 如果是编辑模式，保留原有的时分秒，只更新日期
        // 或者简单起见，如果日期没变，保留原时间戳；如果日期变了，设为该日期的当前时间
        // 这里采用：保留原时间戳的时分秒，更新年月日
        let timestamp
        if (isEditMode.value) {
            const originalBill = billStore.bills.find(b => b.id === editBillId.value)
            const originalDate = new Date(originalBill.timestamp)
            const selectedDate = parseLocalDate(form.date)
            
            timestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                originalDate.getHours(),
                originalDate.getMinutes(),
                originalDate.getSeconds(),
                originalDate.getMilliseconds()
            ).getTime()
        } else {
            const now = new Date()
            const selectedDate = parseLocalDate(form.date)
            timestamp = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds(),
                now.getMilliseconds()
            ).getTime()
        }

        const billData = {
            amount: finalAmount,
            currency: form.currency,
            targetAmount: currentTab.value === 'transfer' ? Math.abs(parseFloat(form.targetAmountStr) || 0) : undefined,
            targetCurrency: currentTab.value === 'transfer' ? form.targetCurrency : form.currency,
            parentCategoryId: form.parentCategoryId, // 保留一级分类用于展示
            categoryId: form.categoryId, // 实际分类ID
            assetId: form.assetId,
            targetAssetId: currentTab.value === 'transfer' ? form.targetAssetId : undefined,
            type: currentTab.value,
            timestamp: timestamp,
            remark: form.remark,
            fxGainLossAmount: isSameAssetCurrencyConversion.value
                ? form.fxGainLossType === 'gain'
                    ? Number(form.fxGainLossAmountStr)
                    : form.fxGainLossType === 'loss'
                        ? -Number(form.fxGainLossAmountStr)
                        : 0
                : undefined,
            isIncludedInStats: isAARepayment.value ? false : (currentTab.value === 'transfer' ? false : form.isIncludedInStats),
            fee: currentTab.value === 'transfer' ? parseFloat(form.fee) || 0 : 0,
            aa: isAARepayment.value
                ? {
                    enabled: true,
                    groupId: form.aaGroupId,
                    payerBillId: form.aaPayerBillId,
                    role: 'repayment',
                    settlementAmount: Math.abs(finalAmount)
                }
                : form.aaEnabled
                    ? { enabled: true, groupId: form.aaGroupId, role: 'payer', ownAmount: Number(form.aaOwnAmountStr || 0) }
                    : undefined
        }

        if (form.aaEnabled && form.installmentEnabled) {
            uni.showToast({ title: 'AA与分期不能同时使用', icon: 'none' })
            return
        }
        if (form.aaEnabled) {
            const ownAmount = Number(form.aaOwnAmountStr)
            const receivableAmount = Number(form.aaReceivableAmountStr)
            if (!Number.isFinite(ownAmount) || ownAmount < 0 || !Number.isFinite(receivableAmount) || receivableAmount < 0 || Math.abs(ownAmount + receivableAmount - val) > 0.001) {
                uni.showToast({ title: '请输入正确的 AA 分摊金额', icon: 'none' })
                return
            }
            billData.aa.groupId = form.aaGroupId || undefined
            billData.statAmount = ownAmount
        }

        if (form.installmentEnabled) {
            const periods = Number(form.installmentPeriods)
            const fee = Number(form.installmentFeeStr || 0)
            if (!Number.isInteger(periods) || periods < 2) {
                uni.showToast({ title: '分期期数至少为2期', icon: 'none' })
                return
            }
            if (!Number.isFinite(fee) || fee < 0) {
                uni.showToast({ title: '请输入正确的分期手续费', icon: 'none' })
                return
            }
            if (isEditMode.value) {
                uni.showToast({ title: '请从分期编辑页修改整组账单', icon: 'none' })
                return
            }
            await billStore.addInstallment(billData, {
                totalAmount: val,
                periods,
                fee,
                periodAmounts: form.installmentPeriodAmounts,
                firstDate: timestamp
            })
            uni.showToast({ title: '分期账单已生成' })
            resetForm()
            uni.navigateBack()
            return
        }
        if (isEditMode.value) {
            await billStore.updateBill(editBillId.value, billData)
            uni.showToast({ title: '已更新' })
        } else {
            const billCount = canBatchAddBills.value ? batchBillCount.value : 1
            for (let index = 0; index < billCount; index += 1) {
                await billStore.addBill({
                    ...billData,
                    timestamp: timestamp + index
                })
            }
            uni.showToast({ title: billCount === 1 ? '已保存' : `已新增 ${billCount} 笔账单` })
        }
        
        resetForm()
        // Optional: navigate back or stay? "再记" implies stay, "保存" implies close?
        // User image has both. "保存" usually closes.
        uni.navigateBack()
    } catch (e) {
        console.error(e)
        uni.showToast({ title: e.message || (isEditMode.value ? '更新失败' : '保存失败'), icon: 'none' })
    }
}

</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 520px;
  background-color: var(--color-bg);
  overflow: hidden;
}

.page-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-shrink: 0;
    padding: 8px 16px 2px;
}

.page-title {
    color: var(--color-text);
    font-size: 20px;
    font-weight: 800;
    line-height: 28px;
}

.page-subtitle {
    color: var(--color-text-light);
    font-size: 11px;
}

/* Header Tabs */
.header-tabs {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 2px 12px 7px;
    background: var(--color-bg);
    z-index: 10;
    flex-shrink: 0;
}

.tab-item {
    min-width: 72px;
    padding: 7px 16px;
    margin: 0;
    text-align: center;
    font-size: 14px;
    color: var(--color-text-light);
    font-weight: bold;
    border-radius: 16px;
    transition: all 0.3s;
    
    &.active {
        color: #fff;
        background: var(--color-text); /* Black/Dark Grey */
        box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;
    }
}

.section-caption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 24px;
    padding: 0 4px 4px;
}

.section-caption-title {
    color: var(--color-text);
    font-size: 12px;
    font-weight: 800;
}

.section-caption-value {
    max-width: 62%;
    overflow: hidden;
    color: var(--color-secondary);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.category-area {
    flex: 1;
    height: 0;
    min-height: 0;
    box-sizing: border-box;
    padding: 2px 12px 8px;
    overflow-y: auto;
}

.category-swiper {
    width: 100%;
    height: 146px;
}

.category-swiper.sub-swiper {
    height: 48px;
}

.category-swiper-item {
    width: 100%;
    height: 100%;
}

.category-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    white-space: normal;
}

.grid-container {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    padding-bottom: 0;
}

.grid-item {
    width: 20%;
    height: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 0;
}

.icon-wrapper {
    position: relative;
    width: 30px;
    height: 30px;
    border-radius: 12px;
    background: #f0f4f8;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 3px;
    font-size: 16px;
    color: var(--color-text-light);
    transition: all 0.2s;

    &.selected {
        background: #88B194;
        color: #fff;
        box-shadow: 0 4px 10px rgba(136, 177, 148, 0.4);
    }

    &.setting {
        background: transparent;
        border: 1px solid #ddd;
    }

    .plus-badge {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 16px;
        height: 16px;
        background: var(--color-text);
        color: #fff;
        border-radius: 50%;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #fff;
    }
}

.sub-category-panel {
    margin-top: 2px;
    padding-top: 4px;
    border-top: 1px dashed #e0e5ec;
    animation: fadeIn 0.3s ease;
}

.sub-divider {
    text-align: center;
    margin-bottom: 4px;
    
    .divider-text {
        font-size: 12px;
        color: var(--color-text-light);
        background: var(--color-bg);
        padding: 0 10px;
    }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.cat-name {
    font-size: 10px;
    line-height: 17px;
    color: var(--color-text-light);
    max-width: 64px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    
    &.selected-text {
        color: var(--color-text);
        font-weight: bold;
    }
}

/* Bottom Panel */
.bottom-panel {
    box-sizing: border-box;
    flex: 0 0 52vh;
    min-height: 270px;
    max-height: 58vh;
    overflow-y: auto;
    background: #f8fcf8;
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -5px 20px rgba(0,0,0,0.05);
    padding: 8px 14px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
}

/* Options Row */
.options-scroll {
    width: 100%;
    flex-shrink: 0;
    margin-bottom: 4px;
    white-space: nowrap;
}

.options-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    min-width: max-content;
}

.option-picker {
    flex-shrink: 0;
}

.option-tag {
    height: 30px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #fff;
    padding: 0 12px;
    border-radius: 15px;
    margin-right: 6px;
    font-size: 11px;
    line-height: 30px;
    color: var(--color-text);
    white-space: nowrap;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.feature-section {
    margin: 4px 0 6px;
    padding: 8px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.52);
    border: 1px solid rgba(255, 255, 255, 0.72);
}

.feature-section-head,
.feature-card-top,
.feature-detail-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.section-label,
.feature-detail-title {
    display: block;
    color: var(--color-text);
    font-size: 13px;
    font-weight: 800;
}

.section-hint,
.feature-detail-subtitle {
    display: block;
    margin-top: 2px;
    color: var(--color-text-light);
    font-size: 10px;
}

.section-state,
.feature-switch {
    color: var(--color-text-light);
    font-size: 10px;
}

.feature-grid {
    display: flex;
    gap: 8px;
    margin-top:  5px;
}

.feature-card {
    flex: 1;
    min-width: 0;
    padding:  8px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.66);
    border: 1px solid rgba(138, 138, 138, 0.12);
    transition: all 0.2s ease;
}

.feature-card.active {
    border-color: rgba(136, 177, 148, 0.64);
    background: rgba(232, 246, 235, 0.92);
    transform: translateY(-1px);
}

.aa-card.active {
    border-color: rgba(255, 141, 93, 0.55);
    background: rgba(255, 242, 235, 0.96);
}

.feature-icon {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: rgba(255, 141, 93, 0.14);
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 900;
}

.installment-card .feature-icon {
    background: rgba(136, 177, 148, 0.2);
    color: #5b9469;
}

.feature-card-title {
    display: block;
    margin-top: 8px;
    color: var(--color-text);
    font-size: 13px;
    font-weight: 800;
}

.feature-card-desc,
.feature-card-value {
    display: block;
    margin-top: 3px;
    color: var(--color-text-light);
    font-size: 10px;
    line-height: 14px;
}

.feature-card-value {
    color: var(--color-text);
    font-weight: 700;
}

.advanced-form {
    margin: 0 0 8px;
    padding: 10px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(136, 177, 148, 0.22);
}

.feature-detail-total {
    color: var(--color-primary);
    font-size: 12px;
    font-weight: 800;
}

.amount-breakdown,
.installment-preview {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 10px 0;
    padding: 8px;
    border-radius: 12px;
    background: rgba(247, 250, 255, 0.7);
}

.breakdown-item,
.preview-item {
    flex: 1;
    min-width: 0;
}

.breakdown-item.editable {
    min-width: 0;
}

.breakdown-label,
.preview-label {
    display: block;
    color: var(--color-text-light);
    font-size: 10px;
}

.breakdown-value,
.preview-value {
    display: block;
    margin-top: 2px;
    color: var(--color-text);
    font-size: 13px;
    font-weight: 800;
}

input.breakdown-value {
    width: 100%;
    height: 22px;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    background: transparent;
}

.breakdown-value.own {
    color: var(--color-primary);
}

.breakdown-value.receivable {
    color: #5b9469;
}

.breakdown-divider {
    color: var(--color-text-light);
    font-size: 12px;
}

.preview-item.highlight {
    padding-left: 8px;
    border-left: 1px solid rgba(138, 138, 138, 0.16);
}

.advanced-row {
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid rgba(138, 138, 138, 0.12);
}

.advanced-tip {
    display: block;
    margin-top: 5px;
    color: var(--color-text-light);
    font-size: 10px;
    line-height: 14px;
}

.installment-amounts-head,
.installment-amount-summary,
.installment-amount-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.installment-amounts-head {
    margin-top: 8px;
    color: var(--color-text);
    font-size: 12px;
    font-weight: 700;
}

.installment-amounts-head text:last-child {
    color: var(--color-primary);
    font-size: 11px;
}

.installment-amounts {
    margin-top: 6px;
    border-radius: 12px;
    overflow: hidden;
    background: rgba(247, 250, 255, 0.7);
}

.installment-amount-row {
    min-height: 34px;
    padding: 0 9px;
    border-bottom: 1px solid rgba(138, 138, 138, 0.1);
    color: var(--color-text-light);
    font-size: 11px;
}

.installment-amount-row:last-child {
    border-bottom: 0;
}

.installment-amount-input {
    width: 96px;
    color: var(--color-text);
    font-size: 13px;
    font-weight: 800;
    text-align: right;
}

.installment-amount-summary {
    margin-top: 6px;
    color: var(--color-text-light);
    font-size: 10px;
}

.installment-amount-summary .warning {
    color: #d9534f;
    font-weight: 700;
}

.advanced-option {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    margin-top: 8px;
    border-radius: 12px;
    background: rgba(136, 177, 148, 0.14);
    color: var(--color-text);
    font-size: 12px;
    font-weight: 700;
}

.aa-settlement-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 34px;
    color: var(--color-text-light);
    font-size: 11px;
    border-top: 1px solid rgba(138, 138, 138, 0.12);
}

.aa-settlement-summary text:last-child {
    color: #5b9469;
    font-size: 13px;
    font-weight: 800;
}

.aa-receipt-entry {
    margin: 0 0 8px;
}

.aa-receipt-hint {
    display: block;
    margin-top: 2px;
    color: var(--color-text-light);
    font-size: 10px;
}

.advanced-value {
    color: var(--color-text-light);
    font-weight: 500;
}
.amount-entry {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    width: 132px;
    height: 30px;
    box-sizing: border-box;
    padding: 0 8px;
    margin-right: 6px;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.88);
}

.amount-input-wrap {
    display: flex;
    align-items: baseline;
    min-width: 0;
    flex: 1;
    justify-content: flex-start;
    color: var(--color-primary);
}

.remark-suggestions {
    width: 100%;
    margin: -2px 0 8px;
    white-space: nowrap;
}

.remark-suggestion-row {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
}

.remark-suggestion {
    max-width: 150px;
    height: 28px;
    box-sizing: border-box;
    flex-shrink: 0;
    padding: 0 12px;
    margin-right: 8px;
    border-radius: 14px;
    background: rgba(255,255,255,0.72);
    border: 1px solid rgba(136,177,148,0.24);
    color: var(--color-text-light);
    font-size: 12px;
    line-height: 28px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.remark-box {
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding: 0 12px;
    margin-bottom: 8px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.56);
    border: 1px solid rgba(255, 255, 255, 0.72);
}

.remark-input {
    width: 100%;
    font-size: 14px;
    color: var(--color-text);
}

.currency {
    flex-shrink: 0;
    margin-right: 3px;
    font-size: 14px;
}

.amount-input {
    width: 100%;
    max-width: 100%;
    height: 28px;
    line-height: 28px;
    color: var(--color-primary);
    font-size: 18px;
    font-weight: 800;
    text-align: left;
}

.form-actions {
    display: flex;
    flex-shrink: 0;
    gap: 10px;
    padding-top: 2px;
}

.form-action {
    flex: 1;
    height: 42px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 800;
    line-height:  42px;
}

.form-action.secondary {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(138, 138, 138, 0.12);
}

.form-action.primary {
    background: #88B194;
    color: #fff;
    box-shadow: 0 4px 10px rgba(91, 148, 105, 0.24);
}

@media screen and (max-height: 680px) {
    .page-heading {
        padding-top: 4px;
    }

    .category-swiper {
        height: 128px;
    }

    .category-swiper.sub-swiper {
        height: 43px;
    }

    .grid-item {
        height: 43px;
    }

    .icon-wrapper {
        width: 27px;
        height: 27px;
        font-size: 14px;
    }

    .cat-name {
        line-height: 14px;
    }
}

@media screen and (min-width: 600px) {
    .container {
        max-width: 520px;
        margin: 0 auto;
    }
}

 /* Picker Modal */
.picker-mask {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
}
.picker-modal {
    width: 80%;
    max-height: 72vh;
    padding: 20px;
    background: #fff;
    border-radius: 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}
.picker-title {
    text-align: center;
    font-weight: bold;
    margin-bottom: 15px;
}
.asset-list {
    max-height: 58vh;
    overflow-y: auto;
}
.asset-option {
    padding: 15px;
    border-bottom: 1px solid #f5f5f5;
    text-align: center;
    flex-shrink: 0;
}

.aa-receipt-picker {
    max-width: 420px;
}

.aa-receipt-option {
    padding: 12px 0;
    text-align: left;
}

.aa-receipt-option-main,
.aa-receipt-option-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.aa-receipt-option-main {
    color: var(--color-text);
    font-size: 13px;
    font-weight: 700;
}

.aa-receipt-option-main text:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.aa-receipt-option-main text:last-child,
.aa-receipt-option-meta {
    flex-shrink: 0;
    color: var(--color-text-light);
    font-size: 10px;
    font-weight: 400;
}

.aa-receipt-option-meta {
    margin-top: 4px;
}

.aa-receipt-empty {
    padding: 20px 0 6px;
    color: var(--color-text-light);
    font-size: 13px;
    text-align: center;
}

/* Transfer Area */
.transfer-area .source-account-row {
    display: flex;
}

.transfer-area {

    flex: 1;

    display: flex;

    justify-content: center;

    align-items: flex-start;

    padding:  8px 14px;

    padding-bottom: 16px;

    overflow-y: auto;

}



.transfer-card {

    width: 100%;

    background: var(--color-bg);

    border-radius: 16px;

    padding:  10px;

    box-shadow: -6px -6px 16px #ffffff, 6px 6px 16px #a3b1c6;

    display: flex;

    flex-direction: column;

    justify-content: flex-start;

    min-height: 0;

    height: auto;

    box-sizing: border-box;

}

.transfer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding:  10px;
    border-radius: 15px;
    background: #f0f4f8;
    margin-bottom: 10px;
    &:active {
        background: #e1e6eb;
    }
}

.fx-adjustment-row {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
}

.fx-mode-options {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 3px;
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.55);
}

.fx-mode-option {
    padding: 7px 4px;
    border-radius: 6px;
    color: var(--color-text-light);
    font-size: 12px;
    text-align: center;
}

.fx-mode-option.active {
    background: var(--glass-bg-strong);
    color: var(--color-text);
    font-weight: 700;
}

.transfer-divider {
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--color-text-light);
}

.row-label {
    display: flex;
    align-items: center;
    font-size:  13px;
    font-weight: bold;
    color: var(--color-text);
}

.row-icon {
    margin-right: 10px;
    font-size: 18px;
}

.row-right {
    display: flex;
    align-items: center;
}

.row-value {
    font-size:  13px;
    color: var(--color-text);
    margin-right: 5px;
}

.chevron {
    color: var(--color-text-light);
    font-size: 14px;
}

.fee-input {

    width: 110px;

    text-align: right;

    font-size: 16px;

    color: var(--color-text);

    border: none;

    background: transparent;

    

}

.fee-unit {

    font-size: 14px;

    color: var(--color-text-light);

    margin-left: 5px;

}



.currency-selector {

    min-width: 48px;

    height: 28px;

    line-height: 28px;

    padding: 0 10px;

    border-radius: 14px;

    background: #fff;

    color: var(--color-text);

    text-align: center;

    box-shadow: 0 2px 5px rgba(0,0,0,0.05);

}
</style>
