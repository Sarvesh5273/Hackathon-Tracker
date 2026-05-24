function getMetaContent(selector) {
  const el = document.querySelector(selector);
  return el && el.getAttribute('content') ? el.getAttribute('content') : '';
}

function extractPagePayload() {
  const page_text = (document.body?.innerText || '').slice(0, 8000);

  const og_title =
    getMetaContent('meta[property="og:title"]') ||
    getMetaContent('meta[name="twitter:title"]') ||
    document.title ||
    '';

  const og_description =
    getMetaContent('meta[property="og:description"]') ||
    getMetaContent('meta[name="description"]') ||
    getMetaContent('meta[name="twitter:description"]') ||
    '';

  const time_tags_found = Array.from(document.querySelectorAll('time'))
    .map((t) => (t.innerText || '').trim())
    .filter(Boolean);

  return {
    page_text,
    og_title,
    og_description,
    time_tags_found
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'HACKOS_EXTRACT_PAGE') return;

  try {
    // Isolated world, but returned object must be serializable.
    const payload = extractPagePayload();
    sendResponse(payload);
  } catch (e) {
    sendResponse({
      page_text: '',
      og_title: '',
      og_description: '',
      time_tags_found: [],
      error: String(e?.message || e)
    });
  }

  return true;
});
