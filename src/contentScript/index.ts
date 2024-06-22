function getH1Content() {
  const h1Element = document.querySelector('h1')
  return h1Element ? h1Element.textContent : null
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getH1Content') {
    sendResponse({ h1Content: getH1Content() })
  }
})

function getCurrentUri() {
  return document?.location?.href
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCurrentUri') {
    sendResponse({ h1Content: getCurrentUri() })
  }
})
