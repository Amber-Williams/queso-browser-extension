import TurndownService from 'turndown'

import tablesPlugin from './md-tables-plugin'

const DEFAULT_READING_SPEED = 250
const SECONDS_PER_IMAGE = 4

export interface ReadTimeOptions {
  text?: string
  wordCount?: number
  includeImages: boolean
  imageCount: number
  roundUpMinutes: boolean
  readingSpeed?: number
}

export interface ReadTimeResult {
  wordCount: number
  imageTimeSeconds: number
  totalReadTimeMinutesRaw: number
  readTimeDisplay: string
}

function countWords(text: string | null | undefined): number {
  if (!text || typeof text !== 'string') {
    return 0
  }
  const trimmedText = text.trim().replace(/\s+/g, ' ')
  const words = trimmedText.split(' ').filter((word) => word.length > 0)
  return words.length
}

function estimateReadTime({
  text,
  wordCount,
  includeImages,
  imageCount,
  roundUpMinutes,
  readingSpeed = DEFAULT_READING_SPEED,
}: ReadTimeOptions): number {
  let calculatedWordCount = 0
  if (text !== undefined && text !== null) {
    calculatedWordCount = countWords(text)
  } else if (wordCount !== undefined && wordCount !== null) {
    calculatedWordCount = parseInt(String(wordCount), 10)
    if (isNaN(calculatedWordCount) || calculatedWordCount < 0) {
      calculatedWordCount = 0
    }
  }

  if (calculatedWordCount === 0 && (!includeImages || imageCount === 0)) {
    return 0
  }

  let readTimeMinutes = calculatedWordCount / readingSpeed
  let imageTimeSeconds = 0

  if (includeImages && imageCount > 0) {
    imageTimeSeconds = imageCount * SECONDS_PER_IMAGE
    const imageTimeMinutes = imageTimeSeconds / 60
    readTimeMinutes += imageTimeMinutes
  }

  let totalReadTimeMinutesRaw = readTimeMinutes

  if (roundUpMinutes) {
    if (totalReadTimeMinutesRaw * 60 >= 1) {
      totalReadTimeMinutesRaw = Math.ceil(totalReadTimeMinutesRaw)
    } else if (totalReadTimeMinutesRaw > 0) {
      totalReadTimeMinutesRaw = Math.ceil(totalReadTimeMinutesRaw)
    }
  }

  return totalReadTimeMinutesRaw
}

function getTitle() {
  const ogTitleTag = document.querySelector('meta[property="og:title"]')
  if (ogTitleTag) {
    const content = ogTitleTag.getAttribute('content')
    if (content) return content
  }

  const twitterTitleTag = document.querySelector('meta[name="twitter:title"]')
  if (twitterTitleTag) {
    const content = twitterTitleTag.getAttribute('content')
    if (content) return content
  }

  const metaTitleTag = document.querySelector('meta[name="title"]')
  if (metaTitleTag) {
    const content = metaTitleTag.getAttribute('content')
    if (content) return content
  }

  const titleTag = document.querySelector('title')
  if (titleTag && titleTag.textContent) {
    return titleTag.textContent
  }

  const h1Element = document.querySelector('h1')
  return h1Element ? h1Element.textContent : null
}

function getUrl() {
  const ogUrlTag = document.querySelector('meta[property="og:url"]')
  if (ogUrlTag) {
    const content = ogUrlTag.getAttribute('content')
    if (content) return content
  }

  const twitterUrlTag = document.querySelector('meta[name="twitter:url"]')
  if (twitterUrlTag) {
    const content = twitterUrlTag.getAttribute('content')
    if (content) return content
  }

  const canonicalLink = document.querySelector('link[rel="canonical"]')
  if (canonicalLink) {
    const href = canonicalLink.getAttribute('href')
    if (href) return href
  }

  return document?.location?.href
}

function getAuthor() {
  const authorMetaTag = document.querySelector('meta[name="author"]')
  if (authorMetaTag) {
    const content = authorMetaTag.getAttribute('content')
    if (content) return content
  }

  const ogAuthorTag = document.querySelector('meta[property="og:author"]')
  if (ogAuthorTag) {
    const content = ogAuthorTag.getAttribute('content')
    if (content) return content
  }

  const articleAuthorTag = document.querySelector('meta[property="article:author"]')
  if (articleAuthorTag) {
    const content = articleAuthorTag.getAttribute('content')
    if (content) return content
  }

  const twitterCreatorTag = document.querySelector('meta[name="twitter:creator"]')
  if (twitterCreatorTag) {
    const content = twitterCreatorTag.getAttribute('content')
    if (content) return content
  }

  return null
}

function getReadTime(): number {
  const text = document.body.innerText || ''
  const imageCount = document.querySelectorAll('img').length

  const options: ReadTimeOptions = {
    text: text,
    includeImages: true,
    imageCount: imageCount,
    roundUpMinutes: true,
    readingSpeed: DEFAULT_READING_SPEED,
  }

  return estimateReadTime(options)
}

function getSnapshot(): string {
  try {
    const docClone = document.cloneNode(true) as Document

    const scriptsAndStyles = docClone.querySelectorAll('script, style')
    scriptsAndStyles.forEach((element) => element.remove())

    let contentElement =
      docClone.querySelector('article') ||
      docClone.querySelector('main') ||
      docClone.querySelector('[role="main"]') ||
      docClone.querySelector('.content') ||
      docClone.querySelector('#content') ||
      docClone.querySelector('.post') ||
      docClone.querySelector('.entry') ||
      docClone.body

    if (!contentElement) {
      contentElement = docClone.body
    }

    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      hr: '---',
    })

    tablesPlugin(turndownService as any)

    const markdown = turndownService.turndown(contentElement.innerHTML)

    return markdown
  } catch (error) {
    console.error('Error converting HTML to markdown:', error)
    return document.body.innerText || ''
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTitle') {
    sendResponse({ data: getTitle() })
  } else if (request.action === 'getUrl') {
    sendResponse({ data: getUrl() })
  } else if (request.action === 'getAuthor') {
    sendResponse({ data: getAuthor() })
  } else if (request.action === 'getReadTime') {
    sendResponse({ data: getReadTime() })
  } else if (request.action === 'getSnapshot') {
    sendResponse({ data: getSnapshot() })
  }
})
