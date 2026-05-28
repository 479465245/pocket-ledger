const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined' && typeof plus === 'undefined' && typeof wx === 'undefined'
const isAppPlus = () => typeof plus !== 'undefined'
const getWxApi = () => (typeof wx !== 'undefined' ? wx : null)

const getUserDataPath = () => {
  if (typeof uni !== 'undefined' && uni.env?.USER_DATA_PATH) return uni.env.USER_DATA_PATH
  const wxApi = getWxApi()
  if (wxApi?.env?.USER_DATA_PATH) return wxApi.env.USER_DATA_PATH
  return ''
}

const getFileSystemManager = () => {
  if (typeof uni !== 'undefined' && typeof uni.getFileSystemManager === 'function') return uni.getFileSystemManager()
  const wxApi = getWxApi()
  if (wxApi && typeof wxApi.getFileSystemManager === 'function') return wxApi.getFileSystemManager()
  return null
}

const showSavedModal = ({ filePath, fileName, canOpen = false, openFile }) => {
  const content = filePath
    ? `文件已保存：${filePath}`
    : `文件已生成：${fileName}`

  uni.showModal({
    title: '导出完成',
    content,
    confirmText: canOpen ? '打开文件' : '复制路径',
    cancelText: '知道了',
    success: (res) => {
      if (!res.confirm) return
      if (canOpen && typeof openFile === 'function') {
        openFile()
        return
      }
      if (filePath) uni.setClipboardData({ data: filePath })
    }
  })
}

const saveByBrowser = ({ fileName, content, mimeType }) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
  return { filePath: '', fileName }
}

const saveByFileSystemManager = ({ fileName, content, encoding = 'utf8', openType }) => {
  const userDataPath = getUserDataPath()
  const fs = getFileSystemManager()

  if (!userDataPath || !fs) {
    throw new Error('当前平台暂不支持直接保存文件')
  }

  const filePath = `${userDataPath}/${fileName}`

  return new Promise((resolve, reject) => {
    fs.writeFile({
      filePath,
      data: content,
      encoding,
      success: () => {
        const openFile = () => {
          if (typeof uni !== 'undefined' && typeof uni.openDocument === 'function') {
            uni.openDocument({
              filePath,
              fileType: openType,
              showMenu: true,
              fail: () => uni.showToast({ title: '打开文件失败，可复制路径查看', icon: 'none' })
            })
          }
        }
        showSavedModal({ filePath, fileName, canOpen: typeof uni !== 'undefined' && typeof uni.openDocument === 'function', openFile })
        resolve({ filePath, fileName })
      },
      fail: (error) => reject(new Error(error.errMsg || '保存文件失败'))
    })
  })
}

const saveByPlus = ({ fileName, content }) => {
  return new Promise((resolve, reject) => {
    try {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.getFile(fileName, { create: true }, (entry) => {
          entry.createWriter((writer) => {
            writer.onwrite = () => {
              const filePath = typeof entry.toLocalURL === 'function' ? entry.toLocalURL() : (entry.fullPath || `_doc/${fileName}`)
              showSavedModal({
                filePath,
                fileName,
                canOpen: true,
                openFile: () => {
                  plus.runtime.openFile(filePath, {}, () => {
                    uni.showToast({ title: '打开文件失败，可复制路径查看', icon: 'none' })
                  })
                }
              })
              resolve({ filePath, fileName })
            }
            writer.onerror = () => reject(new Error('保存文件失败'))
            writer.write(content)
          }, () => reject(new Error('创建文件写入器失败')))
        }, () => reject(new Error('创建文件失败')))
      }, () => reject(new Error('访问应用文件目录失败')))
    } catch (error) {
      reject(new Error(error.message || '保存文件失败'))
    }
  })
}

export const saveLocalFile = async ({ fileName, content, mimeType = 'application/octet-stream', encoding = 'utf8', openType = '' }) => {
  if (isAppPlus()) {
    return saveByPlus({ fileName, content, mimeType, encoding, openType })
  }

  if (isBrowser()) {
    return saveByBrowser({ fileName, content, mimeType })
  }

  return saveByFileSystemManager({ fileName, content, mimeType, encoding, openType })
}
