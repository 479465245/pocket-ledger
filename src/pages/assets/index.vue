<template>
  <view class="container">
    <view class="fixed-header">
        <view class="header">
            <text class="title">总资产</text>
            <text class="amount">¥ {{ totalAsset }}</text>
        </view>
    </view>

    <scroll-view scroll-y class="asset-scroll">
        <view class="asset-list">
            <view v-for="asset in assets" :key="asset.id" class="neu-card asset-item">
                <view class="asset-info">
                    <text class="asset-name">{{ asset.name }}</text>
                    <text class="asset-type">{{ getTypeName(asset.type) }}</text>
                </view>
                <view class="asset-balance">
                    <text>¥ {{ asset.currentBalance.toFixed(2) }}</text>
                </view>
            </view>
        </view>
    </scroll-view>

    <!-- Floating Action Button for Add Asset (Optional, not strictly requested but good) -->
    <view class="fab neu-btn" @click="showAddAsset = true">+</view>

    <!-- Add Asset Modal -->
    <view v-if="showAddAsset" class="modal-mask">
        <view class="modal neu-card">
            <view class="modal-title">添加资产</view>
            <input class="neu-input mb-20" v-model="newAsset.name" placeholder="资产名称 (如: 工资卡)" />
            <input class="neu-input mb-20" v-model="newAsset.balance" type="digit" placeholder="初始余额" />
            <view class="modal-actions">
                <button class="neu-btn cancel" @click="showAddAsset = false">取消</button>
                <button class="neu-btn confirm" @click="confirmAddAsset">确定</button>
            </view>
        </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAssetStore } from '@/store/asset'

const assetStore = useAssetStore()

const showAddAsset = ref(false)
const newAsset = reactive({ name: '', balance: '' })

onShow(() => {
    assetStore.init()
})

const assets = computed(() => assetStore.assets)

const totalAsset = computed(() => {
    return assets.value.reduce((acc, cur) => acc + cur.currentBalance, 0).toFixed(2)
})

const getTypeName = (type) => {
    const map = {
        'cash': '现金',
        'digital': '电子钱包',
        'bank': '银行卡'
    }
    return map[type] || type
}

const confirmAddAsset = () => {
    if (!newAsset.name) return
    assetStore.addAsset(newAsset.name, 'digital', newAsset.balance || 0)
    showAddAsset.value = false
    newAsset.name = ''
    newAsset.balance = ''
}
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fixed-header {
    padding: 20px;
    padding-bottom: 0;
    flex-shrink: 0;
}

.header {
    margin-bottom: 30px;
    padding: 20px;
}
.title {
    display: block;
    color: var(--color-text-light);
    margin-bottom: 10px;
}
.amount {
    font-size: 32px;
    font-weight: bold;
    color: var(--color-text);
}

.asset-scroll {
    flex: 1;
    overflow-y: hidden;
}

.asset-list {
    padding: 0 20px 20px 20px;
}

.asset-item {
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.asset-name {
    font-weight: bold;
    font-size: 16px;
    display: block;
}
.asset-type {
    font-size: 12px;
    color: var(--color-text-light);
}
.asset-balance {
    font-size: 18px;
    font-weight: bold;
    color: var(--color-primary);
}

.fab {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    font-size: 30px;
    z-index: 100;
}

/* Modal */
.modal-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
}
.modal {
    width: 80%;
    padding: 20px;
    background: var(--color-bg);
}
.modal-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 20px;
    text-align: center;
}
.mb-20 {
    margin-bottom: 20px;
}
.modal-actions {
    display: flex;
    justify-content: space-between;
    
    button {
        width: 45%;
        font-size: 14px;
        height: 40px;
    }
    
    .cancel { color: var(--color-text-light); }
    .confirm { color: var(--color-primary); }
}
</style>
