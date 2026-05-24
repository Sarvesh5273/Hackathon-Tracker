export function getUrgency(deadlineIso) {
  if (!deadlineIso) return { label: 'No deadline', tone: 'neutral', pulse: false };

  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return { label: 'No deadline', tone: 'neutral', pulse: false };

  const diff = deadline - Date.now();
  const hours = diff / (1000 * 60 * 60);
  const days = diff / (1000 * 60 * 60 * 24);

  if (hours < 24) return { label: 'Urgent', tone: 'red', pulse: true };
  if (days <= 7) return { label: 'Soon', tone: 'amber', pulse: false };
  return { label: 'Plenty of time', tone: 'green', pulse: false };
}


export function formatCountdown(deadlineIso) {
  if (!deadlineIso) return 'No deadline';

  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return 'No deadline';

  const diff = Math.max(0, deadline - Date.now());
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return `${days}d ${hours}h ${minutes}m`;
}


export function toDateInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}


export function dateInputToIso(dateValue) {
  if (!dateValue) return null;
  return `${dateValue}T23:59:59Z`;
}


// ─── NEW FUNCTIONS BELOW ──────────────────────────────────────────────────────

export function getHackathonPhase(hackathon) {
  const now = Date.now();

  const parse = (iso) => (iso ? new Date(iso).getTime() : null);

  const regOpen   = parse(hackathon.registration_open_at);
  const regClose  = parse(hackathon.registration_deadline);
  const subOpen   = parse(hackathon.submission_open_at);
  const subClose  = parse(hackathon.submission_deadline);

  // Closed — submission deadline has passed
  if (subClose && now > subClose) return 'Closed';

  // Submission open — we're past submission open (or no open date set) and before deadline
  if (subOpen && now >= subOpen) return 'Submission open';
  if (!subOpen && subClose && now < subClose) return 'Submission open';

  // Registration closed — reg deadline passed but submission not open yet
  if (regClose && now > regClose) return 'Registration closed';

  // Registration open — reg open date has passed (or no open date set) and reg not closed
  if (regOpen && now >= regOpen) return 'Registration open';
  if (!regOpen && regClose && now < regClose) return 'Registration open';

  // Not open yet — nothing has started
  return 'Not open yet';
}


export function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}