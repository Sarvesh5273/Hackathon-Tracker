import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/constants';

function backendMessage(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return 'Backend unreachable. Make sure FastAPI is running.';
  }
  return String(err?.message || err || 'Something went wrong.');
}

export default function SettingsPage() {
  const { session } = useAuth();
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateToken = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/extension-token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setToken(data.token || '');
    } catch (e) {
      setError(backendMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="min-h-screen bg-appbg text-primaryText px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-3xl font-extrabold">Settings</div>
            <div className="text-sm text-secondaryText">Manage your extension token and theme.</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-terminal">
            <div className="mb-2 text-lg font-semibold">Extension Token</div>
            <div className="mb-4 text-sm text-secondaryText">Paste this into your Chrome extension.</div>
            <button onClick={generateToken} className="rounded-xl bg-white px-4 py-2 font-semibold text-black" disabled={loading}>
              {loading ? 'Generating…' : 'Generate Token'}
            </button>
            {error ? <div className="mt-3 rounded-xl border border-urgencyRed/40 bg-urgencyRed/10 px-3 py-2 text-sm text-urgencyRed">{error}</div> : null}
            {token ? (
              <div className="mt-4 space-y-3">
                <pre className="overflow-auto rounded-xl border border-border bg-black/40 p-3 text-xs text-secondaryText">{token}</pre>
                <button onClick={copyToken} className="rounded-xl border border-border px-4 py-2 text-sm">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-terminal">
            <div className="mb-2 text-lg font-semibold">Theme</div>
            <div className="text-sm text-secondaryText">Dark terminal theme only for now.</div>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-black/30 px-3 py-3 text-sm">
              <div className="h-4 w-4 rounded-full bg-white/80" />
              Dark mode (placeholder)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
