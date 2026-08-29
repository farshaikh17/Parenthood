/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppSavedData } from '../simulation/storage';
import {
  FOLLOWER_PULL_MS, LEADER_HEARTBEAT_MS, PUSH_DEBOUNCE_MS, SyncMeta, SyncSnapshot,
  decideOnPull, generateHouseholdCode, isLeader as computeIsLeader, leaderIsStale, makeMeta, normalizeCode
} from './protocol';
import {
  SyncLocalConfig, createHousehold, deleteHousehold, isSyncConfigured, loadSyncConfig, pullHousehold, pushHousehold, saveSyncConfig
} from './syncClient';

export interface RemoteApplyInfo {
  /** This phone is now running the simulation (the previous leader went quiet or handed over). */
  takeOver: boolean;
  /** Name of the phone whose save we just adopted. */
  fromDeviceName: string;
  /** Real-time gap (ms) since that save — the away policy should cover it when taking over. */
  gapMs: number;
  /** True when the caring phone is different from before (worth a note in the timeline). */
  leaderChanged: boolean;
}

export interface HouseholdSync {
  configured: boolean;
  code: string | null;
  deviceName: string;
  isLeader: boolean;
  leaderName: string | null;
  lastSyncAt: number | null;
  status: string | null;
  create: () => Promise<string | null>;
  join: (code: string) => Promise<boolean>;
  leave: () => Promise<void>;
  claimLeadership: () => void;
  renameDevice: (name: string) => void;
}

/**
 * Keeps this phone's save in step with the household's shared copy. The App gates its
 * simulation loop on `isLeader`; a watching phone never runs the engine.
 */
export function useHouseholdSync(current: AppSavedData, applyRemote: (data: AppSavedData, info: RemoteApplyInfo) => void): HouseholdSync {
  const [cfg, setCfg] = useState<SyncLocalConfig>(() => loadSyncConfig());
  const [meta, setMeta] = useState<SyncMeta | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const configured = isSyncConfigured();

  const currentRef = useRef(current);
  currentRef.current = current;
  const metaRef = useRef<SyncMeta | null>(null);
  const cfgRef = useRef(cfg);
  const applyRef = useRef(applyRemote);
  applyRef.current = applyRemote;
  const pushTimer = useRef<number | null>(null);
  const busy = useRef(false);
  const suppressPushUntil = useRef(0);

  const updateCfg = useCallback((patch: Partial<SyncLocalConfig>) => {
    const next = { ...cfgRef.current, ...patch };
    cfgRef.current = next;
    saveSyncConfig(next);
    setCfg(next);
  }, []);
  const updateMeta = useCallback((m: SyncMeta | null) => { metaRef.current = m; setMeta(m); }, []);

  const sharing = configured && !!cfg.code && !!current.baby;
  const now = Date.now();
  const leader = !sharing || computeIsLeader(meta, cfg.deviceId, now);

  const adopt = useCallback((snapshot: SyncSnapshot, version: number) => {
    const prev = metaRef.current;
    const nowMs = Date.now();
    const stale = leaderIsStale(snapshot.meta, nowMs);
    const takeOver = stale && snapshot.meta.leaderDeviceId !== cfgRef.current.deviceId;
    const m = takeOver ? makeMeta(cfgRef.current.deviceId, cfgRef.current.deviceName, nowMs, snapshot.meta, true) : snapshot.meta;
    suppressPushUntil.current = nowMs + 1500; // the state change we are about to cause is not ours to push back
    updateMeta(m);
    updateCfg({ version });
    setLastSyncAt(nowMs);
    applyRef.current(snapshot.data, {
      takeOver,
      fromDeviceName: snapshot.meta.leaderDeviceName,
      gapMs: Math.max(0, nowMs - snapshot.meta.savedAtRealMs),
      leaderChanged: !prev || prev.leaderDeviceId !== m.leaderDeviceId
    });
    if (takeOver) setStatus(`${snapshot.meta.leaderDeviceName} went quiet — this phone has taken over.`);
    else if (prev && prev.leaderDeviceId === cfgRef.current.deviceId && m.leaderDeviceId !== cfgRef.current.deviceId) setStatus(`${m.leaderDeviceName} is caring now — this phone is watching.`);
    else setStatus(null);
    if (takeOver) schedulePush(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doPull = useCallback(async () => {
    const c = cfgRef.current;
    if (!c.code || busy.current) return;
    busy.current = true;
    try {
      const r = await pullHousehold(c.code, c.version);
      if (r.status === 'ok') {
        const local: SyncSnapshot | null = metaRef.current ? { data: currentRef.current, meta: metaRef.current } : null;
        const d = decideOnPull(local, r.snapshot, c.deviceId);
        if (d.action === 'apply_remote') adopt(r.snapshot, r.version);
        else updateCfg({ version: r.version });
      } else if (r.status === 'unchanged') {
        setLastSyncAt(Date.now());
        // Leader gone quiet while we watch? Take over.
        if (metaRef.current && leaderIsStale(metaRef.current, Date.now()) && metaRef.current.leaderDeviceId !== c.deviceId) {
          const m = makeMeta(c.deviceId, c.deviceName, Date.now(), metaRef.current, true);
          updateMeta(m);
          applyRef.current(currentRef.current, { takeOver: true, fromDeviceName: metaRef.current.leaderDeviceName, gapMs: Date.now() - metaRef.current.leaderHeartbeatMs, leaderChanged: true });
          setStatus(`${metaRef.current.leaderDeviceName} went quiet — this phone has taken over.`);
          schedulePush(true);
        }
      } else if (r.status === 'not_found') {
        setStatus('This household code no longer exists on the server.');
      } else {
        setStatus('Could not reach the sync server. Working on this phone only for now.');
      }
    } finally { busy.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doPush = useCallback(async (claim: boolean) => {
    const c = cfgRef.current;
    if (!c.code || busy.current) { if (c.code) schedulePush(claim); return; }
    const nowMs = Date.now();
    if (!claim && metaRef.current && !computeIsLeader(metaRef.current, c.deviceId, nowMs)) return; // watchers never push
    busy.current = true;
    try {
      const m = makeMeta(c.deviceId, c.deviceName, nowMs, metaRef.current, claim);
      const r = await pushHousehold(c.code, c.version, { data: currentRef.current, meta: m });
      if (r.status === 'ok') {
        updateMeta(m);
        updateCfg({ version: r.version });
        setLastSyncAt(nowMs);
        setStatus(null);
      } else if (r.status === 'conflict') {
        // Someone saved after the version we based this on. If another phone has taken the
        // baby (it is the leader in that save) and we are not claiming, we adopt its save;
        // otherwise (our own racing push, or we are deliberately taking over) we retry on top.
        const otherLeads = r.snapshot.meta.leaderDeviceId !== c.deviceId;
        if (otherLeads && !claim) adopt(r.snapshot, r.version);
        else { updateCfg({ version: r.version }); busy.current = false; await doPush(claim); return; }
      } else {
        setStatus('Could not reach the sync server. Working on this phone only for now.');
      }
    } finally { busy.current = false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Throttle, not debounce: the engine changes state every second, so a debounce would never fire.
  const schedulePush = useCallback((claim = false) => {
    if (pushTimer.current) {
      if (!claim) return;
      window.clearTimeout(pushTimer.current);
    }
    pushTimer.current = window.setTimeout(() => { pushTimer.current = null; doPush(claim); }, claim ? 50 : PUSH_DEBOUNCE_MS);
  }, [doPush]);

  // Leader: push when the save changes (debounced) and heartbeat regularly. Follower: pull regularly.
  useEffect(() => {
    if (!sharing) return;
    if (leader) {
      if (Date.now() < suppressPushUntil.current) return;
      schedulePush(false);
    }
  }, [sharing, leader, current, schedulePush]);

  useEffect(() => {
    if (!sharing) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (metaRef.current && computeIsLeader(metaRef.current, cfgRef.current.deviceId, Date.now())) doPush(false);
      else doPull();
    }, leader ? LEADER_HEARTBEAT_MS : FOLLOWER_PULL_MS);
    return () => window.clearInterval(id);
  }, [sharing, leader, doPush, doPull]);

  // On open / return to the app: pull first
  useEffect(() => {
    if (!sharing) return;
    doPull();
    const onVisible = () => { if (document.visibilityState === 'visible') doPull(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [sharing, doPull]);

  const create = useCallback(async () => {
    if (!configured || !currentRef.current.baby) return null;
    const code = generateHouseholdCode();
    const m = makeMeta(cfgRef.current.deviceId, cfgRef.current.deviceName, Date.now(), null, true);
    const r = await createHousehold(code, { data: currentRef.current, meta: m });
    if (r.status !== 'ok') { setStatus(r.status === 'error' ? r.message : 'That code is taken; try again.'); return null; }
    updateMeta(m);
    updateCfg({ code, version: r.version });
    setLastSyncAt(Date.now());
    setStatus(null);
    return code;
  }, [configured, updateCfg, updateMeta]);

  const join = useCallback(async (input: string) => {
    const code = normalizeCode(input);
    if (!code) { setStatus('That does not look like a household code.'); return false; }
    const r = await pullHousehold(code, 0);
    if (r.status !== 'ok') { setStatus(r.status === 'not_found' ? 'No household with that code.' : 'Could not reach the sync server.'); return false; }
    updateCfg({ code, version: 0 });
    adopt(r.snapshot, r.version);
    return true;
  }, [adopt, updateCfg]);

  const leave = useCallback(async () => {
    if (pushTimer.current) window.clearTimeout(pushTimer.current);
    updateCfg({ code: null, version: 0 });
    updateMeta(null);
    setStatus(null);
  }, [updateCfg, updateMeta]);

  const claimLeadership = useCallback(() => {
    if (!cfgRef.current.code) return;
    if (metaRef.current && computeIsLeader(metaRef.current, cfgRef.current.deviceId, Date.now())) return;
    const m = makeMeta(cfgRef.current.deviceId, cfgRef.current.deviceName, Date.now(), metaRef.current, true);
    updateMeta(m);
    setStatus('This phone is caring now.');
    schedulePush(true);
  }, [schedulePush, updateMeta]);

  const renameDevice = useCallback((name: string) => updateCfg({ deviceName: name.trim().slice(0, 30) || 'This device' }), [updateCfg]);

  void deleteHousehold;
  return {
    configured,
    code: cfg.code,
    deviceName: cfg.deviceName,
    isLeader: leader,
    leaderName: meta ? meta.leaderDeviceName : null,
    lastSyncAt,
    status,
    create, join, leave, claimLeadership, renameDevice
  };
}
