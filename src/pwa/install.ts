/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * "Add to Home Screen" helper. Android/desktop Chrome fire `beforeinstallprompt`; we keep
 * the event and show our own button. iOS never fires it — there we can only explain the
 * Share → Add to Home Screen steps.
 */
let deferredPrompt: any = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach(l => l());
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; listeners.forEach(l => l()); });
}

export function onInstallAvailabilityChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function canPromptInstall(): boolean {
  return !!deferredPrompt;
}

export function isIOSDevice(): boolean {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const p = deferredPrompt;
  deferredPrompt = null;
  try {
    p.prompt();
    const choice = await p.userChoice;
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch { return 'unavailable'; }
}
