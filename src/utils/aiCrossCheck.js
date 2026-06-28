import { createChatCompletion, getLlmConfig } from '@/utils/llm'
import { parseTimestamp, roundMoney } from '@/utils/crossCheck'
import { extractPdfText, renderPdfPagesToImages } from '@/utils/pdfPages'

const MAX_PDF_PAGES = 10
const ALLOWED_TYPES = new Set(['income', 'expense', 'refund', 'transfer'])

const stripJsonFence = (content = '') => String(content)
  .trim()
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/```$/i, '')
  .trim()

const parseLlmJson = (content) => {
  const text = stripJsonFence(content)
  try {
    return JSON.parse(text)
  } catch (error) {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1))
    throw new Error('AI 返回内容不是有效 JSON')
  }
}

export const normalizeAiRows = (rows = []) => {
  const warnings = []
  const validRows = []

  if (!Array.isArray(rows)) return { rows: [], warnings: ['AI 返回的 rows 不是数组'] }

  rows.forEach((row, index) => {
    const type = String(row.type || '').trim()
    const amount = roundMoney(Math.abs(Number(row.amount || 0)))
    const date = String(row.date || '').trim().slice(0, 10)
    const timestamp = parseTimestamp(date)

    if (!ALLOWED_TYPES.has(type)) {
      warnings.push(`第 ${index + 1} 行类型无效，已忽略`)
      return
    }
    if (!date || Number.isNaN(timestamp)) {
      warnings.push(`第 ${index + 1} 行日期无效，已忽略`)
      return
    }
    if (!amount) {
      warnings.push(`第 ${index + 1} 行金额无效，已忽略`)
      return
    }

    validRows.push({
      id: row.id || `ai-pdf-${Date.now()}-${index}`,
      rowIndex: index + 1,
      provider: 'ai-pdf',
      date,
      type,
      amount,
      asset: row.asset || '',
      paymentMethod: row.paymentMethod || '',
      counterparty: row.counterparty || '',
      remark: row.remark || '',
      orderNo: row.orderNo || '',
      isIncludedInStats: row.isIncludedInStats !== false,
      raw: row
    })
  })

  return { rows: validRows, warnings }
}

const buildPrompt = ({ assetName, startDate, endDate, text }) => {
  return [
    '请从用户提供的账单 PDF 内容中提取交易流水，用于本地记账应用的交叉校验。',
    `校验资产：${assetName || '未指定'}`,
    `日期范围：${startDate} 至 ${endDate}`,
    '只返回纯 JSON，不要使用 Markdown，不要添加解释。',
    'JSON 格式：{"rows":[{"date":"YYYY-MM-DD","type":"income|expense|refund|transfer","amount":0,"asset":"","counterparty":"","remark":"","orderNo":"","paymentMethod":""}],"warnings":[]}',
    'amount 使用正数；支出/收入方向只通过 type 表示；无法确定的行不要放入 rows，可写入 warnings。',
    text ? `PDF 文本内容：\n${text}` : 'PDF 是扫描件或图片型页面，请直接从后续图片中识别流水。'
  ].join('\n')
}

const createPdfMessages = ({ assetName, startDate, endDate, text, images }) => {
  const prompt = buildPrompt({ assetName, startDate, endDate, text })
  const userContent = images?.length
    ? [
        { type: 'text', text: prompt },
        ...images.map(image => ({
          type: 'image_url',
          image_url: { url: image.dataUrl }
        }))
      ]
    : prompt

  return [
    {
      role: 'system',
      content: '你是账单流水识别助手。你必须严格返回 JSON，并只根据用户提供的 PDF 文本或图片提取交易流水。'
    },
    {
      role: 'user',
      content: userContent
    }
  ]
}

export const parsePdfStatementWithLlm = async ({ buffer, assetName, startDate, endDate, onProgress }) => {
  const config = getLlmConfig()
  onProgress?.('正在提取 PDF 文本...')
  const textResult = await extractPdfText(buffer, {
    maxPages: MAX_PDF_PAGES,
    onProgress: ({ pageNumber, pageCount }) => onProgress?.(`正在提取 PDF 文本 ${pageNumber}/${pageCount}...`)
  })

  let images = []
  if (!textResult.isTextPdf) {
    onProgress?.('正在渲染 PDF 页面图片...')
    const imageResult = await renderPdfPagesToImages(buffer, {
      maxPages: MAX_PDF_PAGES,
      onProgress: ({ pageNumber, pageCount }) => onProgress?.(`正在渲染 PDF 页面 ${pageNumber}/${pageCount}...`)
    })
    images = imageResult.images
  }

  onProgress?.('正在调用 AI 识别流水...')
  const content = await createChatCompletion({
    config,
    messages: createPdfMessages({
      assetName,
      startDate,
      endDate,
      text: textResult.text,
      images
    })
  })

  onProgress?.('正在校验 AI 识别结果...')
  const result = parseLlmJson(content)
  const normalized = normalizeAiRows(result.rows)
  const pageWarning = textResult.totalPages > MAX_PDF_PAGES
    ? [`PDF 共 ${textResult.totalPages} 页，本次仅处理前 ${MAX_PDF_PAGES} 页`]
    : []

  return {
    provider: 'ai-pdf',
    rows: normalized.rows,
    warnings: [
      ...pageWarning,
      ...(Array.isArray(result.warnings) ? result.warnings : []),
      ...normalized.warnings
    ],
    usedImages: images.length > 0
  }
}
