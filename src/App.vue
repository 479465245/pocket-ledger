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
  --neu-base: rgba(248, 250, 255, 0.66);
  --neu-highlight: rgba(255, 255, 255, 0.92);
  --neu-shadow: rgba(80, 96, 128, 0.16);
  
  --color-primary: #FF8D5D;
  --color-secondary: #3D9B72;
  --color-bg: #F7FAFF;
  --color-text: #233041;
  --color-text-light: #728095;
  --app-bg:
    radial-gradient(circle at 12% 4%, rgba(255, 141, 93, 0.22), transparent 28%),
    radial-gradient(circle at 88% 10%, rgba(61, 155, 114, 0.18), transparent 30%),
    radial-gradient(circle at 50% 92%, rgba(94, 153, 255, 0.18), transparent 34%),
    linear-gradient(145deg, #F8FBFF 0%, #F3F7FF 45%, #FFF7F1 100%);
  --glass-bg: rgba(255, 255, 255, 0.48);
  --glass-bg-strong: rgba(255, 255, 255, 0.68);
  --glass-bg-soft: rgba(255, 255, 255, 0.28);
  --glass-border: rgba(255, 255, 255, 0.62);
  --glass-border-dark: rgba(91, 112, 145, 0.12);
  --glass-blur: blur(24px) saturate(1.55);
  --glass-shadow:
    0 18px 45px rgba(42, 58, 88, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    inset 0 -1px 0 rgba(91, 112, 145, 0.08);
  --glass-shadow-soft:
    0 10px 26px rgba(42, 58, 88, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
  
  --shadow-light: 0 14px 36px rgba(42, 58, 88, 0.10);
  --shadow-dark: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  
  --shadow-inset-light: inset 0 1px 1px rgba(255, 255, 255, 0.82);
  --shadow-inset-dark: inset 0 -1px 8px rgba(42, 58, 88, 0.08);
}

page {
  background: var(--app-bg);
  color: var(--color-text);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Segoe UI, Arial, Roboto, 'PingFang SC', 'miui', 'Hiragino Sans GB', 'Microsoft Yahei', sans-serif;
  height: 100%; 
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

button,
input,
textarea {
  font-family: inherit;
}

/* Utilities */
.neu-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.neu-card-top {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 26px 26px 0 0;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.neu-card-small {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.neu-btn {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 50px;
  box-shadow: var(--glass-shadow-soft);
  color: var(--color-primary);
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.8);
    box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
  }
}

.neu-btn-small,
.neu-inset {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow-soft);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.neu-input {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--shadow-inset-light), var(--shadow-inset-dark);
  padding: 10px 15px;
  outline: none;
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

/* Text Colors */
.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-secondary); }
.text-dark { color: var(--color-text); }
</style>
