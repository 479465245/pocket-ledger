import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const TEXT_PDF_MIN_LENGTH = 120

export const isPdfFile = (file = {}) => {
  const name = String(file.name || '').toLowerCase()
  const type = String(file.type || '').toLowerCase()
  return name.endsWith('.pdf') || type.includes('pdf')
}

const loadPdf = async (buffer) => {
  const task = pdfjsLib.getDocument({ data: buffer })
  return task.promise
}

export const extractPdfText = async (buffer, { maxPages = 10, onProgress } = {}) => {
  const pdf = await loadPdf(buffer)
  const totalPages = pdf.numPages
  const pageCount = Math.min(totalPages, maxPages)
  const texts = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress?.({ pageNumber, pageCount, totalPages })
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str || '').join(' ').trim()
    if (pageText) texts.push(`第 ${pageNumber} 页\n${pageText}`)
  }

  return {
    text: texts.join('\n\n'),
    totalPages,
    pageCount,
    isTextPdf: texts.join('').length >= TEXT_PDF_MIN_LENGTH
  }
}

export const renderPdfPagesToImages = async (buffer, {
  maxPages = 10,
  scale = 1.8,
  imageType = 'image/jpeg',
  quality = 0.82,
  onProgress
} = {}) => {
  const pdf = await loadPdf(buffer)
  const totalPages = pdf.numPages
  const pageCount = Math.min(totalPages, maxPages)
  const images = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress?.({ pageNumber, pageCount, totalPages })
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: context, viewport }).promise
    images.push({
      pageNumber,
      dataUrl: canvas.toDataURL(imageType, quality)
    })
  }

  return { images, totalPages, pageCount }
}
