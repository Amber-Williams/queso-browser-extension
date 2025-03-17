/**
 * Background script
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'addQuoteToNotes',
    title: 'Add Quote',
    contexts: ['all']
  });
});


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'addQuoteToNotes' && tab?.windowId) {
    chrome.storage.local.set({ 'pendingQuote': info.selectionText }, () => {
      chrome.sidePanel.open({ windowId: tab?.windowId });
    });
  }
});
