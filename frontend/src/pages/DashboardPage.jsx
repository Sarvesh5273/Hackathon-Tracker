import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import HackathonCard from '../components/HackathonCard';
import AddHackathonModal from '../components/AddHackathonModal';

function backendMessage(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return 'Backend unreachable. Make sure FastAPI is running.';
  }
  return String(err?.message || err || 'Something went wrong.');
}

export default function DashboardPage() {
  const { session, user, signOut } = useAuth();
  const { toast, setToast } = useToast();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);
  const [openAdd, setOpenAdd] = useState(false);

  const token = session?.access_token || '';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const fetchHackathons = async (opts = {}) => {
    const silent = !!opts.silent;
    const minSpinnerMs = opts.minSpinnerMs || 0;
    const noStore = !!opts.noStore;

    if (!token) return;

    const start = Date.now();
    if (!silent) setLoading(true);
    setRefreshing(true);
    setToast('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/hackathons`, {
        headers: { Authorization: `Bearer ${token}` },
        ...(noStore ? { cache: 'no-store' } : {})
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHackathons(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast(backendMessage(e));
    } finally {
      const elapsed = Date.now() - start;
      if (minSpinnerMs && elapsed < minSpinnerMs) await sleep(minSpinnerMs - elapsed);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });
      if (!res.ok) {
        setUrgentCount(0);
        return;
      }
      const data = await res.json();
      setUrgentCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setUrgentCount(0);
    }
  };

  useEffect(() => {
    fetchHackathons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    fetchNotifications();
    const id = window.setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sorted = useMemo(() => hackathons, [hackathons]);

  return (
    <div className="min-h-screen bg-appbg text-primaryText">
      {toast ? (
        <div className="sticky top-0 z-30 border-b border-urgencyRed/40 bg-urgencyRed/10 px-4 py-3 text-sm text-urgencyRed">
          {toast}
        </div>
      ) : null}

      <header className="sticky top-0 z-20 border-b border-border bg-appbg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">HackOS Tracker</div>
            <div className="text-sm text-secondaryText">{user?.email}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" title="Urgent deadlines (<24h)">
              <div className={`${urgentCount > 0 ? 'text-urgencyRed animate-pulse' : 'text-secondaryText'}`}>🔔</div>
              {urgentCount > 0 ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-urgencyRed px-2 py-0.5 text-[10px] font-bold text-black">
                  {urgentCount}
                </span>
              ) : null}
            </div>
            <Link to="/settings" className="rounded-xl border border-border px-4 py-2 text-sm">
              Settings
            </Link>
            <button onClick={signOut} className="rounded-xl border border-border px-4 py-2 text-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-secondaryText">
              {hackathons.length} hackathon{hackathons.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchHackathons({ silent: true })}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              {refreshing ? 'Syncing…' : 'Sync'}
            </button>
            <button
              onClick={() => fetchHackathons({ silent: true, minSpinnerMs: 1000, noStore: true })}
              className="rounded-xl border border-border px-4 py-2 text-sm"
              title="Force refresh"
            >
              <span className={`inline-block ${refreshing ? 'animate-spin' : ''}`}>⟳</span> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-terminal">
            <div className="text-lg font-semibold">No hackathons yet.</div>
            <div className="mt-2 text-sm text-secondaryText">
              Visit a hackathon page and click the extension icon, or add one manually.
            </div>
            <button onClick={() => setOpenAdd(true)} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">
              Add Hackathon
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((h) => (
              <HackathonCard
                key={h.id}
                hackathon={h}
                sessionToken={token}
              />
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => setOpenAdd(true)}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-white text-2xl font-bold text-black shadow-terminal"
        aria-label="Add hackathon"
      >
        +
      </button>

      <AddHackathonModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        token={token}
        onCreated={() => fetchHackathons({ silent: true })}
        onError={(msg) => setToast(msg)}
      />
    </div>
  );
}