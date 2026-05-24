import React, { useMemo, useState } from 'react';
import CountdownTimer from './CountdownTimer';
import HackathonModal from './HackathonModal';
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
  const [modalOpen, setModalOpen] = useState(false);
  const urgency = useMemo(() => getUrgency(hackathon.submission_deadline), [hackathon.submission_deadline]);
  const phase = useMemo(() => getHackathonPhase(hackathon), [hackathon]);


  const statusTone = {
    interested: 'border-border text-secondaryText bg-black/20',
    registered: 'border-urgencyAmber/40 text-urgencyAmber bg-urgencyAmber/10',
    completed: 'border-urgencyGreen/40 text-urgencyGreen bg-urgencyGreen/10',
    dropped: 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10'
  }[hackathon.status || 'interested'];


  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`w-full text-left rounded-2xl border bg-card shadow-terminal transition hover:-translate-y-0.5 hover:border-white/10 p-4 ${urgency.tone === 'red' ? 'border-urgencyRed/40' : urgency.tone === 'amber' ? 'border-urgencyAmber/40' : 'border-border'}`}
      >
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

      {modalOpen && (
        <HackathonModal
          hackathon={hackathon}
          sessionToken={sessionToken}
          onClose={() => setModalOpen(false)}
          onSaved={onSaved}
          onDelete={onDelete}
        />
      )}
    </>
  );
}