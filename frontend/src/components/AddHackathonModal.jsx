import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/constants';
import { dateInputToIso } from '../lib/date';


function backendMessage(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return 'Backend unreachable. Make sure FastAPI is running.';
  }
  return String(err?.message || err || 'Something went wrong.');
}


export default function AddHackathonModal({ open, onClose, token, onCreated, onError }) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    registration_open_at: '',
    registration_deadline: '',
    submission_open_at: '',
    submission_deadline: '',
    location: 'Online',
    mode: 'Online',
    description: '',
    status: 'interested'
  });


  useEffect(() => {
    if (!open) return;
    setForm({
      name: '',
      url: '',
      registration_open_at: '',
      registration_deadline: '',
      submission_open_at: '',
      submission_deadline: '',
      location: 'Online',
      mode: 'Online',
      description: '',
      status: 'interested'
    });
  }, [open]);


  if (!open) return null;


  const submit = async (e) => {
    e.preventDefault();


    try {
      const res = await fetch(`${API_BASE_URL}/api/hackathons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          registration_open_at: dateInputToIso(form.registration_open_at),
          registration_deadline: dateInputToIso(form.registration_deadline),
          submission_open_at: dateInputToIso(form.submission_open_at),
          submission_deadline: dateInputToIso(form.submission_deadline),
        })
      });


      if (!res.ok) throw new Error(await res.text());
      onCreated?.();
      onClose?.();
    } catch (err) {
      onError?.(backendMessage(err));
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/75 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-terminal">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="font-semibold">Add Hackathon</div>
          <button className="text-secondaryText" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">

          {/* Name + URL */}
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
              placeholder="URL"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
          </div>

          {/* Registration dates */}
          <div>
            <p className="text-xs text-secondaryText mb-2">Registration</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondaryText">Opens</label>
                <input
                  type="date"
                  className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
                  value={form.registration_open_at}
                  onChange={(e) => setForm((f) => ({ ...f, registration_open_at: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondaryText">Deadline</label>
                <input
                  type="date"
                  className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
                  value={form.registration_deadline}
                  onChange={(e) => setForm((f) => ({ ...f, registration_deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Submission dates */}
          <div>
            <p className="text-xs text-secondaryText mb-2">Submission</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondaryText">Opens</label>
                <input
                  type="date"
                  className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
                  value={form.submission_open_at}
                  onChange={(e) => setForm((f) => ({ ...f, submission_open_at: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-secondaryText">Deadline *</label>
                <input
                  type="date"
                  className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
                  value={form.submission_deadline}
                  onChange={(e) => setForm((f) => ({ ...f, submission_deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Location + Mode */}
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <select
              className="rounded-xl border border-border bg-black/30 px-3 py-2 text-sm"
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
            >
              <option>Online</option>
              <option>Hybrid</option>
              <option>Offline</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button type="button" className="rounded-xl border border-border px-4 py-2 text-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold">
              Add
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}