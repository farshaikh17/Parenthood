/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSavedData } from '../simulation/storage';

/**
 * TWO-PHONE SYNC — the rules, with no network in them (so they can be tested).
 *
 * One baby, one household code, any number of phones. The whole save travels as a single
 * snapshot with a version number kept by the server (compare-and-set: a push must name
 * the version it was based on, or it is refused and the newer snapshot comes back).
 *
 * Only ONE phone runs the simulation at a time — the "leader": the phone that last cared
 * for the baby. Everyone else watches and refreshes. If the leader goes quiet for a
 * while (phone off, app closed) any watcher may take over, running the normal away
 * policy for the gap. Nothing here is ever silent: taking over or being overtaken
 * leaves an event in the timeline.
 */

export const LEADER_STALE_MS = 90 * 1000;
export const LEADER_HEARTBEAT_MS = 20 * 1000;
export const FOLLOWER_PULL_MS = 8 * 1000;
export const PUSH_DEBOUNCE_MS = 2500;

export interface SyncMeta {
  leaderDeviceId: string;
  leaderDeviceName: string;
  leaderHeartbeatMs: number;   // real time the leader last saved
  savedAtRealMs: number;       // real time of this snapshot
  savedByDeviceId: string;
}

export interface SyncSnapshot {
  data: AppSavedData;
  meta: SyncMeta;
}

export function isLeader(meta: SyncMeta | null | undefined, deviceId: string, nowMs: number): boolean {
  if (!meta) return true;                       // nothing shared yet: this phone is on its own
  if (meta.leaderDeviceId === deviceId) return true;
  return nowMs - meta.leaderHeartbeatMs > LEADER_STALE_MS;   // leader has gone quiet: anyone may take over
}

export function leaderIsStale(meta: SyncMeta | null | undefined, nowMs: number): boolean {
  return !!meta && nowMs - meta.leaderHeartbeatMs > LEADER_STALE_MS;
}

export type PullDecision =
  | { action: 'apply_remote'; reason: 'newer' | 'first_pull' }
  | { action: 'keep_local'; reason: 'same' | 'local_newer' };

/**
 * Remote won a version race or is simply newer: take it. Local only wins when it is the
 * leader's own more recent save (e.g. the push has not gone out yet).
 */
export function decideOnPull(local: SyncSnapshot | null, remote: SyncSnapshot, deviceId: string): PullDecision {
  if (!local) return { action: 'apply_remote', reason: 'first_pull' };
  if (remote.meta.savedAtRealMs === local.meta.savedAtRealMs && remote.meta.savedByDeviceId === local.meta.savedByDeviceId) {
    return { action: 'keep_local', reason: 'same' };
  }
  if (remote.meta.savedAtRealMs > local.meta.savedAtRealMs) return { action: 'apply_remote', reason: 'newer' };
  // Local is newer. Only trust that if we are the one caring for the baby.
  if (local.meta.leaderDeviceId === deviceId) return { action: 'keep_local', reason: 'local_newer' };
  return { action: 'apply_remote', reason: 'newer' };
}

export function makeMeta(deviceId: string, deviceName: string, nowMs: number, previous?: SyncMeta | null, claimLeadership = false): SyncMeta {
  const lead = claimLeadership || !previous || isLeader(previous, deviceId, nowMs);
  return {
    leaderDeviceId: lead ? deviceId : previous!.leaderDeviceId,
    leaderDeviceName: lead ? deviceName : previous!.leaderDeviceName,
    leaderHeartbeatMs: lead ? nowMs : previous!.leaderHeartbeatMs,
    savedAtRealMs: nowMs,
    savedByDeviceId: deviceId
  };
}

/** Household codes: 8 characters, no look-alikes (0/O, 1/I/L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateHouseholdCode(rnd: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[Math.floor(rnd() * CODE_ALPHABET.length)];
  return out.slice(0, 4) + '-' + out.slice(4);
}
export function normalizeCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length !== 8 || [...raw].some(c => !CODE_ALPHABET.includes(c))) return null;
  return raw.slice(0, 4) + '-' + raw.slice(4);
}
