<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
/* Global CSS */
:root {
  --neu-base: #e0e5ec;
  --neu-highlight: #ffffff;
  --neu-shadow: #a3b1c6;
  
  --color-primary: #FF8D5D; /* Warm Orange */
  --color-secondary: #88B194; /* Forest Green */
  --color-bg: #FFF9F0; /* Cream */
  --color-text: #4A4A4A;
  --color-text-light: #8A8A8A;
  
  --shadow-light: -6px -6px 16px var(--neu-highlight);
  --shadow-dark: 6px 6px 16px var(--neu-shadow);
  
  --shadow-inset-light: inset -6px -6px 16px var(--neu-highlight);
  --shadow-inset-dark: inset 6px 6px 16px var(--neu-shadow);
}

/* Custom Neumorphism Theme Variables based on User Request */
/* Re-defining based on specific colors provided */
page {
  background-color: #FFF9F0;
  color: #4A4A4A;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  height: 100%;
  overflow: hidden;
}

/* Utilities */
.neu-card {
  background: #FFF9F0;
  border-radius: 20px;
  box-shadow: 8px 8px 16px #d9d4cc, -8px -8px 16px #ffffff;
}

.neu-btn {
  background: #FFF9F0;
  border-radius: 50px;
  box-shadow: 5px 5px 10px #d9d4cc, -5px -5px 10px #ffffff;
  color: #FF8D5D;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:active {
    box-shadow: inset 5px 5px 10px #d9d4cc, inset -5px -5px 10px #ffffff;
  }
}

.neu-input {
  background: #FFF9F0;
  border-radius: 12px;
  box-shadow: inset 4px 4px 8px #d9d4cc, inset -4px -4px 8px #ffffff;
  padding: 10px 15px;
  border: none;
  outline: none;
}

/* Text Colors */
.text-primary { color: #FF8D5D; }
.text-secondary { color: #88B194; }
.text-dark { color: #4A4A4A; }
</style>
