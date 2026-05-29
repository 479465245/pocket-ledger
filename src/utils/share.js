import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

export const APP_SHARE_TITLE = '记账本 - 轻松记录每一笔'
export const APP_SHARE_PATH = '/pages/index/index'
export const APP_SHARE_TIMELINE_QUERY = ''

const safeEncode = (value) => encodeURIComponent(value == null ? '' : String(value))

export const stringifyQuery = (query = {}) => {
  return Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${safeEncode(key)}=${safeEncode(value)}`)
    .join('&')
}

const splitPath = (path = '') => {
  const [rawPath, rawQuery = ''] = String(path || '').split('?')
  return {
    path: rawPath || APP_SHARE_PATH,
    query: rawQuery
  }
}

export const getCurrentPagePath = (fallbackPath = APP_SHARE_PATH) => {
  try {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const currentPage = pages[pages.length - 1]
    if (!currentPage) return fallbackPath

    const route = currentPage.route ? `/${currentPage.route}` : fallbackPath
    const query = stringifyQuery(currentPage.options || {})
    return query ? `${route}?${query}` : route
  } catch (error) {
    return fallbackPath
  }
}

const resolveValue = (value, payload) => {
  return typeof value === 'function' ? value(payload) : value
}

export const buildShareMessage = (config = {}, payload = {}) => {
  const title = resolveValue(config.title, payload) || APP_SHARE_TITLE
  const path = resolveValue(config.path, payload) || getCurrentPagePath(config.fallbackPath || APP_SHARE_PATH)
  const imageUrl = resolveValue(config.imageUrl, payload)

  return {
    title,
    path,
    ...(imageUrl ? { imageUrl } : {})
  }
}

export const buildTimelineMessage = (config = {}, payload = {}) => {
  const title = resolveValue(config.timelineTitle, payload) || resolveValue(config.title, payload) || APP_SHARE_TITLE
  const message = buildShareMessage(config, payload)
  const { query } = splitPath(message.path)
  const imageUrl = resolveValue(config.imageUrl, payload)

  return {
    title,
    query,
    ...(imageUrl ? { imageUrl } : {})
  }
}

export const usePageShare = (config = {}) => {
  onShareAppMessage((res) => buildShareMessage(config, { res }))
  onShareTimeline(() => buildTimelineMessage(config))
}

export const enableWxShareMenu = () => {
  // #ifdef MP-WEIXIN
  const wxApi = typeof wx !== 'undefined' ? wx : null
  if (wxApi && typeof wxApi.showShareMenu === 'function') {
    wxApi.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  }
  // #endif
}
