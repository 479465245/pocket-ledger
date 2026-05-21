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
:root,
page {
  --neu-base: #e0e5ec;
  --neu-highlight: #ffffff;
  --neu-shadow: #a3b1c6;

  --color-primary: #FF8D5D; /* Warm Orange */
  --color-secondary: #88B194; /* Forest Green */
  --color-bg: #FFF9F0; /* Cream */
  --color-text: #4A4A4A;
  --color-text-light: #8A8A8A;

  --app-bg: #FFF9F0;
  --glass-bg: rgba(255, 249, 240, 0.86);
  --glass-bg-strong: rgba(255, 249, 240, 0.96);
  --glass-border: rgba(255, 255, 255, 0.58);
  --glass-blur: blur(14px);
  --glass-shadow: 8px 8px 18px rgba(163, 177, 198, 0.38), -8px -8px 18px rgba(255, 255, 255, 0.84);
  --glass-shadow-soft: 5px 5px 14px rgba(163, 177, 198, 0.28), -5px -5px 14px rgba(255, 255, 255, 0.78);

  --shadow-light: -6px -6px 16px var(--neu-highlight);
  --shadow-dark: 6px 6px 16px var(--neu-shadow);
  --shadow-inset-light: inset -6px -6px 16px var(--neu-highlight);
  --shadow-inset-dark: inset 6px 6px 16px var(--neu-shadow);
}

page {
  background-color: var(--app-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  min-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Cross-end control reset: keep H5/App button and form controls visually/clickably consistent */
button {
  margin: 0;
  padding: 0;
  border: none;
  line-height: normal;
  box-sizing: border-box;
  background: transparent;
  overflow: visible;
}

button::after {
  border: none;
}

input,
textarea {
  box-sizing: border-box;
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.4;
  min-width: 0;
  pointer-events: auto;
}

textarea {
  width: 100%;
  display: block;
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
}

/* Text Colors */
.text-primary { color: #FF8D5D; }
.text-secondary { color: #88B194; }
.text-dark { color: #4A4A4A; }
</style>
