/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * M9: the real app container. On a phone it fills the screen edge to edge and respects the
 * notch / home-indicator safe areas. On a desktop browser it becomes a phone-width column so
 * the layout still makes sense — but there is no fake bezel, status bar or battery any more.
 */
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div className="app-viewport bg-stone-950 text-stone-100 font-sans selection:bg-teal-500 selection:text-white sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="app-column relative bg-stone-900 flex flex-col overflow-hidden w-full sm:max-w-[430px] sm:h-[min(900px,calc(100dvh-2rem))] sm:rounded-3xl sm:border sm:border-stone-800 sm:shadow-2xl">
        {!online && (
          <div className="flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] bg-amber-950/80 text-amber-100 border-b border-amber-900/60">
            <WifiOff className="w-3 h-3" />
            <span>Offline — the baby keeps going on this phone; AI explanations and sharing pause until you're back online.</span>
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-y-auto bg-stone-900 relative">
          {children}
        </div>
      </div>
    </div>
  );
};
