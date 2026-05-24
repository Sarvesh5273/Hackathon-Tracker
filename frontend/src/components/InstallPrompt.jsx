import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    const t = setTimeout(() => {
      // If no beforeinstallprompt fired and on mobile, show fallback
      const isMobile = /Mobi|Android/i.test(navigator.userAgent || '');
      if (!deferredPrompt && isMobile) setVisible(true);
    }, 10000);

    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  if (!visible) return null;

  const handleInstall = async () => {
    if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setVisible(false);
      setDeferredPrompt(null);
      return;
    }

    // Fallback: show instructions
    alert('To install: open your browser menu and choose "Add to Home screen"');
    setVisible(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 60 }}>
      <div className="rounded-xl border border-border bg-card p-3 shadow-terminal">
        <div className="mb-2 text-sm font-semibold">Add HackOS to your device</div>
        <div className="mb-3 text-xs text-secondaryText">Install the PWA for quick access.</div>
        <div className="flex gap-2">
          <button onClick={handleInstall} className="rounded-xl bg-white px-3 py-1 text-sm font-semibold text-black">Add to Home Screen</button>
          <button onClick={() => setVisible(false)} className="rounded-xl border border-border px-3 py-1 text-sm">Dismiss</button>
        </div>
      </div>
    </div>
  );
}
