function updatePatternList(patterns) {
  const patternList = document.getElementById("patterns");
  patternList.innerHTML = "";
  patterns.forEach((pattern, index) => {
    const li = document.createElement("li");
    li.className = "pattern-item";
    li.innerHTML = `
      <span>"${escapeHtml(pattern.original)}" → "${escapeHtml(
      pattern.replacement
    )}"</span>
      <span class="dismiss-btn" data-index="${index}">✖</span>
    `;
    patternList.appendChild(li);
  });
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

async function loadPatterns() {
  const tab = await getCurrentTab();
  const url = new URL(tab.url).hostname;
  chrome.storage.local.get(url, (data) => {
    const patterns = data[url] || [];
    updatePatternList(patterns);
  });
}

document.addEventListener("DOMContentLoaded", loadPatterns);

document.getElementById("saveButton").addEventListener("click", async () => {
  const originalText = document.getElementById("originalText").value;
  const replacementText = document.getElementById("replacementText").value;

  if (originalText && replacementText) {
    const tab = await getCurrentTab();
    const url = new URL(tab.url).hostname;
    chrome.storage.local.get(url, (data) => {
      const patterns = data[url] || [];
      patterns.push({ original: originalText, replacement: replacementText });
      chrome.storage.local.set({ [url]: patterns }, () => {
        updatePatternList(patterns);
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "replace",
            patterns: patterns,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                "Could not establish connection. Refresh the page and try again."
              );
            } else {
              console.log("Message sent to content script:", response);
            }
          }
        );
      });
    });
  }
});

document.getElementById("patterns").addEventListener("click", async (e) => {
  if (e.target.classList.contains("dismiss-btn")) {
    const index = parseInt(e.target.getAttribute("data-index"));
    const tab = await getCurrentTab();
    const url = new URL(tab.url).hostname;
    chrome.storage.local.get(url, (data) => {
      const patterns = data[url] || [];
      patterns.splice(index, 1);
      chrome.storage.local.set({ [url]: patterns }, () => {
        updatePatternList(patterns);
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "replace",
            patterns: patterns,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                "Could not establish connection. Refresh the page and try again."
              );
            } else {
              console.log("Pattern removed and page updated:", response);
            }
          }
        );
      });
    });
  }
});
