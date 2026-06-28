const getBuildPlatform = () => {
  if (typeof process === 'undefined') return ''
  return process.env?.UNI_PLATFORM || ''
}

export const getUniPlatform = () => {
  const buildPlatform = getBuildPlatform()
  if (buildPlatform) return buildPlatform
  if (typeof uni === 'undefined') return ''
  return uni.getSystemInfoSync?.().uniPlatform || uni.getSystemInfoSync?.().platform || ''
}

export const isWebRuntime = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const platform = getUniPlatform()
  if (platform) return platform === 'web' || platform === 'h5'
  return !window.plus
}

export const isAppPlusRuntime = () => {
  if (typeof plus === 'undefined') return false
  const platform = getUniPlatform()
  return platform === 'app' || platform === 'app-plus' || !isWebRuntime()
}

export const isAndroidAppRuntime = () => isAppPlusRuntime() && plus.os?.name === 'Android'
