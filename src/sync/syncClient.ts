/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyncSnapshot } from './protocol';

/**
 * Talks to the household sync endpoints on the Worker (see /worker). All calls are
 * best-effort: the app must keep working with no server at all.
 */

const WORKER_URL: string | undefined = (import.meta as any).env?.VITE_WORKER_URL || (import.meta as any).env?.VITE_PUSH_WORKER_URL;

export function isSyncConfigured(): boolean {
  return !!WORKER_URL;
}

export interface SyncLocalConfig {
  deviceId: string;
  deviceName: string;
  code: string | null;       // household code, null = not sharing
  version: number;           // server version this phone last saw
}

const KEY = 'parenthood_sync';

export function loadSyncConfig(): SyncLocalConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const cfg: SyncLocalConfig = { deviceId: 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36), deviceName: defaultDeviceName(), code: null, version: 0 };
  saveSyncConfig(cfg);
  return cfg;
}

export function saveSyncConfig(cfg: SyncLocalConfig): void {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
}

function defaultDeviceName(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  return 'This device';
}

export type PullResult =
  | { status: 'unchanged' }
  | { status: 'ok'; version: number; snapshot: SyncSnapshot }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export type PushResult =
  | { status: 'ok'; version: number }
  | { status: 'conflict'; version: number; snapshot: SyncSnapshot }
  | { status: 'error'; message: string };

export async function createHousehold(code: string, snapshot: SyncSnapshot): Promise<PushResult> {
  if (!WORKER_URL) return { status: 'error', message: 'Sync server not configured' };
  try {
    const res = await fetch(`${WORKER_URL}/sync/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion: 0, snapshot, create: true }) });
    const data = await res.json();
    if (res.status === 409) return { status: 'conflict', version: data.version, snapshot: data.snapshot };
    if (!res.ok) return { status: 'error', message: data.error || 'Server refused' };
    return { status: 'ok', version: data.version };
  } catch (e: any) { return { status: 'error', message: e?.message || 'Network error' }; }
}

export async function pullHousehold(code: string, sinceVersion: number): Promise<PullResult> {
  if (!WORKER_URL) return { status: 'error', message: 'Sync server not configured' };
  try {
    const res = await fetch(`${WORKER_URL}/sync/${code}?since=${sinceVersion}`);
    if (res.status === 304) return { status: 'unchanged' };
    if (res.status === 404) return { status: 'not_found' };
    const data = await res.json();
    if (!res.ok) return { status: 'error', message: data.error || 'Server error' };
    return { status: 'ok', version: data.version, snapshot: data.snapshot };
  } catch (e: any) { return { status: 'error', message: e?.message || 'Network error' }; }
}

export async function pushHousehold(code: string, baseVersion: number, snapshot: SyncSnapshot): Promise<PushResult> {
  if (!WORKER_URL) return { status: 'error', message: 'Sync server not configured' };
  try {
    const res = await fetch(`${WORKER_URL}/sync/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion, snapshot }) });
    const data = await res.json();
    if (res.status === 409) return { status: 'conflict', version: data.version, snapshot: data.snapshot };
    if (!res.ok) return { status: 'error', message: data.error || 'Server refused' };
    return { status: 'ok', version: data.version };
  } catch (e: any) { return { status: 'error', message: e?.message || 'Network error' }; }
}

export async function deleteHousehold(code: string): Promise<void> {
  if (!WORKER_URL) return;
  try { await fetch(`${WORKER_URL}/sync/${code}`, { method: 'DELETE' }); } catch {}
}
