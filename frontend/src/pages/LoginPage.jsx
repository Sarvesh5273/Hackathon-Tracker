import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const onPasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) return setError(authError.message);
    navigate(from, { replace: true });
  };

  const onMagicLink = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/set-password` }
    });
    setLoading(false);
    if (authError) return setError(authError.message);
    setMessage('Check your email.');
  };

  const onGithubLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    setLoading(false);
    if (authError) return setError(authError.message);
  };

  return (
    <div className="min-h-screen bg-appbg text-primaryText flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-terminal">
        <div className="mb-6">
          <div className="text-2xl font-extrabold">HackOS Tracker</div>
          <div className="mt-1 text-sm text-secondaryText">Sign in to track hackathons like a terminal.</div>
        </div>
        <form onSubmit={onPasswordLogin} className="space-y-4">
          <button type="button" onClick={onGithubLogin} className="flex w-full items-center justify-between rounded-xl border border-black bg-black px-4 py-2 font-semibold text-white">
            <span className="flex items-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-white">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              <span>Continue with GitHub</span>
            </span>
            <span className="rounded-full border border-urgencyGreen/40 bg-urgencyGreen/10 px-2 py-0.5 text-xs text-urgencyGreen">Recommended</span>
          </button>
          <input className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 outline-none" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 outline-none" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <div className="rounded-xl border border-urgencyRed/40 bg-urgencyRed/10 px-3 py-2 text-sm text-urgencyRed">{error}</div> : null}
          {message ? <div className="rounded-xl border border-urgencyGreen/40 bg-urgencyGreen/10 px-3 py-2 text-sm text-urgencyGreen">{message}</div> : null}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-white px-4 py-2 font-semibold text-black disabled:opacity-60">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button type="button" onClick={onMagicLink} className="w-full rounded-xl border border-border px-4 py-2 font-semibold">
            Magic Link
          </button>
        </form>
      </div>
    </div>
  );
}
