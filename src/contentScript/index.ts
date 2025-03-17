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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTitle') {
    sendResponse({ data: getTitle() })
  } else if (request.action === 'getUrl') {
    sendResponse({ data: getUrl() })
  } else if (request.action === 'getAuthor') {
    sendResponse({ data: getAuthor() })
  }
})
