import React, { useMemo, useState } from 'react';
import CountdownTimer from './CountdownTimer';
import PlanEditor from './PlanEditor';
import { getUrgency, getHackathonPhase, formatDateShort } from '../lib/date';


function badgeClass(tone) {
  if (tone === 'red') return 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10';
  if (tone === 'amber') return 'border-urgencyAmber/40 text-urgencyAmber bg-urgencyAmber/10';
  if (tone === 'green') return 'border-urgencyGreen/40 text-urgencyGreen bg-urgencyGreen/10';
  return 'border-border text-secondaryText bg-black/20';
}


function phaseBadgeClass(phase) {
  if (phase === 'Closed') return 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10';
  if (phase === 'Submission open') return 'border-urgencyGreen/40 text-urgencyGreen bg-urgencyGreen/10';
  if (phase === 'Registration open') return 'border-urgencyAmber/40 text-urgencyAmber bg-urgencyAmber/10';
  if (phase === 'Registration closed') return 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10';
  return 'border-border text-secondaryText bg-black/20';
}


export default function HackathonCard({ hackathon, sessionToken, onSaved, onDelete }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const urgency = useMemo(() => getUrgency(hackathon.submission_deadline), [hackathon.submission_deadline]);
  const phase = useMemo(() => getHackathonPhase(hackathon), [hackathon]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${hackathon.name}"?`)) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/hackathons/${hackathon.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      if (!res.ok) throw new Error(await res.text());
      onDelete?.();
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };


  const statusTone = {
    interested: 'border-border text-secondaryText bg-black/20',
    registered: 'border-urgencyAmber/40 text-urgencyAmber bg-urgencyAmber/10',
    completed: 'border-urgencyGreen/40 text-urgencyGreen bg-urgencyGreen/10',
    dropped: 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10'
  }[hackathon.status || 'interested'];


  return (
    <div
      className={`rounded-2xl border bg-card shadow-terminal transition hover:-translate-y-0.5 hover:border-white/10 ${urgency.tone === 'red' ? 'border-urgencyRed/40' : urgency.tone === 'amber' ? 'border-urgencyAmber/40' : 'border-border'}`}
    >
      <button className="w-full text-left p-4" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg truncate">{hackathon.name}</h3>
            <p className="text-xs text-secondaryText truncate mt-1">{hackathon.url}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone}`}>
              {hackathon.status || 'interested'}
            </span>
            <CountdownTimer deadlineIso={hackathon.submission_deadline} />
          </div>
        </div>


        {/* Badges row */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-border bg-black/20 px-2 py-1 text-xs text-secondaryText">
            {hackathon.location || 'Unknown location'}
          </span>
          <span className={`rounded-full border px-2 py-1 text-xs ${phaseBadgeClass(phase)}`}>
            {phase}
          </span>
          <span className={`rounded-full border px-2 py-1 text-xs ${badgeClass(urgency.tone)}`}>
            {urgency.label}
          </span>
          {hackathon.mode ? (
            <span className="rounded-full border border-border bg-black/20 px-2 py-1 text-xs text-secondaryText">
              {hackathon.mode}
            </span>
          ) : null}
        </div>


        {/* Dates row */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {hackathon.registration_open_at && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Reg. Opens</span>
              {formatDateShort(hackathon.registration_open_at)}
            </div>
          )}
          {hackathon.registration_deadline && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Reg. Deadline</span>
              {formatDateShort(hackathon.registration_deadline)}
            </div>
          )}
          {hackathon.submission_open_at && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Sub. Opens</span>
              {formatDateShort(hackathon.submission_open_at)}
            </div>
          )}
          {hackathon.submission_deadline && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Sub. Deadline</span>
              {formatDateShort(hackathon.submission_deadline)}
            </div>
          )}
        </div>

      </button>


      {open ? (
        <div className="border-t border-border p-4 pt-3">
          <PlanEditor hackathon={hackathon} sessionToken={sessionToken} onSaved={onSaved} />
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="mt-4 w-full rounded-lg border border-urgencyRed/40 bg-urgencyRed/10 px-3 py-2 text-sm font-semibold text-urgencyRed hover:bg-urgencyRed/20 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete Hackathon'}
          </button>
        </div>
      ) : null}
    </div>
  );
}