# Integration Guide for Frontend & Extension

This guide explains how to integrate the backend with your frontend and Chrome extension.

---

## 🔐 Authentication Flow

### For Web Frontend (Supabase Auth)

1. **User logs in** via Supabase UI
2. **Supabase returns JWT token**
3. **Frontend stores token** (in localStorage/sessionStorage)
4. **Frontend sends JWT** in Authorization header:
   ```javascript
   const response = await fetch('http://localhost:8000/api/hackathons', {
     headers: {
       'Authorization': `Bearer ${jwt_token}`
     }
   });
   ```

### For Chrome Extension

1. **User logs in via web frontend**
2. **Frontend calls POST /api/auth/extension-token** with JWT
3. **Backend generates** secure random token
4. **Frontend passes token to extension** (via message passing)
5. **Extension stores token** in chrome.storage.local
6. **Extension sends token** in X-Extension-Token header:
   ```javascript
   const response = await fetch('http://localhost:8000/api/hackathons', {
     headers: {
       'X-Extension-Token': extension_token
     }
   });
   ```

---

## 🔌 Frontend Integration Examples

### React Example

```javascript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

export function useHackathonAPI() {
  const client = useSupabaseClient();
  const user = useUser();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user && !token) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.access_token) {
          setToken(session.access_token);
        }
      });
    }
  }, [user, client, token]);

  const api = {
    async extractHackathon(url: string, title: string) {
      const res = await fetch('http://localhost:8000/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, page_text: null })
      });
      return res.json();
    },

    async getHackathons() {
      const res = await fetch('http://localhost:8000/api/hackathons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },

    async createHackathon(data: any) {
      const res = await fetch('http://localhost:8000/api/hackathons', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return res.json();
    },

    async updatePlan(hackathonId: string, plan: any) {
      const res = await fetch(
        `http://localhost:8000/api/hackathons/${hackathonId}/plan`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(plan)
        }
      );
      return res.json();
    },

    async deleteHackathon(hackathonId: string) {
      const res = await fetch(
        `http://localhost:8000/api/hackathons/${hackathonId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      return res.json();
    }
  };

  return { api, token, user };
}
```

---

## 🧩 Chrome Extension Integration

### Extension Setup

```javascript
// background.js or service-worker.js

const API_BASE = 'http://localhost:8000';

// Store token when user authenticates from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'storeToken') {
    await chrome.storage.local.set({ apiToken: request.token });
    sendResponse({ success: true });
  }
});

// API helper
async function callAPI(endpoint, options = {}) {
  const token = (await chrome.storage.local.get(['apiToken'])).apiToken;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Token': token,
      ...options.headers
    }
  });

  if (response.status === 401) {
    // Token expired, clear and prompt re-auth
    await chrome.storage.local.remove(['apiToken']);
    throw new Error('Token expired. Please re-authenticate.');
  }

  return response.json();
}

// Extract on page and save
async function extractAndSave(url, title) {
  try {
    // Extract details
    const extracted = await callAPI('/api/extract', {
      method: 'POST',
      body: JSON.stringify({ url, title, page_text: null })
    });

    // Save to user's list
    const saved = await callAPI('/api/hackathons', {
      method: 'POST',
      body: JSON.stringify({
        name: extracted.name,
        url,
        registration_open_at: extracted.registration_open_at,
        registration_deadline: extracted.registration_deadline,
        submission_open_at: extracted.submission_open_at,
        submission_deadline: extracted.submission_deadline,
        phases: extracted.phases,
        location: extracted.location,
        mode: extracted.mode,
        description: extracted.description,
        status: 'interested'
      })
    });

    return saved;
  } catch (error) {
    console.error('Failed to extract and save:', error);
    throw error;
  }
}

// Get user's hackathons
async function getHackathons() {
  return callAPI('/api/hackathons');
}
```

### Content Script Example

```javascript
// content.js

// Listen for requests from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'extractPage') {
    try {
      // Get page text
      const pageText = document.body.innerText;
      
      // Send to background
      const result = await chrome.runtime.sendMessage({
        action: 'extract',
        url: window.location.href,
        title: document.title,
        pageText: pageText
      });
      
      sendResponse(result);
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
});
```

### Popup Example

```html
<!-- popup.html -->
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="hackathons-list"></div>
  <button id="extract-btn">Extract & Save This Hackathon</button>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js

document.getElementById('extract-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'extractPage' }, (response) => {
    if (response?.error) {
      alert('Error: ' + response.error);
    } else {
      alert('Hackathon saved!');
      loadHackathons();
    }
  });
});

async function loadHackathons() {
  const hackathons = await chrome.runtime.sendMessage({ action: 'getHackathons' });
  // Render list...
}

loadHackathons();
```

---

## 🌐 CORS Notes

The API is configured to accept requests from:

- `chrome-extension://*` - Your extension's origin
- `http://localhost:5173` - Vite dev server (typical)
- `http://localhost:3000` - Alternative frontend

**For production**, add your domain:
```python
# In main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",  # Add your domain
        "https://www.yourdomain.com",
        # ... plus chrome-extension and localhost for dev
    ]
)
```

---

## 🔄 Common Integration Patterns

### Pattern 1: Extract on Web → Send to Extension

```javascript
// Frontend
async function extractAndNotifyExtension(url, title) {
  // Extract
  const extracted = await api.extractHackathon(url, title);
  
  // Create hackathon
  const hackathon = await api.createHackathon(extracted);
  
  // Notify extension (if installed)
  if (window.extensionInstalled) {
    chrome.runtime.sendMessage({
      action: 'hackathonAdded',
      hackathon
    });
  }
}
```

### Pattern 2: Sync Data Across Tabs

```javascript
// Extension background
chrome.tabs.onActivated.addListener(async () => {
  const hackathons = await callAPI('/api/hackathons');
  
  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'sync',
        hackathons
      });
    });
  });
});
```

### Pattern 3: Offline Sync

```javascript
// Extension
async function syncWhenOnline() {
  const pending = await chrome.storage.local.get(['pending']);
  
  if (navigator.onLine && pending.pending?.length > 0) {
    for (const item of pending.pending) {
      try {
        await callAPI('/api/hackathons', {
          method: 'POST',
          body: JSON.stringify(item)
        });
      } catch (e) {
        console.error('Sync failed:', e);
      }
    }
  }
}

window.addEventListener('online', syncWhenOnline);
```

---

## 🧪 Testing Integration

### Test Extract Endpoint

```bash
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hackathon.example.com",
    "title": "Example Hackathon",
    "page_text": null
  }'
```

### Test with Extension Token

```bash
# 1. Get JWT token from frontend (manual or via API)
JWT_TOKEN="your_jwt_token"

# 2. Generate extension token
EXT_TOKEN=$(curl -X POST http://localhost:8000/api/auth/extension-token \
  -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.token')

# 3. Use extension token
curl -X GET http://localhost:8000/api/hackathons \
  -H "X-Extension-Token: $EXT_TOKEN"
```

---

## 🚨 Troubleshooting

### 401 Unauthorized
- Check token is valid: `curl -X GET $SUPABASE_URL/auth/v1/user -H "Authorization: Bearer $TOKEN"`
- Ensure Authorization header is sent correctly
- For extension: check token in `chrome.storage.local`

### CORS Error
- Verify frontend origin is in `allow_origins` list
- Check browser console for exact origin being rejected
- For extension, origin should start with `chrome-extension://`

### No Response from API
- Verify backend is running: `curl http://localhost:8000/health`
- Check firewall isn't blocking port 8000
- Verify no other service is using port 8000

### Token Expired
- Implement token refresh in frontend (Supabase handles this)
- For extension: generate new token when needed

---

## 📋 Integration Checklist

- [ ] Backend running on localhost:8000
- [ ] Supabase credentials configured
- [ ] Database tables created
- [ ] Frontend can call `/api/extract` (no auth)
- [ ] Frontend auth implemented with JWT
- [ ] Extension token generation working
- [ ] Extension can use X-Extension-Token header
- [ ] CORS errors resolved
- [ ] Data syncing between frontend and extension
- [ ] Error handling implemented

---

## 🎉 You're Ready!

Your backend is now ready to integrate with frontend and extension. Start with the extract endpoint (no auth needed) to test connectivity, then add authentication and more complex operations.
