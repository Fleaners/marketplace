'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const CURRENT_VERSION = '1.1.0';
const CURRENT_TIMESTAMP = 1783772828;

export function VersionAlert() {
  const [show, setShow] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState<{ version: string; commit?: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;

        const data = await res.json();
        const serverVersion = data.version || '1.0.0';
        const serverTimestamp = Number(data.timestamp || 0);

        if (serverVersion !== CURRENT_VERSION || serverTimestamp > CURRENT_TIMESTAMP) {
          setNewVersionInfo({ version: serverVersion, commit: data.commit });
          setShow(true);
        }
      } catch (err) {
        console.warn('Failed to check application version:', err);
      }
    };

    // Check on load
    checkVersion();

    // Check periodically every 2 minutes
    const interval = setInterval(checkVersion, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (typeof window === 'undefined') return;
    // Hard reload to bypass cache
    window.location.reload();
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] max-w-sm w-full p-1 animate-fade-in">
      <Card className="bg-slate-900/95 dark:bg-slate-950/95 text-white border border-[#f3d9a7] dark:border-slate-800 p-5 rounded-3xl shadow-2xl backdrop-blur-md flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚀</span>
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#FAB12F]">Updates Available</h4>
            <p className="text-xs text-slate-350 leading-relaxed font-semibold">
              A new version of marketplace.store ({newVersionInfo?.version || 'new'}) is available.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setShow(false)}
            className="px-3.5 py-2 text-2xs uppercase tracking-widest font-black text-slate-400 hover:text-white transition-colors"
          >
            Later
          </button>
          <Button
            size="sm"
            onClick={handleUpdate}
            className="rounded-xl text-xs px-4 py-2 font-bold bg-[#FAB12F] text-slate-950 hover:bg-[#ff8f00] shadow-[0_4px_15px_-4px_rgba(250,177,47,0.4)]"
          >
            Update Now
          </Button>
        </div>
      </Card>
    </div>
  );
}
