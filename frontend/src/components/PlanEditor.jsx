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
  const [status, setStatus] = useState('Saved');

  const timerRef = useRef(null);
  const hasMountedRef = useRef(false);
  const lastSavedRef = useRef('');

  const payload = useMemo(
    () => ({
      project_idea: projectIdea,
      tech_stack: splitTags(techStackText),
      team_members: splitTags(teamMembersText),
      notes,
      priority
    }),
    [projectIdea, techStackText, teamMembersText, notes, priority]
  );

  useEffect(() => {
    const incoming = {
      project_idea: hackathon.plan?.project_idea || '',
      tech_stack: hackathon.plan?.tech_stack || [],
      team_members: hackathon.plan?.team_members || [],
      notes: hackathon.plan?.notes || '',
      priority: hackathon.plan?.priority || 'medium'
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
    }

    lastSavedRef.current = incomingSerialized;
    setStatus('Saved');
  }, [hackathon.plan]);

  useEffect(() => {
    if (!sessionToken) return;

    const serializedPayload = JSON.stringify(payload);

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      lastSavedRef.current = serializedPayload;
      return;
    }

    if (serializedPayload === lastSavedRef.current) {
      return;
    }

    setStatus('Saving…');
    window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/hackathons/${hackathon.id}/plan`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        lastSavedRef.current = serializedPayload;
        setStatus('Saved');

        // Optional local callback only, but parent should not refetch the whole dashboard here.
        onSaved?.(payload);
      } catch {
        setStatus('Save failed');
      }
    }, 1000);

    return () => window.clearTimeout(timerRef.current);
  }, [payload, hackathon.id, sessionToken, onSaved]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-primaryText">Plan Editor</div>
        <div className="text-xs text-secondaryText">{status}</div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Project idea</label>
        <textarea
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          rows="3"
          value={projectIdea}
          onChange={(e) => setProjectIdea(e.target.value)}
          placeholder="Build something awesome…"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Tech stack (comma separated)</label>
        <input
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          value={techStackText}
          onChange={(e) => setTechStackText(e.target.value)}
          placeholder="React, FastAPI, Supabase"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-secondaryText">Team members (comma separated)</label>
        <input
          className="w-full rounded-xl border border-border bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-secondaryText/60"
          value={teamMembersText}
          onChange={(e) => setTeamMembersText(e.target.value)}
          placeholder="Ava, Sam, Jordan"
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
        />
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
              />
              <span className="capitalize">{p}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}