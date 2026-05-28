const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined' && typeof plus === 'undefined' && typeof wx === 'undefined'
const isAndroidApp = () => typeof plus !== 'undefined' && plus.os?.name === 'Android'
const getWxApi = () => {
  if (typeof uni !== 'undefined' && typeof uni.chooseMessageFile === 'function') return uni
  if (typeof wx !== 'undefined' && typeof wx.chooseMessageFile === 'function') return wx
  return null
}

const getExtensionAccept = (extensions = []) => extensions.map(ext => `.${String(ext).replace(/^\./, '')}`).join(',')

const getFileNameFromUri = (uri = '', fallbackPrefix = '文件') => {
  const clean = String(uri).split('?')[0]
  const last = clean.substring(clean.lastIndexOf('/') + 1)
  try {
    return decodeURIComponent(last) || `${fallbackPrefix}_${Date.now()}`
  } catch (error) {
    return last || `${fallbackPrefix}_${Date.now()}`
  }
}

const chooseFileByInput = ({ extensions = [], mimeType = '*/*' } = {}) => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = getExtensionAccept(extensions) || mimeType
    input.style.display = 'none'

    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input)
    }

    input.onchange = (event) => {
      const file = event.target.files?.[0]
      cleanup()
      if (file) {
        resolve(file)
      } else {
        reject(new Error('未选择文件'))
      }
    }
    input.oncancel = () => {
      cleanup()
      reject(new Error('已取消选择'))
    }

    document.body.appendChild(input)
    input.click()
  })
}

const chooseFileByUni = ({ extensions = [] } = {}) => {
  return new Promise((resolve, reject) => {
    uni.chooseFile({
      count: 1,
      type: 'all',
      extension: extensions,
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file) {
          resolve(file)
        } else {
          reject(new Error('未选择文件'))
        }
      },
      fail: (error) => reject(new Error(error.errMsg || '文件选择失败'))
    })
  })
}

const chooseFileByMessage = ({ extensions = [] } = {}) => {
  const wxApi = getWxApi()
  return new Promise((resolve, reject) => {
    wxApi.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: extensions,
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file) {
          resolve({
            ...file,
            name: file.name || getFileNameFromUri(file.path || file.tempFilePath),
            path: file.path || file.tempFilePath,
            tempFilePath: file.tempFilePath || file.path
          })
        } else {
          reject(new Error('未选择文件'))
        }
      },
      fail: (error) => {
        const message = error.errMsg || '文件选择失败'
        reject(new Error(message.includes('cancel') ? '已取消选择' : message))
      }
    })
  })
}

const readAndroidInputStream = (inputStream) => {
  plus.android.importClass(inputStream)
  const ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream')
  const outputStream = new ByteArrayOutputStream()
  plus.android.importClass(outputStream)

  const buffer = plus.android.newObject('[B', 8192)
  let length = inputStream.read(buffer)

  while (length !== -1) {
    outputStream.write(buffer, 0, length)
    length = inputStream.read(buffer)
  }

  const bytes = outputStream.toByteArray()
  const size = bytes.length
  const array = new Uint8Array(size)
  for (let index = 0; index < size; index += 1) {
    array[index] = bytes[index] & 0xff
  }
  outputStream.close()
  inputStream.close()
  return array.buffer
}

const chooseFileByAndroidIntent = ({ mimeType = '*/*' } = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const Intent = plus.android.importClass('android.content.Intent')
      const activity = plus.android.runtimeMainActivity()
      const requestCode = Date.now() % 100000
      const oldOnActivityResult = activity.onActivityResult

      activity.onActivityResult = (req, resultCode, data) => {
        if (req !== requestCode) {
          if (typeof oldOnActivityResult === 'function') oldOnActivityResult(req, resultCode, data)
          return
        }

        activity.onActivityResult = oldOnActivityResult

        try {
          if (!data) {
            reject(new Error('已取消选择'))
            return
          }

          plus.android.importClass(data)
          const uri = data.getData()
          if (!uri) {
            reject(new Error('未选择文件'))
            return
          }

          const resolver = activity.getContentResolver()
          plus.android.importClass(resolver)
          const inputStream = resolver.openInputStream(uri)
          if (!inputStream) {
            reject(new Error('读取文件失败'))
            return
          }

          const uriString = String(uri.toString())
          resolve({
            name: getFileNameFromUri(uriString),
            path: uriString,
            tempFilePath: uriString,
            arrayBuffer: readAndroidInputStream(inputStream)
          })
        } catch (error) {
          reject(new Error(error.message || '读取文件失败'))
        }
      }

      const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      intent.setType(mimeType)
      intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      activity.startActivityForResult(intent, requestCode)
    } catch (error) {
      reject(new Error(error.message || '文件选择失败'))
    }
  })
}

export const chooseLocalFile = async (options = {}) => {
  if (isAndroidApp()) {
    return chooseFileByAndroidIntent(options)
  }

  if (getWxApi()) {
    return chooseFileByMessage(options)
  }

  if (typeof uni !== 'undefined' && typeof uni.chooseFile === 'function') {
    return chooseFileByUni(options)
  }

  if (isBrowser()) {
    return chooseFileByInput(options)
  }

  throw new Error('当前平台不支持选择文件')
}
