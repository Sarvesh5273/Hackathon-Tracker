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
  // Local copy so we can reflect updates made inside the modal without requiring dashboard refresh
  const [current, setCurrent] = useState(hackathon);

  React.useEffect(() => setCurrent(hackathon), [hackathon]);

  const urgency = useMemo(() => getUrgency(current.submission_deadline), [current.submission_deadline]);
  const phase = useMemo(() => getHackathonPhase(current), [current]);

  // Derive plan-based status if available
  const plan = current.plan || null;
  const derivedStatus = plan
    ? plan.submitted ? 'Submission done' : plan.demo_done ? 'Demo done' : plan.implementation_done ? 'Code done' : plan.idea_done ? 'Idea done' : (current.status || 'interested')
    : (current.status || 'interested');

  const statusTone = {
    interested: 'border-border text-secondaryText bg-black/20',
    registered: 'border-urgencyAmber/40 text-urgencyAmber bg-urgencyAmber/10',
    completed: 'border-urgencyGreen/40 text-urgencyGreen bg-urgencyGreen/10',
    dropped: 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10'
  }[current.status || 'interested'];

  const priority = plan?.priority || current.priority || 'medium';
  const priorityClass = priority === 'high' ? 'border-urgencyRed/40 text-urgencyRed bg-urgencyRed/10' : priority === 'low' ? 'border-urgencyGreen/40 text-urgencyGreen bg-urgencyGreen/10' : 'border-amber-400 text-amber-600 bg-amber-100';

  const handlePlanSaved = (savedPlan) => {
    // savedPlan is the plan row returned by the API; merge into current
    setCurrent((c) => ({ ...c, plan: savedPlan }));
    // propagate upward so parent can refresh if desired
    onSaved?.();
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setModalOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setModalOpen(true); }}
        className={`w-full text-left rounded-2xl border bg-card shadow-terminal transition hover:-translate-y-0.5 hover:border-white/10 p-4 ${urgency.tone === 'red' ? 'border-urgencyRed/40' : urgency.tone === 'amber' ? 'border-urgencyAmber/40' : 'border-border'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-lg truncate">{current.name}</h3>
            <p className="text-xs text-secondaryText truncate mt-1">{current.url}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`rounded-full border px-2 py-1 text-[11px] ${statusTone}`}>
              {derivedStatus}
            </span>
            <CountdownTimer deadlineIso={current.submission_deadline} />
          </div>
        </div>


        {/* Badges row */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-border bg-black/20 px-2 py-1 text-xs text-secondaryText">
            {current.location || 'Unknown location'}
          </span>
          <span className={`rounded-full border px-2 py-1 text-xs ${phaseBadgeClass(phase)}`}>
            {phase}
          </span>

          <span className={`rounded-full border px-2 py-1 text-xs ${priorityClass}`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>

          <span className={`rounded-full border px-2 py-1 text-xs ${badgeClass(urgency.tone)}`}>
            {urgency.label}
          </span>
          {current.mode ? (
            <span className="rounded-full border border-border bg-black/20 px-2 py-1 text-xs text-secondaryText">
              {current.mode}
            </span>
          ) : null}
        </div>


        {/* Dates row */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {current.registration_open_at && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Reg. Opens</span>
              {formatDateShort(current.registration_open_at)}
            </div>
          )}
          {current.registration_deadline && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Reg. Deadline</span>
              {formatDateShort(current.registration_deadline)}
            </div>
          )}
          {current.submission_open_at && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Sub. Opens</span>
              {formatDateShort(current.submission_open_at)}
            </div>
          )}
          {current.submission_deadline && (
            <div className="text-xs text-secondaryText">
              <span className="text-[10px] uppercase tracking-wide opacity-50 block">Sub. Deadline</span>
              {formatDateShort(current.submission_deadline)}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <HackathonModal
          hackathon={current}
          sessionToken={sessionToken}
          onClose={() => setModalOpen(false)}
          onSaved={handlePlanSaved}
          onDelete={onDelete}
        />
      )}
    </>
  );
}