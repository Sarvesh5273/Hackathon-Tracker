self.addEventListener('install', () => {
  // No-op install handler for compatibility.
});

// Keep message handlers compatible with chrome.runtime usage in content/popup
self.addEventListener('message', (e) => {
  // Service worker message handling (no special Safari code here).
});

// Forward legacy chrome.runtime APIs to window in popup via messaging if needed.
