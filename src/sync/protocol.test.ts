/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { LEADER_STALE_MS, SyncMeta, SyncSnapshot, decideOnPull, generateHouseholdCode, isLeader, makeMeta, normalizeCode } from './protocol';
import { AppSavedData } from '../simulation/storage';

const data = {} as AppSavedData;
const t0 = 1_000_000_000_000;
const meta = (o: Partial<SyncMeta>): SyncMeta => ({ leaderDeviceId: 'A', leaderDeviceName: 'Phone A', leaderHeartbeatMs: t0, savedAtRealMs: t0, savedByDeviceId: 'A', ...o });
const snap = (o: Partial<SyncMeta>): SyncSnapshot => ({ data, meta: meta(o) });

describe('M8 — household sync rules', () => {
  it('the phone that acted last is the leader; a quiet leader can be replaced', () => {
    expect(isLeader(meta({}), 'A', t0 + 1000)).toBe(true);
    expect(isLeader(meta({}), 'B', t0 + 1000)).toBe(false);
    expect(isLeader(meta({}), 'B', t0 + LEADER_STALE_MS + 1)).toBe(true);
    expect(isLeader(null, 'B', t0)).toBe(true);
  });
  it('a newer remote save always wins; a watcher never keeps its own copy over the remote', () => {
    expect(decideOnPull(null, snap({}), 'B').action).toBe('apply_remote');
    expect(decideOnPull(snap({}), snap({}), 'B')).toEqual({ action: 'keep_local', reason: 'same' });
    expect(decideOnPull(snap({ savedAtRealMs: t0 }), snap({ savedAtRealMs: t0 + 5000 }), 'A').action).toBe('apply_remote');
    // local is newer and I am the leader → keep mine (my push is simply in flight)
    expect(decideOnPull(snap({ savedAtRealMs: t0 + 5000 }), snap({ savedAtRealMs: t0 }), 'A')).toEqual({ action: 'keep_local', reason: 'local_newer' });
    // local is newer but I am only watching → the remote is authoritative
    expect(decideOnPull(snap({ savedAtRealMs: t0 + 5000, savedByDeviceId: 'B' }), snap({ savedAtRealMs: t0 }), 'B').action).toBe('apply_remote');
  });
  it('makeMeta keeps the current leader unless it is stale or leadership is claimed', () => {
    const asWatcher = makeMeta('B', 'Phone B', t0 + 1000, meta({}));
    expect(asWatcher.leaderDeviceId).toBe('A');
    expect(asWatcher.savedByDeviceId).toBe('B');
    const claimed = makeMeta('B', 'Phone B', t0 + 1000, meta({}), true);
    expect(claimed.leaderDeviceId).toBe('B');
    expect(claimed.leaderHeartbeatMs).toBe(t0 + 1000);
    const takeover = makeMeta('B', 'Phone B', t0 + LEADER_STALE_MS + 1, meta({}));
    expect(takeover.leaderDeviceId).toBe('B');
  });
  it('household codes avoid look-alike characters and normalise user input', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const code = generateHouseholdCode(rnd);
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).not.toMatch(/[01OIL]/);
    expect(normalizeCode(' abcd 2345 ')).toBe('ABCD-2345');
    expect(normalizeCode('ABCD-0345')).toBeNull();
    expect(normalizeCode('ABC')).toBeNull();
  });
});
