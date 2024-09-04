function replaceText(patterns) {
  let replacementCount = 0;
  patterns.forEach((pattern) => {
    const regex = new RegExp(pattern.original, "gi");
    replacementCount += replaceInText(
      document.body,
      regex,
      pattern.replacement
    );
  });
  console.log(`Replacement successful. ${replacementCount} replacements made.`);
  return replacementCount;
}

function replaceInText(element, regex, replacement) {
  let count = 0;
  if (element.nodeType === Node.TEXT_NODE) {
    if (element.textContent.match(regex)) {
      const newElement = document.createElement("span");
      newElement.innerHTML = element.textContent.replace(regex, (match) => {
        count++;
        return replacement;
      });
      element.parentNode.replaceChild(newElement, element);
    }
  } else if (element.nodeType === Node.ELEMENT_NODE) {
    if (element.tagName !== "SCRIPT" && element.tagName !== "STYLE") {
      for (let i = 0; i < element.childNodes.length; i++) {
        count += replaceInText(element.childNodes[i], regex, replacement);
      }
    }
  }
  return count;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "replace") {
    const replacementCount = replaceText(request.patterns);
    sendResponse({ status: "success", replacements: replacementCount });
  }
  return true; // Indicates that the response is sent asynchronously
});

// Initial replacement when the page loads
chrome.storage.local.get(window.location.hostname, (data) => {
  const patterns = data[window.location.hostname] || [];
  replaceText(patterns);
});

// Notify that the content script is ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });
