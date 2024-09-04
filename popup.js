function updatePatternList(patterns) {
  const patternList = document.getElementById("patterns");
  patternList.innerHTML = "";
  patterns.forEach((pattern, index) => {
    const li = document.createElement("li");
    li.className = "pattern-item";
    li.draggable = true;
    li.setAttribute("data-index", index);
    li.innerHTML = `
      <span>"${escapeHtml(pattern.original)}" → "${escapeHtml(
      pattern.replacement
    )}"</span>
      <span class="dismiss-btn" data-index="${index}">✖</span>
    `;
    patternList.appendChild(li);
  });
  addDragListeners();
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

async function savePatterns(patterns) {
  const tab = await getCurrentTab();
  const url = new URL(tab.url).hostname;
  return new Promise((resolve) => {
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
            console.log("Patterns updated:", response);
          }
          resolve();
        }
      );
    });
  });
}

function addDragListeners() {
  const patternItems = document.querySelectorAll(".pattern-item");
  patternItems.forEach((item) => {
    item.addEventListener("dragstart", dragStart);
    item.addEventListener("dragover", dragOver);
    item.addEventListener("drop", drop);
    item.addEventListener("dragenter", dragEnter);
    item.addEventListener("dragleave", dragLeave);
  });
}

function dragStart(e) {
  e.dataTransfer.setData("text/plain", e.target.getAttribute("data-index"));
  e.target.classList.add("dragging");
}

function dragOver(e) {
  e.preventDefault();
}

function dragEnter(e) {
  e.target.classList.add("drag-over");
}

function dragLeave(e) {
  e.target.classList.remove("drag-over");
}

async function drop(e) {
  e.preventDefault();
  const draggedIndex = parseInt(e.dataTransfer.getData("text"));
  const targetIndex = parseInt(
    e.target.closest(".pattern-item").getAttribute("data-index")
  );

  if (draggedIndex !== targetIndex) {
    const tab = await getCurrentTab();
    const url = new URL(tab.url).hostname;
    chrome.storage.local.get(url, async (data) => {
      const patterns = data[url] || [];
      const [removed] = patterns.splice(draggedIndex, 1);
      patterns.splice(targetIndex, 0, removed);
      await savePatterns(patterns);
    });
  }

  document.querySelectorAll(".pattern-item").forEach((item) => {
    item.classList.remove("dragging");
    item.classList.remove("drag-over");
  });
}

document.addEventListener("DOMContentLoaded", loadPatterns);

document.getElementById("saveButton").addEventListener("click", async () => {
  const originalText = document.getElementById("originalText").value;
  const replacementText = document.getElementById("replacementText").value;

  if (originalText && replacementText) {
    const tab = await getCurrentTab();
    const url = new URL(tab.url).hostname;
    chrome.storage.local.get(url, async (data) => {
      const patterns = data[url] || [];
      patterns.push({ original: originalText, replacement: replacementText });
      await savePatterns(patterns);
    });
  }
});

document.getElementById("patterns").addEventListener("click", async (e) => {
  if (e.target.classList.contains("dismiss-btn")) {
    const index = parseInt(e.target.getAttribute("data-index"));
    const tab = await getCurrentTab();
    const url = new URL(tab.url).hostname;
    chrome.storage.local.get(url, async (data) => {
      const patterns = data[url] || [];
      patterns.splice(index, 1);
      await savePatterns(patterns);
    });
  }
});
