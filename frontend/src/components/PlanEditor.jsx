import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../lib/constants';

function splitTags(value) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PlanEditor({ hackathon, sessionToken, onSaved }) {
  const [projectIdea, setProjectIdea] = useState(hackathon.plan?.project_idea || '');
  const [techStackText, setTechStackText] = useState((hackathon.plan?.tech_stack || []).join(', '));
  const [teamMembersText, setTeamMembersText] = useState((hackathon.plan?.team_members || []).join(', '));
  const [notes, setNotes] = useState(hackathon.plan?.notes || '');
  const [priority, setPriority] = useState(hackathon.plan?.priority || 'medium');

  // progress flags
  const [ideaDone, setIdeaDone] = useState(!!hackathon.plan?.idea_done);
  const [implementationDone, setImplementationDone] = useState(!!hackathon.plan?.implementation_done);
  const [demoDone, setDemoDone] = useState(!!hackathon.plan?.demo_done);
  const [submitted, setSubmitted] = useState(!!hackathon.plan?.submitted);

  const [status, setStatus] = useState('Saved');
  const [editing, setEditing] = useState(false);

  const timerRef = useRef(null);
  const hasMountedRef = useRef(false);
  const lastSavedRef = useRef('');

  const payload = useMemo(
    () => ({
      project_idea: projectIdea,
      tech_stack: splitTags(techStackText),
      team_members: splitTags(teamMembersText),
      notes,
      priority,
      idea_done: ideaDone,
      implementation_done: implementationDone,
      demo_done: demoDone,
      submitted: submitted,
    }),
    [projectIdea, techStackText, teamMembersText, notes, priority, ideaDone, implementationDone, demoDone, submitted]
  );

  useEffect(() => {
    const incoming = {
      project_idea: hackathon.plan?.project_idea || '',
      tech_stack: hackathon.plan?.tech_stack || [],
      team_members: hackathon.plan?.team_members || [],
      notes: hackathon.plan?.notes || '',
      priority: hackathon.plan?.priority || 'medium',
      idea_done: !!hackathon.plan?.idea_done,
      implementation_done: !!hackathon.plan?.implementation_done,
      demo_done: !!hackathon.plan?.demo_done,
      submitted: !!hackathon.plan?.submitted,
    };

    const incomingSerialized = JSON.stringify(incoming);
    const currentSerialized = JSON.stringify({
      project_idea: projectIdea,
      tech_stack: splitTags(techStackText),
      team_members: splitTags(teamMembersText),
      notes,
      priority
    });

    if (incomingSerialized !== currentSerialized) {
      setProjectIdea(incoming.project_idea);
      setTechStackText(incoming.tech_stack.join(', '));
      setTeamMembersText(incoming.team_members.join(', '));
      setNotes(incoming.notes);
      setPriority(incoming.priority);
      setIdeaDone(!!incoming.idea_done);
      setImplementationDone(!!incoming.implementation_done);
      setDemoDone(!!incoming.demo_done);
      setSubmitted(!!incoming.submitted);
    }

    lastSavedRef.current = incomingSerialized;
    setStatus('Saved');
  }, [hackathon.plan]);

  const savePlan = async () => {
    if (!sessionToken) {
      setStatus('No auth');
      return;
    }

    setStatus('Saving…');
    try {
      const res = await fetch(`${API_BASE_URL}/api/hackathons/${hackathon.id}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const saved = await res.json();
      lastSavedRef.current = JSON.stringify(payload);
      setStatus('Saved');

      setIdeaDone(!!saved.idea_done);
      setImplementationDone(!!saved.implementation_done);
      setDemoDone(!!saved.demo_done);
      setSubmitted(!!saved.submitted);

      onSaved?.(saved);
    } catch (e) {
      console.error('Save failed', e);
      setStatus('Save failed');
    }
  };


  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-primaryText">Plan Editor</div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-secondaryText">{status}</div>
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm text-secondaryText">✎ Edit</button>
          ) : (
            <button type="button" onClick={() => setEditing(false)} className="text-sm text-secondaryText">Done</button>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Project idea</label>
        <textarea
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          rows="3"
          value={projectIdea}
          onChange={(e) => setProjectIdea(e.target.value)}
          placeholder="Build something awesome…"
          disabled={!editing}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Tech stack (comma separated)</label>
        <input
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          value={techStackText}
          onChange={(e) => setTechStackText(e.target.value)}
          placeholder="React, FastAPI, Supabase"
          disabled={!editing}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Team members (comma separated)</label>
        <input
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          value={teamMembersText}
          onChange={(e) => setTeamMembersText(e.target.value)}
          placeholder="Ava, Sam, Jordan"
          disabled={!editing}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Notes</label>
        <textarea
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          rows="2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra notes…"
          disabled={!editing}
        />
      </div>

      <div>
        <div className="mb-1 block text-xs text-secondaryText">Progress</div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ideaDone} onChange={(e) => setIdeaDone(e.target.checked)} disabled={!editing} />
            <span>Idea finalised</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={implementationDone} onChange={(e) => setImplementationDone(e.target.checked)} disabled={!editing} />
            <span>Implementation completed</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={demoDone} onChange={(e) => setDemoDone(e.target.checked)} disabled={!editing} />
            <span>Demo / Video ready</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={submitted} onChange={(e) => setSubmitted(e.target.checked)} disabled={!editing} />
            <span>Submission submitted</span>
          </label>
        </div>
      </div>

      <div>
        <div className="mb-1 block text-xs text-secondaryText">Priority</div>
        <div className="flex gap-3 text-sm">
          {['high', 'medium', 'low'].map((p) => (
            <label key={p} className="flex items-center gap-2">
              <input
                type="radio"
                name={`priority-${hackathon.id}`}
                checked={priority === p}
                onChange={() => setPriority(p)}
                disabled={!editing}
              />
              <span className="capitalize">{p}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-3">
        <button
          type="button"
          onClick={savePlan}
          disabled={!editing || status === 'Saving…'}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === 'Saving…' ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}