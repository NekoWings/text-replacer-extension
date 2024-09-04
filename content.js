try {
  function replaceText(patterns, elementToReplace = document) {
    let replacementCount = 0;

    // Replace text in the title if elementToReplace is the whole document
    if (elementToReplace === document) {
      patterns.forEach((pattern) => {
        const regex = new RegExp(pattern.original, "gi");
        if (document.title.match(regex)) {
          document.title = document.title.replace(regex, pattern.replacement);
          replacementCount++;
        }
      });
    }

    // Replace text in the body or given element
    replacementCount += replaceInElement(
      elementToReplace.body || elementToReplace,
      patterns
    );

    console.log(
      `Replacement successful. ${replacementCount} replacements made.`
    );
    return replacementCount;
  }

  function replaceInElement(element, patterns) {
    let count = 0;

    if (element.nodeType === Node.TEXT_NODE) {
      let newText = element.textContent;
      let replaced = false;
      patterns.forEach((pattern) => {
        const regex = new RegExp(pattern.original, "gi");
        if (newText.match(regex)) {
          newText = newText.replace(regex, pattern.replacement);
          replaced = true;
          count++;
        }
      });
      if (replaced) {
        element.textContent = newText;
      }
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      if (element.tagName !== "SCRIPT" && element.tagName !== "STYLE") {
        for (let i = 0; i < element.childNodes.length; i++) {
          count += replaceInElement(element.childNodes[i], patterns);
        }
      }
    }
    return count;
  }

  function applyReplacements(elementToReplace = document) {
    chrome.storage.local.get(window.location.hostname, (data) => {
      const patterns = data[window.location.hostname] || [];
      replaceText(patterns, elementToReplace);
    });
  }

  // Initial replacement when the page loads
  applyReplacements();

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "replace") {
      const replacementCount = replaceText(request.patterns);
      sendResponse({ status: "success", replacements: replacementCount });
    }
    return true; // Indicates that the response is sent asynchronously
  });

  // Notify that the content script is ready
  chrome.runtime.sendMessage({ action: "contentScriptReady" });

  // Observe for changes in the DOM
  const bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            applyReplacements(node);
          }
        });
      }
    });
  });

  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Observe for changes in the title
  const titleObserver = new MutationObserver(() => {
    applyReplacements(document.querySelector("title"));
  });

  titleObserver.observe(document.querySelector("title"), {
    childList: true,
    characterData: true,
    subtree: true,
  });
} catch (error) {
  if (error.message === "Extension context invalidated.") {
    console.log("The extension was reloaded. Please refresh the page.");
  } else {
    console.error("An error occurred:", error);
  }
}
