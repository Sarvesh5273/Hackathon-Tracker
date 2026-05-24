const API_BASE = 'http://localhost:8000';
const DASHBOARD_URL = 'http://localhost:5173';

function setLatestExtraction(payload) {
  return chrome.storage.local.set({ latestExtraction: payload });
}

function notifyPopup() {
  try {
    chrome.runtime.sendMessage({ type: 'HACKOS_EXTRACTION_UPDATED' });
  } catch (e) {
    // no-op
  }
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!tabs || !tabs.length) return reject(new Error('No active tab found'));
      resolve(tabs[0]);
    });
  });
}

function executeContentScript(tabId) {
  return new Promise((resolve, reject) => {
    try {
      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ['content.js']
        },
        () => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message));
          resolve();
        }
      );
    } catch (e) {
      return reject(e);
    }
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendExtractMessage(tabId) {
  // After injection, the listener should be ready, but we retry once to avoid race issues.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'HACKOS_EXTRACT_PAGE' }, (r) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message));
          resolve(r);
        });
      });

      if (!resp) throw new Error('No response from content script');
      return resp;
    } catch (e) {
      if (attempt === 0) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(150);
        continue;
      }
      throw e;
    }
  }
}

async function postExtract({ url, title, page_text }) {
  const res = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, page_text })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Extract failed (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}


async function runExtractionFlow() {
  await setLatestExtraction({
    status: 'loading',
    startedAt: Date.now()
  });
  notifyPopup();

  let tab;
  try {
    tab = await getActiveTab();
  } catch (e) {
    await setLatestExtraction({ status: 'error', errorType: 'TAB_ERROR', message: e.message });
    notifyPopup();
    return;
  }

  const url = tab.url || '';
  const title = tab.title || '';

  // Some Chrome internal pages can’t be scripted.
  if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
    await setLatestExtraction({
      status: 'error',
      errorType: 'UNSUPPORTED_PAGE',
      message: 'This page cannot be accessed by the extension. Open a normal website tab and try again.'
    });
    return;
  }

  // Try messaging the content script first; if it isn't present, inject and retry.
  let pageData;
  try {
    try {
      pageData = await sendExtractMessage(tab.id);
    } catch (sendErr) {
      // send failed — try injecting then retrying
      try {
        await executeContentScript(tab.id);
        pageData = await sendExtractMessage(tab.id);
      } catch (injectErr) {
        // Prefer the injection error if present
        const err = injectErr || sendErr;
        throw err;
      }
    }
  } catch (e) {
    await setLatestExtraction({ status: 'error', errorType: 'CONTENT_ERROR', message: e.message, url, title });
    notifyPopup();
    return;
  }

  try {
    const extracted = await postExtract({
      url,
      title,
      page_text: pageData.page_text
    });

    await setLatestExtraction({
      status: 'success',
      url,
      title,
      pageData,
      extracted,
      finishedAt: Date.now()
    });
    notifyPopup();
  } catch (e) {
    const isNetwork = String(e.message || '').toLowerCase().includes('failed to fetch');
    await setLatestExtraction({
      status: 'error',
      url,
      title,
      pageData,
      errorType: isNetwork ? 'BACKEND_UNREACHABLE' : 'EXTRACT_ERROR',
      message: isNetwork
        ? 'Backend unreachable. Make sure FastAPI is running.'
        : e.message,
      finishedAt: Date.now()
    });
  }
}

// Allow popup to trigger extraction again (retry) and to open dashboard.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'HACKOS_RUN_EXTRACTION') {
      await runExtractionFlow();
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'HACKOS_RETRY_EXTRACTION') {
      await runExtractionFlow();
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === 'HACKOS_OPEN_DASHBOARD') {
      await chrome.tabs.create({ url: DASHBOARD_URL });
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown message type' });
  })();

  return true;
});
