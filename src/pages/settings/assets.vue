<template>
  <view class="container">
    <!-- 总资产卡片 -->
    <view class="total-assets-card neu-card">
      <text class="label">总资产</text>
      <text class="amount">¥ {{ totalAsset }}</text>
    </view>

    <!-- 资产列表 -->
    <scroll-view scroll-y class="asset-scroll">
      <view class="asset-list">
        <view v-if="assets.length === 0" class="empty-tip">暂无资产</view>
        <view v-for="asset in assets" :key="asset.id" class="asset-item-wrapper">
          <view
            class="asset-item-container"
            :class="{ 'show-actions': activeAssetId === asset.id }"
            :data-asset-id="asset.id"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
          >
            <view class="neu-card asset-item">
              <view class="asset-info">
                <text class="asset-name">{{ asset.name }}</text>
                <text class="asset-type">{{ getTypeName(asset.type) }}</text>
              </view>
              <view class="asset-balance">
                <text v-for="line in getAssetBalanceLines(asset)" :key="line" class="balance-line">{{ line }}</text>
              </view>
            </view>
            <view class="action-buttons">
              <button class="action-btn edit-btn" @click.stop="openEditAsset(asset)">编辑</button>
              <button class="action-btn delete-btn" @click.stop="confirmDeleteAsset(asset)">删除</button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 添加资产按钮 -->
    <view class="fab neu-btn" @click="openAddAsset">+</view>

    <!-- 添加/编辑资产弹窗 -->
    <view v-if="showAssetModal" class="modal-mask">
      <view class="modal neu-card" @click.stop>
        <view class="modal-title">{{ isEditMode ? '编辑资产' : '添加资产' }}</view>
        <view class="input-wrap" @click.stop="focusNameInput">
          <input
            class="neu-input"
            :value="assetForm.name"
            :focus="nameInputFocus"
            placeholder="资产名称 (如: 工资卡)"
            confirm-type="next"
            @focus="nameInputFocus = true"
            @blur="nameInputFocus = false"
            @input="onAssetNameInput"
          />
        </view>
        <view class="input-wrap" @click.stop="focusBalanceInput">
          <input
            class="neu-input"
            :value="assetForm.balance"
            :focus="balanceInputFocus"
            type="digit"
            :placeholder="isEditMode ? '总金额' : '初始余额'"
            confirm-type="done"
            @focus="balanceInputFocus = true"
            @blur="balanceInputFocus = false"
            @input="onAssetBalanceInput"
          />
        </view>
        <text v-if="isEditMode" class="edit-tip">修改总金额后，会自动生成一条资产调整记录。</text>
        <view class="modal-actions">
          <button class="neu-btn cancel" @click="closeAssetModal">取消</button>
          <button class="neu-btn confirm" @click="confirmSaveAsset">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'
import { useBillStore } from '@/store/bill'
import { ASSET_ADJUSTMENT_CATEGORY_ID } from '@/store/category'
import { formatCurrencyAmount } from '@/utils/currency'

const assetStore = useAssetStore()
const billStore = useBillStore()

const showAssetModal = ref(false)
const isEditMode = ref(false)
const editingAssetId = ref('')
const assetForm = reactive({ name: '', balance: '' })
const nameInputFocus = ref(false)
const balanceInputFocus = ref(false)

const activeAssetId = ref(null)
const touchStartX = ref(0)
const touchStartY = ref(0)
const isMoving = ref(false)

onShow(() => {
  assetStore.init()
  billStore.init()
})

const assets = computed(() => assetStore.assets)

const totalAsset = computed(() => {
  return assets.value.reduce((acc, cur) => acc + Number(cur.currentBalance || 0), 0).toFixed(2)
})

const getAssetBalanceLines = (asset) => {
  const balances = asset.balances || { CNY: asset.currentBalance || 0 }
  return Object.entries(balances)
    .filter(([, amount]) => Number(amount || 0) !== 0)
    .map(([currency, amount]) => formatCurrencyAmount(amount, currency))
    .concat(Object.values(balances).some(amount => Number(amount || 0) !== 0) ? [] : [formatCurrencyAmount(0, 'CNY')])
}

const getTypeName = (type) => {
  const map = {
    'cash': '现金',
    'digital': '电子钱包',
    'bank': '银行卡',
    'credit': '信用账户'
  }
  return map[type] || type
}

const focusNameInput = async () => {
  balanceInputFocus.value = false
  await nextTick()
  nameInputFocus.value = true
}

const focusBalanceInput = async () => {
  nameInputFocus.value = false
  await nextTick()
  balanceInputFocus.value = true
}

const onAssetNameInput = (e) => {
  assetForm.name = e.detail.value
}

const onAssetBalanceInput = (e) => {
  assetForm.balance = e.detail.value
}

const resetInputFocus = () => {
  nameInputFocus.value = false
  balanceInputFocus.value = false
}

const openAddAsset = () => {
  resetInputFocus()
  isEditMode.value = false
  editingAssetId.value = ''
  assetForm.name = ''
  assetForm.balance = ''
  activeAssetId.value = null
  showAssetModal.value = true
}

const openEditAsset = (asset) => {
  resetInputFocus()
  isEditMode.value = true
  editingAssetId.value = asset.id
  activeAssetId.value = null
  showAssetModal.value = true

  setTimeout(() => {
    assetForm.name = asset.name || ''
    assetForm.balance = Number(asset.currentBalance || 0).toFixed(2)
  }, 0)
}

const closeAssetModal = () => {
  resetInputFocus()
  showAssetModal.value = false
  isEditMode.value = false
  editingAssetId.value = ''
  assetForm.name = ''
  assetForm.balance = ''
}

const confirmSaveAsset = async () => {
  const name = assetForm.name.trim()
  const balance = Number(assetForm.balance || 0)

  if (!name) {
    uni.showToast({ title: '请输入资产名称', icon: 'none' })
    return
  }

  if (Number.isNaN(balance)) {
    uni.showToast({ title: '请输入正确金额', icon: 'none' })
    return
  }

  try {
    if (!isEditMode.value) {
      const asset = assetStore.addAsset(name, 'digital', 0)

      if (balance !== 0) {
        await billStore.addBill({
          amount: balance,
          assetId: asset.id,
          type: 'adjustment',
          timestamp: null,
          remark: `资产新建：${balance.toFixed(2)}`,
          currency: 'CNY',
          targetCurrency: 'CNY',
          parentCategoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
          categoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
          isIncludedInStats: false,
          fee: 0
        })
      }

      uni.showToast({ title: '已添加' })
      closeAssetModal()
      return
    }

    const asset = assetStore.getAsset(editingAssetId.value)
    if (!asset) {
      uni.showToast({ title: '资产不存在', icon: 'none' })
      closeAssetModal()
      return
    }

    const oldBalance = Number(asset.currentBalance || 0)
    const delta = Number((balance - oldBalance).toFixed(2))

    assetStore.updateAsset(asset.id, { name })

    if (delta !== 0) {
      await billStore.addBill({
        amount: delta,
        assetId: asset.id,
        type: 'adjustment',
        timestamp: Date.now(),
        remark: `资产调整：${oldBalance.toFixed(2)} → ${balance.toFixed(2)}`,
        currency: 'CNY',
        targetCurrency: 'CNY',
        parentCategoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
        categoryId: ASSET_ADJUSTMENT_CATEGORY_ID,
        isIncludedInStats: false,
        fee: 0
      })
    }

    uni.showToast({ title: delta === 0 ? '已更新' : '已调整' })
    closeAssetModal()
  } catch (error) {
    console.error(error)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const confirmDeleteAsset = (asset) => {
  activeAssetId.value = null
  uni.showModal({
    title: '删除资产',
    content: `确定删除「${asset.name}」吗？只会删除该资产，不会修正或删除其他记录。`,
    success: (res) => {
      if (!res.confirm) return
      try {
        assetStore.deleteAsset(asset.id)
        uni.showToast({ title: '已删除' })
      } catch (error) {
        console.error(error)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    }
  })
}

const onTouchStart = (e) => {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
  isMoving.value = false
}

const onTouchMove = (e) => {
  const deltaX = e.touches[0].clientX - touchStartX.value
  const deltaY = e.touches[0].clientY - touchStartY.value

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    isMoving.value = true
  }
}

const onTouchEnd = (e) => {
  if (!isMoving.value) return

  const deltaX = e.changedTouches[0].clientX - touchStartX.value
  const assetId = e.currentTarget.dataset.assetId

  if (deltaX < -50) {
    activeAssetId.value = assetId
  } else if (deltaX > 50) {
    activeAssetId.value = null
  }

  isMoving.value = false
}
</script>

<style scoped>
.container {
  padding: 20px;
  background: var(--app-bg);
  min-height: 100vh;
  position: relative;
}

.total-assets-card {
  padding: 30px;
  margin-bottom: 20px;
  text-align: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 26px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.label {
  display: block;
  font-size: 16px;
  color: var(--color-text-light);
  margin-bottom: 10px;
}

.amount {
  display: block;
  font-size: 36px;
  font-weight: bold;
  color: var(--color-text);
}

.asset-scroll {
  flex: 1;
  height: calc(100vh - 250px);
}

.asset-list {
  display: flex;
  flex-direction: column;
}

.empty-tip {
  text-align: center;
  color: #999;
  margin-top: 50px;
}

.asset-item-wrapper {
  position: relative;
  margin-bottom: 15px;
  overflow: hidden;
}

.asset-item-container {
  position: relative;
  transition: transform 0.3s ease;
}

.asset-item-container.show-actions {
  transform: translateX(-180rpx);
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 18px;
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  position: relative;
  z-index: 1;
}

.action-buttons {
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 180rpx;
  display: flex;
  align-items: stretch;
}

.action-btn {
  flex: 1;
  height: 100%;
  border: none;
  border-radius: 0;
  font-size: 26rpx;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.edit-btn {
  background-color: #007aff;
}

.delete-btn {
  background-color: #ff3b30;
}

.asset-info {
  display: flex;
  flex-direction: column;
}

.asset-name {
  font-size: 18px;
  font-weight: bold;
  color: var(--color-text);
}

.asset-type {
  font-size: 14px;
  color: var(--color-text-light);
  margin-top: 5px;
}

.asset-balance {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-primary);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.balance-line {
  display: block;
  line-height: 1.5;
}

.fab {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-primary);
  border: none;
  z-index: 100;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.modal {
  width: 80%;
  max-width: 400px;
  padding: 30px;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  position: relative;
  z-index: 1001;
  pointer-events: auto;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: var(--color-text);
}

.input-wrap {
  width: 100%;
  height: 52px;
  margin-bottom: 15px;
  position: relative;
  z-index: 1002;
  pointer-events: auto;
}

.neu-input {
  width: 100%;
  height: 52px;
  min-height: 52px;
  line-height: 52px;
  padding: 0 15px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: var(--glass-bg);
  box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
  font-size: 16px;
  box-sizing: border-box;
  color: var(--color-text);
  position: relative;
  z-index: 1003;
  pointer-events: auto;
}

.mb-20 {
  margin-bottom: 20px;
}

.edit-tip {
  display: block;
  color: #999;
  font-size: 12px;
  line-height: 1.5;
  margin: -5px 0 15px;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: space-between;
}

.neu-btn {
  flex: 1;
  padding: 15px;
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  background: var(--glass-bg-strong);
  box-shadow: var(--glass-shadow-soft);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.neu-btn:active {
  box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
}

.cancel {
  color: #666;
}

.confirm {
  color: var(--color-primary);
  font-weight: bold;
}
</style>
