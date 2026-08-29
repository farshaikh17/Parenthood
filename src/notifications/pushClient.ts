/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NIGHT NOTIFICATIONS — honest about what works where.
 *
 * - Android (Chrome/Edge/Firefox): web push works from the browser once permission is granted.
 * - iPhone / iPad: web push only works after the app is added to the Home Screen (iOS 16.4+),
 *   and the permission prompt must come from a tap. In a normal Safari tab it cannot work.
 * - Desktop browsers: works while the browser is running.
 *
 * The push server is a small Cloudflare Worker (see /worker). The client tells it, before
 * bedtime, WHEN the simulation predicts the baby will wake tonight; the Worker sends those
 * pushes even while the app is closed. Nothing about the baby lives on the server except
 * those scheduled times and the push subscription.
 */

export type PushCapability =
  | { status: 'unsupported'; reason: string }
  | { status: 'needs_install'; reason: string }
  | { status: 'blocked'; reason: string }
  | { status: 'ready' }
  | { status: 'subscribed' };

export interface ScheduledAlert {
  atRealMs: number;
  title: string;
  body: string;
}

const WORKER_URL: string | undefined = (import.meta as any).env?.VITE_WORKER_URL || (import.meta as any).env?.VITE_PUSH_WORKER_URL;
const VAPID_PUBLIC_KEY: string | undefined = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;

export function isConfigured(): boolean {
  return !!WORKER_URL && !!VAPID_PUBLIC_KEY;
}

function isIOS(): boolean {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export async function getCapability(): Promise<PushCapability> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { status: 'unsupported', reason: 'This browser cannot receive push notifications.' };
  }
  if (isIOS() && !isStandalone()) {
    return { status: 'needs_install', reason: 'On iPhone and iPad, night alerts only work after you add Parenthood to your Home Screen (Share → Add to Home Screen) and open it from there.' };
  }
  if (Notification.permission === 'denied') {
    return { status: 'blocked', reason: 'Notifications are blocked for this site in your browser settings.' };
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) return { status: 'subscribed' };
  } catch {}
  return { status: 'ready' };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

/** Must be called from a click handler (iOS requirement). */
export async function enableNightPush(userId: string): Promise<{ ok: boolean; message: string }> {
  if (!isConfigured()) return { ok: false, message: 'Night alerts are not set up on this server yet.' };
  const cap = await getCapability();
  if (cap.status === 'unsupported' || cap.status === 'needs_install' || cap.status === 'blocked') return { ok: false, message: cap.reason };
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, message: 'Permission was not granted. You can change this in your browser settings.' };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as unknown as BufferSource });
    const res = await fetch(`${WORKER_URL}/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription: sub.toJSON() })
    });
    if (!res.ok) return { ok: false, message: 'The alert server refused the subscription.' };
    return { ok: true, message: 'Night alerts are on for this device.' };
  } catch (e: any) {
    return { ok: false, message: 'Could not subscribe: ' + (e?.message || 'unknown error') };
  }
}

export async function disableNightPush(userId: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    if (isConfigured()) await fetch(`${WORKER_URL}/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
  } catch {}
}

/** Replace tonight's schedule on the server. An empty list clears it. */
export async function scheduleAlerts(userId: string, alerts: ScheduledAlert[]): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(`${WORKER_URL}/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, alerts })
    });
    return res.ok;
  } catch { return false; }
}

/** Local notification while the tab is open in the background (no server needed). */
export async function showLocalNightNotification(title: string, body: string): Promise<void> {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, tag: 'parenthood-night', requireInteraction: true, icon: '/icon.svg' });
  } catch {}
}
