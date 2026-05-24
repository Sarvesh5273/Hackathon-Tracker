import React, { useState } from 'react';
import PlanEditor from './PlanEditor';
import { formatDateShort } from '../lib/date';

// Runtime flag to help detect whether modal code is loaded in the running build
try { window.__HAS_HACKATHON_MODAL = true; } catch (e) {}

export default function HackathonModal({ hackathon, sessionToken, onClose, onSaved, onDelete }) {
  const [deleting, setDeleting] = useState(false);

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
      onClose();
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop with glass effect */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-white/10 bg-card/95 backdrop-blur px-6 py-4 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold truncate">{hackathon.name}</h2>
              <p className="text-xs text-secondaryText truncate mt-1">{hackathon.url}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 shrink-0 text-2xl font-bold text-secondaryText hover:text-primaryText"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Status and dates overview */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-secondaryText opacity-50">Status</div>
                <div className="mt-1 text-sm font-medium capitalize">
                  {(() => {
                    const plan = hackathon.plan || null;
                    const derived = plan
                      ? plan.submitted ? 'Submission done' : plan.demo_done ? 'Demo done' : plan.implementation_done ? 'Code done' : plan.idea_done ? 'Idea done' : (hackathon.status || 'interested')
                      : (hackathon.status || 'interested');
                    return derived;
                  })()}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-secondaryText opacity-50">Mode</div>
                <div className="mt-1 text-sm font-medium">{hackathon.mode || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-secondaryText opacity-50">Location</div>
                <div className="mt-1 text-sm font-medium">{hackathon.location || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-secondaryText opacity-50">Sub. Deadline</div>
                <div className="mt-1 text-sm font-medium">{formatDateShort(hackathon.submission_deadline) || '—'}</div>
              </div>
            </div>

            {/* All dates */}
            <div className="border-t border-white/10 pt-4">
              <div className="text-xs uppercase tracking-wide text-secondaryText opacity-50 mb-3">Important Dates</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {hackathon.registration_open_at && (
                  <div>
                    <span className="text-secondaryText">Reg. Opens:</span> {formatDateShort(hackathon.registration_open_at)}
                  </div>
                )}
                {hackathon.registration_deadline && (
                  <div>
                    <span className="text-secondaryText">Reg. Deadline:</span> {formatDateShort(hackathon.registration_deadline)}
                  </div>
                )}
                {hackathon.submission_open_at && (
                  <div>
                    <span className="text-secondaryText">Sub. Opens:</span> {formatDateShort(hackathon.submission_open_at)}
                  </div>
                )}
                {hackathon.submission_deadline && (
                  <div>
                    <span className="text-secondaryText">Sub. Deadline:</span> {formatDateShort(hackathon.submission_deadline)}
                  </div>
                )}
              </div>
            </div>

            {/* Plan Editor */}
            <div className="border-t border-white/10 pt-4">
              <PlanEditor hackathon={hackathon} sessionToken={sessionToken} onSaved={onSaved} />
            </div>

            {/* Delete Button */}
            <div className="border-t border-white/10 pt-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full rounded-lg border border-urgencyRed/40 bg-urgencyRed/10 px-4 py-3 text-sm font-semibold text-urgencyRed hover:bg-urgencyRed/20 disabled:opacity-50 transition"
              >
                {deleting ? 'Deleting…' : 'Delete Hackathon'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
