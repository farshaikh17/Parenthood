/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface NightAlertProps {
  babyName: string;
  atMs: number;
  cryIntensity: 'gentle' | 'moderate' | 'loud' | 'piercing';
  soundEnabled: boolean;
  onGoToBaby: () => void;
}

/**
 * THE BABY-MONITOR MOMENT. Dark screen, the time, crying — and no explanation.
 * The needs are not revealed here; the user goes to the baby and works it out.
 */
export const NightAlert: React.FC<NightAlertProps> = ({ babyName, atMs, cryIntensity, soundEnabled, onGoToBaby }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!soundEnabled) return;
    const intensity = cryIntensity === 'piercing' ? 1 : cryIntensity === 'loud' ? 0.85 : cryIntensity === 'moderate' ? 0.65 : 0.45;
    soundFx.playCry(intensity, 4);
    const id = setInterval(() => soundFx.playCry(Math.min(1, intensity + seconds / 120), 4), 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, cryIntensity]);

  const time = new Date(atMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="fixed inset-0 z-[60] bg-black text-stone-200 flex flex-col items-center justify-center p-8 text-center select-none">
      <Moon className="w-8 h-8 text-indigo-300/70 mb-6" />
      <div className="text-5xl font-semibold tracking-tight text-stone-100">{time}</div>
      <div className="mt-6 text-lg text-stone-300">{babyName} is crying.</div>
      <div className="mt-2 text-xs text-stone-500">{seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`} so far</div>
      <button
        onClick={onGoToBaby}
        className="mt-12 px-6 py-3 rounded-2xl bg-stone-800 border border-stone-700 text-stone-100 text-sm font-medium hover:bg-stone-700"
      >
        Go to {babyName}
      </button>
      <p className="mt-8 text-[10px] text-stone-600 max-w-xs">This is the simulation's night. Nothing here is medical advice.</p>
    </div>
  );
};
