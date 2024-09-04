chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScriptReady") {
    chrome.action.setBadgeText({ text: "Ready", tabId: sender.tab.id });
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId: sender.tab.id });
    }, 1000);
  }
});
