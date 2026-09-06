/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Heart, Moon, Share, CheckCircle2 } from 'lucide-react';
import { PushCapability, enableNightPush, getCapability, isConfigured } from '../notifications/pushClient';

interface Props {
  babyName: string;
  userId: string;
  onDone: () => void;
}

/**
 * The "stay close" moment, right after meeting the baby. One clear ask, in the baby's
 * name, with a real explanation of what will be sent — and an honest path for devices
 * where web push cannot work (iOS Safari tab). "Not now" is always available; the
 * same switch lives in Settings.
 */
export const NotificationPermissionScreen: React.FC<Props> = ({ babyName, userId, onDone }) => {
  const [cap, setCap] = useState<PushCapability | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    getCapability().then(setCap).catch(() => setCap({ status: 'unsupported', reason: 'This browser cannot receive push notifications.' }));
  }, []);

  const allow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await enableNightPush(userId);
      if (r.ok) {
        setGranted(true);
        setTimeout(onDone, 1600);
      } else {
        setMessage(r.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const canPrompt = isConfigured() && cap && (cap.status === 'ready' || cap.status === 'subscribed');
  const isInstallNeeded = cap?.status === 'needs_install';

  if (granted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in duration-300">
        <CheckCircle2 className="w-12 h-12 text-teal-400" />
        <h1 className="text-xl font-bold text-stone-100">You're connected to {babyName}</h1>
        <p className="text-xs text-stone-400">We'll send updates when {babyName} needs you.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-teal-950/70 border border-teal-800/50 flex items-center justify-center">
          <Bell className="w-8 h-8 text-teal-300" />
        </div>

        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-bold text-stone-100">Stay close to {babyName}</h1>
          <p className="text-sm text-amber-200/90 font-medium">
            Please allow notifications — for {babyName}'s wellbeing.
          </p>
          <p className="text-xs text-stone-400 leading-relaxed">
            A real baby doesn't wait until you open an app, and neither does {babyName}. If you allow
            notifications, we'll send you {babyName}'s updates: when a feed is coming due, when {babyName} wakes
            in the night, and a nudge if you've been away a while.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2 text-left">
          {[
            { icon: <Heart className="w-4 h-4 text-rose-300" />, text: `"${babyName} needs you" — feeds and unsettled moments` },
            { icon: <Moon className="w-4 h-4 text-indigo-300" />, text: `"${babyName} is awake" — night wakings, even with the app closed` },
            { icon: <Bell className="w-4 h-4 text-teal-300" />, text: `"${babyName} update" — a gentle reminder if you've been gone a while` }
          ].map((row, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 rounded-2xl bg-stone-800/40 border border-stone-700/60">
              {row.icon}
              <span className="text-[11px] text-stone-300">{row.text}</span>
            </div>
          ))}
        </div>

        {isInstallNeeded && (
          <div className="w-full max-w-sm p-3 rounded-2xl bg-sky-950/40 border border-sky-800/50 text-left flex items-start space-x-2">
            <Share className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
            <p className="text-[11px] text-stone-300 leading-relaxed">
              On iPhone and iPad, notifications only work once Parenthood is on your Home Screen:
              tap <span className="text-sky-200 font-medium">Share → Add to Home Screen</span>, then open it from
              there and allow notifications in Settings → Night mode.
            </p>
          </div>
        )}

        {!isConfigured() && cap && !isInstallNeeded && (
          <p className="text-[11px] text-stone-500 max-w-sm">
            This build isn't connected to the alert server, so updates will show inside the app only.
          </p>
        )}

        {cap?.status === 'blocked' && (
          <p className="text-[11px] text-amber-200 max-w-sm">
            Notifications are blocked for this site in your browser settings — you can change that any time,
            then turn them on in Settings → Night mode.
          </p>
        )}

        {message && <p className="text-[11px] text-amber-200 max-w-sm">{message}</p>}
      </div>

      <div className="pt-6 space-y-2 max-w-sm w-full mx-auto">
        {canPrompt && (
          <button
            onClick={allow}
            disabled={busy}
            className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {busy ? 'Asking your browser…' : `Allow notifications for ${babyName}`}
          </button>
        )}
        <button
          onClick={onDone}
          className="w-full py-3 rounded-2xl bg-stone-800/60 border border-stone-700 text-stone-300 text-xs font-medium flex items-center justify-center space-x-1.5"
        >
          <BellOff className="w-3.5 h-3.5" />
          <span>{canPrompt ? 'Not now' : `Continue to ${babyName}`}</span>
        </button>
        <p className="text-[10px] text-stone-500 text-center leading-relaxed pb-2">
          {babyName} is simulated — no real child is affected. You can turn notifications on or off any time in
          Settings, and your browser will always ask before anything is sent.
        </p>
      </div>
    </div>
  );
};
