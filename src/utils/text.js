export const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&gt[;；]?/g, '＞')
  .replace(/&lt[;；]?/g, '＜')
  .replace(/&amp[;；]?/g, '&')
  .replace(/&quot[;；]?/g, '"')
  .replace(/&#39[;；]?/g, "'")

export const decodeUtf8 = (buffer) => {
  if (typeof buffer === 'string') return buffer

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(buffer)
  }

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let result = ''
  let index = 0

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    index = 3
  }

  while (index < bytes.length) {
    const first = bytes[index]

    if (first < 0x80) {
      result += String.fromCharCode(first)
      index += 1
      continue
    }

    if (first >= 0xc0 && first < 0xe0 && index + 1 < bytes.length) {
      const second = bytes[index + 1]
      result += String.fromCharCode(((first & 0x1f) << 6) | (second & 0x3f))
      index += 2
      continue
    }

    if (first >= 0xe0 && first < 0xf0 && index + 2 < bytes.length) {
      const second = bytes[index + 1]
      const third = bytes[index + 2]
      result += String.fromCharCode(((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f))
      index += 3
      continue
    }

    if (first >= 0xf0 && first < 0xf8 && index + 3 < bytes.length) {
      const second = bytes[index + 1]
      const third = bytes[index + 2]
      const fourth = bytes[index + 3]
      let codePoint = ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f)
      codePoint -= 0x10000
      result += String.fromCharCode(0xd800 + (codePoint >> 10), 0xdc00 + (codePoint & 0x3ff))
      index += 4
      continue
    }

    result += '�'
    index += 1
  }

  return result
}

export const decodeText = (buffer, encoding = 'utf-8') => {
  if (typeof buffer === 'string') return buffer

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder(encoding).decode(buffer)
  }

  return decodeUtf8(buffer)
}
