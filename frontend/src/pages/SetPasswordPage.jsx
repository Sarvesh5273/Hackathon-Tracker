import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function SetPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Password set. Redirecting to dashboard…');
    window.setTimeout(() => navigate('/dashboard', { replace: true }), 800);
  };

  return (
    <div className="min-h-screen bg-appbg text-primaryText flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-terminal">
        <div className="mb-6">
          <div className="text-2xl font-extrabold">Set your password</div>
          <div className="mt-1 text-sm text-secondaryText">Save a password so you can log in without magic links.</div>
        </div>
        <form onSubmit={onSetPassword} className="space-y-4">
          <input
            className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-secondaryText outline-none"
            type="email"
            value={user?.email || ''}
            placeholder="Email"
            readOnly
          />
          <input
            className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 outline-none"
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 outline-none"
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error ? <div className="rounded-xl border border-urgencyRed/40 bg-urgencyRed/10 px-3 py-2 text-sm text-urgencyRed">{error}</div> : null}
          {message ? <div className="rounded-xl border border-urgencyGreen/40 bg-urgencyGreen/10 px-3 py-2 text-sm text-urgencyGreen">{message}</div> : null}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-white px-4 py-2 font-semibold text-black disabled:opacity-60">
            {loading ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  );
}
