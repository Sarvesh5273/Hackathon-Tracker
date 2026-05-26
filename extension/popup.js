const API_BASE = 'http://localhost:8000';

const $ = (id) => document.getElementById(id);

const views = {
  loading: $('viewLoading'),
  settings: $('viewSettings'),
  result: $('viewResult'),
  manual: $('viewManual')
};

let latestExtractionCache = null;

function showView(name) {
  Object.entries(views).forEach(([k, el]) => {
    el.classList.toggle('hidden', k !== name);
  });
}

function setFooter(text) {
  $('footerLeft').textContent = text;
}

function safeDateToInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToISO(dateStr) {
  if (!dateStr) return null;
  return `${dateStr}T23:59:59Z`;
}

async function storageGet(keys) {
  return chrome.storage.local.get(keys);
}

async function storageSet(obj) {
  return chrome.storage.local.set(obj);
}

function isBackendUnreachable(err) {
  const m = String(err?.message || err || '').toLowerCase();
  return m.includes('failed to fetch') || m.includes('networkerror');
}

async function validateToken(token) {
  if (!token) {
    updateTokenStatus({ state: 'unset' });
    return { ok: false, reason: 'unset' };
  }

  try {
    const res = await fetch(`${API_BASE}/api/hackathons`, {
      method: 'GET',
      headers: {
        'X-Extension-Token': token
      }
    });

    if (res.status === 200) {
      updateTokenStatus({ state: 'valid' });
      return { ok: true };
    }

    if (res.status === 401) {
      updateTokenStatus({ state: 'invalid' });
      return { ok: false, reason: 'invalid' };
    }

    updateTokenStatus({ state: 'invalid' });
    return { ok: false, reason: `status_${res.status}` };
  } catch (e) {
    updateTokenStatus({ state: 'unknown' });
    return { ok: false, reason: isBackendUnreachable(e) ? 'backend_unreachable' : 'network_error' };
  }
}

function updateTokenStatus({ state }) {
  const dot = $('tokenDot');
  const label = $('tokenStatus');

  dot.classList.remove('ok', 'bad');

  if (state === 'valid') {
    dot.classList.add('ok');
    label.textContent = 'Token valid';
    return;
  }

  if (state === 'invalid') {
    dot.classList.add('bad');
    label.textContent = 'Invalid token';
    return;
  }

  if (state === 'unset') {
    label.textContent = 'Token not set';
    return;
  }

  label.textContent = 'Token status unknown';
}

function setMsg(el, text, tone) {
  el.textContent = text || '';
  el.classList.remove('good', 'bad');
  if (tone === 'good') el.classList.add('good');
  if (tone === 'bad') el.classList.add('bad');
}

function hideToast() {
  const el = $('toast');
  if (!el) return;
  el.classList.add('hidden');
}

function showToast(text) {
  const el = $('toast');
  if (!el) return;

  const textEl = $('toastText');
  if (textEl) textEl.textContent = text || 'Added to HackOS';

  el.classList.remove('hidden');

  if (showToast._t) window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => hideToast(), 4500);
}

function backendDownMessage() {
  return 'Backend unreachable. Make sure FastAPI is running.';
}

function invalidTokenMessage() {
  return 'Invalid token. Copy a new one from web app settings.';
}

function fillResultForm(extraction) {
  const extracted = extraction?.extracted || {};

  $('nameInput').value = extracted.name || extraction?.title || '';
  $('urlInput').value = extraction?.url || '';
  $('regOpenInput').value = safeDateToInput(extracted.registration_open_at);
  $('regDeadlineInput').value = safeDateToInput(extracted.registration_deadline);
  $('subOpenInput').value = safeDateToInput(extracted.submission_open_at);
  $('deadlineInput').value = safeDateToInput(extracted.submission_deadline);
  $('locationInput').value = extracted.location || '';

  const mode = extracted.mode || 'Online';
  $('modeInput').value = ['Online', 'Hybrid', 'Offline'].includes(mode) ? mode : 'Online';
}

function fillManualForm(extraction) {
  $('mNameInput').value = extraction?.title || '';
  $('mUrlInput').value = extraction?.url || '';
  $('mRegOpenInput').value = '';
  $('mRegDeadlineInput').value = '';
  $('mSubOpenInput').value = '';
  $('mDeadlineInput').value = '';
  $('mModeInput').value = 'Online';
  $('mLocationInput').value = 'Online';
}

async function renderFromLatestExtraction() {
  const { latestExtraction } = await storageGet(['latestExtraction']);
  latestExtractionCache = latestExtraction || null;

  if (!latestExtraction) {
    showView('manual');
    $('manualHint').textContent = 'Click the extension icon on a hackathon page to extract, or add manually.';
    $('manualHint').classList.remove('bad');
    fillManualForm(null);
    setFooter('No extraction yet');
    return;
  }

  if (latestExtraction.status === 'loading') {
    showView('loading');
    setFooter('Extracting…');
    return;
  }

  if (latestExtraction.status === 'success') {
    showView('result');
    fillResultForm(latestExtraction);
    setMsg($('resultMsg'), '', null);
    setFooter('Ready');
    return;
  }

  showView('manual');
  fillManualForm(latestExtraction);
  const msg = latestExtraction.message || 'Extraction failed.';
  $('manualHint').textContent = msg;
  $('manualHint').classList.add('bad');
  setFooter('Manual mode');
}

async function getToken() {
  const { extensionToken } = await storageGet(['extensionToken']);
  return extensionToken || '';
}

async function addHackathonFromForm({
  name,
  url,
  registration_open_at,
  registration_deadline,
  submission_open_at,
  submission_deadline,
  phases,
  location,
  mode
}, msgEl) {
  const token = await getToken();
  if (!token) {
    setMsg(msgEl, 'Set your Extension Token in Settings first.', 'bad');
    return;
  }

  const payload = {
    name,
    url,
    registration_open_at,
    registration_deadline,
    submission_open_at,
    submission_deadline,
    phases: Array.isArray(phases) ? phases : [],
    location,
    mode,
    description: '',
    status: 'interested'
  };

  try {
    const res = await fetch(`${API_BASE}/api/hackathons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Token': token
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      setMsg(msgEl, invalidTokenMessage(), 'bad');
      updateTokenStatus({ state: 'invalid' });
      return;
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      setMsg(msgEl, `Failed to save (${res.status}). ${txt || ''}`.trim(), 'bad');
      return;
    }

    setMsg(msgEl, '', null);
    showToast('Added to HackOS');
  } catch (e) {
    setMsg(msgEl, backendDownMessage(), 'bad');
  }
}

async function wireUI() {
  $('dashboardLink').addEventListener('click', async (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: 'HACKOS_OPEN_DASHBOARD' });
  });

  const toastLink = $('toastLink');
  if (toastLink) {
    toastLink.addEventListener('click', async (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'HACKOS_OPEN_DASHBOARD' });
      hideToast();
    });
  }

  $('gearBtn').addEventListener('click', async () => {
    const currentHidden = views.settings.classList.contains('hidden');
    if (currentHidden) {
      showView('settings');
      setFooter('Settings');
      const token = await getToken();
      $('tokenInput').value = token;
      setMsg($('settingsMsg'), '', null);
      await validateToken(token);
    } else {
      await renderFromLatestExtraction();
    }
  });

  $('backBtn').addEventListener('click', async () => {
    await renderFromLatestExtraction();
  });

  $('saveTokenBtn').addEventListener('click', async () => {
    const token = $('tokenInput').value.trim();
    await storageSet({ extensionToken: token });

    setMsg($('settingsMsg'), 'Validating token…', null);
    const result = await validateToken(token);

    if (result.ok) {
      setMsg($('settingsMsg'), 'Token valid.', 'good');
      return;
    }

    if (result.reason === 'backend_unreachable') {
      setMsg($('settingsMsg'), backendDownMessage(), 'bad');
      return;
    }

    setMsg($('settingsMsg'), invalidTokenMessage(), 'bad');
  });

   $('addBtn').addEventListener('click', async () => {
    setMsg($('resultMsg'), 'Saving…', null);

    await addHackathonFromForm(
      {
        name: $('nameInput').value.trim(),
        url: $('urlInput').value.trim(),
        registration_open_at: dateInputToISO($('regOpenInput').value),
        registration_deadline: dateInputToISO($('regDeadlineInput').value),
        submission_open_at: dateInputToISO($('subOpenInput').value),
        submission_deadline: dateInputToISO($('deadlineInput').value),
        phases: latestExtractionCache?.extracted?.phases,
        location: $('locationInput').value.trim() || 'Online',
        mode: $('modeInput').value
      },
      $('resultMsg')
    );
  });

  $('manualAddBtn').addEventListener('click', async () => {
    setMsg($('manualMsg'), 'Saving…', null);

    await addHackathonFromForm(
      {
        name: $('mNameInput').value.trim(),
        url: $('mUrlInput').value.trim(),
        registration_open_at: dateInputToISO($('mRegOpenInput').value),
        registration_deadline: dateInputToISO($('mRegDeadlineInput').value),
        submission_open_at: dateInputToISO($('mSubOpenInput').value),
        submission_deadline: dateInputToISO($('mDeadlineInput').value),
        location: $('mLocationInput').value.trim() || 'Online',
        mode: $('mModeInput').value
      },
      $('manualMsg')
    );
  });

  const retry = async () => {
    setFooter('Extracting…');
    showView('loading');
    chrome.runtime.sendMessage({ type: 'HACKOS_RETRY_EXTRACTION' });
  };

  $('retryBtn').addEventListener('click', retry);
  $('manualRetryBtn').addEventListener('click', retry);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.latestExtraction) {
      renderFromLatestExtraction();
    }
  });

  // Also listen for explicit runtime notifications (useful in Safari)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'HACKOS_EXTRACTION_UPDATED') {
      renderFromLatestExtraction();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await wireUI();

  const token = await getToken();
  updateTokenStatus({ state: token ? 'unknown' : 'unset' });

  chrome.runtime.sendMessage({ type: 'HACKOS_RUN_EXTRACTION' });

  await renderFromLatestExtraction();
});