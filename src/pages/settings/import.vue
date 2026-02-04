<template>
  <view class="container">
    <view class="content-card neu-card">
      <view class="icon-wrapper">
        <text class="icon">📥</text>
      </view>
      <text class="title">导入数据</text>
      <text class="description">支持导入 Excel 格式的账单数据</text>
      
      <button class="neu-btn primary-btn" @click="handleImport">选择文件</button>
      
      <view class="tips">
        <text class="tip-title">导入说明：</text>
        <text class="tip-item">1. 请使用标准的 Excel (.xlsx) 格式</text>
        <text class="tip-item">2. 文件需包含：时间、类型、金额、分类、账户等列</text>
        <text class="tip-item">3. 建议先导出模板进行填写</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const handleImport = () => {
  uni.showToast({
    title: '功能开发中...',
    icon: 'none'
  })
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #FFF9F0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-card {
  width: 100%;
  padding: 40px 30px;
  background: #FFF9F0;
  border-radius: 20px;
  box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.1), -5px -5px 15px rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #FFF9F0;
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.icon {
  font-size: 40px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.description {
  font-size: 14px;
  color: #666;
  margin-bottom: 30px;
}

.neu-btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 10px;
  background: #FFF9F0;
  box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.1), -3px -3px 10px rgba(255, 255, 255, 0.7);
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 30px;
}

.neu-btn:active {
  box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.1), inset -3px -3px 6px rgba(255, 255, 255, 0.7);
}

.primary-btn {
  color: #FF8D5D;
}

.tips {
  width: 100%;
  text-align: left;
}

.tip-title {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.tip-item {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  line-height: 1.5;
}
</style>