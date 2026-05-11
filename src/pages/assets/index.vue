<template>
  <view class="deprecated-page">
    <view class="card">
      <text class="title">旧版资产页面已废弃</text>
      <text class="desc">当前正式入口已迁移到 /pages/settings/assets，请不要继续维护这个文件的业务逻辑。</text>
    </view>
  </view>
</template>

<script setup>
// 废弃页面：保留仅用于提示维护者，未在 pages.json 注册。
</script>

<style scoped>
.deprecated-page {
  min-height: 100vh;
  padding: 40rpx;
  background: var(--app-bg);
}
.card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 20rpx;
  padding: 40rpx;
}
.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  color: #333;
}
.desc {
  color: #666;
  line-height: 1.7;
}
</style>

