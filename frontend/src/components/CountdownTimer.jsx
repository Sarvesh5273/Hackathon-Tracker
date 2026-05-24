import React, { useEffect, useMemo, useState } from 'react';
import { formatCountdown, getUrgency } from '../lib/date';

export default function CountdownTimer({ deadlineIso }) {
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const urgency = useMemo(() => getUrgency(deadlineIso), [deadlineIso, nowTick]);
  const text = useMemo(() => formatCountdown(deadlineIso), [deadlineIso, nowTick]);

  const toneClass =
    urgency.tone === 'red'
      ? 'text-urgencyRed'
      : urgency.tone === 'amber'
        ? 'text-urgencyAmber'
        : urgency.tone === 'green'
          ? 'text-urgencyGreen'
          : 'text-secondaryText';

  return (
    <div className={`text-sm font-semibold ${toneClass} ${urgency.pulse ? 'animate-pulse' : ''}`}>
      {text}
    </div>
  );
}
