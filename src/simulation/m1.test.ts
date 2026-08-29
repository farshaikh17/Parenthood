/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runAwayCatchup, computeElapsedSimMs } from './autopilot';
import { accumulateAction, accumulateTick, getDayLog, summarizeDay } from './dayLog';
import { SimulationEngine, isNighttimeHour } from './engine';
import { INITIAL_MILESTONES } from './initialData';
import { loadSavedAppData, saveAppData, MAX_EVENTS, getDefaultSettings } from './storage';
import { formatWeight, formatLength, formatVolume, lbsOzToGrams, gramsToLbsOz, feedSliderConfig } from '../utils/units';
import { createMockBaby, createMockState, createMockParents, createMockSettings, createMockUserProfile } from './engine.test';
import { SimulationEvent } from '../types';

// Minimal localStorage shim for storage tests
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

describe('M1 — storage retention (P1 bug)', () => {
  beforeEach(() => { (globalThis as any).localStorage = new MemoryStorage(); });

  it('keeps the NEWEST events when over the cap, not the oldest', () => {
    const events: SimulationEvent[] = [];
    for (let i = 0; i < MAX_EVENTS + 50; i++) {
      // newest-first ordering, like the app
      events.unshift({ id: `e${i}`, timestamp: i, dayNumber: 0, type: 'crying_spell', title: '', description: '', educationalNote: '', severity: 'info', resolved: true });
    }
    saveAppData({ events });
    const loaded = loadSavedAppData();
    expect(loaded.events.length).toBe(MAX_EVENTS);
    expect(loaded.events[0].id).toBe(`e${MAX_EVENTS + 49}`); // newest survives
    expect(loaded.events.find(e => e.id === 'e0')).toBeUndefined(); // oldest dropped
  });

  it('migrates an old imperial baby save to metric and drops the fake temperature field', () => {
    localStorage.setItem('parenthood_baby', JSON.stringify({ id: 'b', name: 'Old', sex: 'girl', temperament: 'active', birthTimestamp: 1, birthWeightLbs: 7.5, birthWeightOz: 8, birthLengthInches: 20, currentWeightLbs: 8.0, currentLengthInches: 20.5 }));
    localStorage.setItem('parenthood_baby_state', JSON.stringify({ ...createMockState(), temperatureFahrenheit: 98.6, healthState: 'mild_fever' }));
    localStorage.setItem('parenthood_settings', JSON.stringify({ difficulty: 'hardcore', timeSpeed: 60 }));
    const loaded = loadSavedAppData();
    expect(loaded.baby?.birthWeightGrams).toBeGreaterThan(3300);
    expect(loaded.baby?.birthWeightGrams).toBeLessThan(3500);
    expect(loaded.baby?.birthLengthCm).toBeCloseTo(50.8, 1);
    expect((loaded.babyState as any).temperatureFahrenheit).toBeUndefined();
    expect(loaded.babyState?.healthState).toBe('healthy');
    expect(loaded.settings.difficulty).toBe('hardcore');
    expect(loaded.settings.unitSystem).toBe('imperial'); // filled in by migration
    expect(loaded.settings.awayAutopilotEnabled).toBe(true);
  });

  it('merges newly added milestones into an older saved list without losing unlocked state', () => {
    const saved = [{ ...INITIAL_MILESTONES[0], unlocked: true, unlockedAtTimestamp: 5 }];
    localStorage.setItem('parenthood_milestones', JSON.stringify(saved));
    const loaded = loadSavedAppData();
    expect(loaded.milestones.length).toBe(INITIAL_MILESTONES.length);
    expect(loaded.milestones[0].unlocked).toBe(true);
  });
});

describe('M1 — units', () => {
  it('converts lb/oz to grams and back', () => {
    const g = lbsOzToGrams(7, 8);
    expect(g).toBe(3402);
    expect(gramsToLbsOz(g)).toEqual({ lbs: 7, oz: 8 });
  });
  it('formats consistently in both systems', () => {
    expect(formatWeight(3402, 'imperial')).toBe('7 lb 8 oz');
    expect(formatWeight(3402, 'metric')).toBe('3.40 kg');
    expect(formatLength(50.8, 'imperial')).toBe('20.0 in');
    expect(formatLength(50.8, 'metric')).toBe('50.8 cm');
    expect(formatVolume(90, 'metric')).toBe('90 ml');
    expect(formatVolume(89, 'imperial')).toBe('3.0 fl oz');
  });
  it('feed slider maps to millilitres in both systems', () => {
    expect(feedSliderConfig('metric').toMl(90)).toBe(90);
    expect(feedSliderConfig('imperial').toMl(3)).toBe(89);
  });
});

describe('M1 — honest health / observe', () => {
  it('observe reports only observable cues derived from state, never vital signs', () => {
    const state = createMockState({ hunger: 80, gasDiscomfort: 60, cryingMinutesContinuous: 12 });
    const r = SimulationEngine.applyAction('observe', createMockBaby(), state, createMockParents(), 'parent_1', createMockSettings());
    expect(r.feedbackMessage).toMatch(/rooting/);
    expect(r.feedbackMessage).toMatch(/legs up/);
    expect(r.feedbackMessage).not.toMatch(/°|98\.6|temperature/i);
    expect(r.nextState.healthState).toBe('healthy');
  });
});

describe('M1 — configurable night hours', () => {
  it('uses settings for the night window', () => {
    const s = createMockSettings({ nighttimeQuietStartHour: 23, nighttimeQuietEndHour: 6 });
    expect(isNighttimeHour(22, s)).toBe(false);
    expect(isNighttimeHour(23, s)).toBe(true);
    expect(isNighttimeHour(5, s)).toBe(true);
    expect(isNighttimeHour(6, s)).toBe(false);
  });
});

describe('M1 — day log', () => {
  it('accumulates truthful counters from ticks and actions', () => {
    let logs = accumulateTick([], 3, createMockState(), createMockState({ isSleeping: true }), 30, createMockParents(), []);
    logs = accumulateTick(logs, 3, createMockState(), createMockState({ mood: 'active_crying' }), 10, createMockParents(), []);
    const rec = SimulationEngine.applyAction('feed', createMockBaby(), createMockState({ hunger: 70 }), createMockParents(), 'parent_1', createMockSettings(), { amountMl: 90 }).record;
    logs = accumulateAction(logs, 3, rec);
    const auto = SimulationEngine.applyAction('change_diaper', createMockBaby(), createMockState(), createMockParents(), 'parent_1', createMockSettings(), {}, { source: 'autopilot' }).record;
    logs = accumulateAction(logs, 3, auto);
    const day = getDayLog(logs, 3);
    expect(day.sleepMinutes).toBe(30);
    expect(day.cryingMinutes).toBe(10);
    expect(day.feeds).toBe(1);
    expect(day.diaperChanges).toBe(1);
    expect(day.userActions).toBe(1);
    expect(day.autopilotActions).toBe(1);
    expect(summarizeDay(day).derivedFromLog).toBe(true);
    expect(summarizeDay(day).sleepHoursTotal).toBe(0.5);
  });
});

describe('M1 — away policy (Option B autopilot)', () => {
  const base = () => ({
    baby: createMockBaby(),
    babyState: createMockState({ hunger: 30, sleepiness: 30 }),
    parents: createMockParents(),
    userProfile: createMockUserProfile(),
    settings: createMockSettings({ timeSpeed: 60, lastRealTimestampMs: 1_000_000 }),
    events: [] as SimulationEvent[],
    actionRecords: [],
    milestones: INITIAL_MILESTONES,
    dayLogs: []
  });

  it('does nothing for a very short absence', () => {
    const r = runAwayCatchup(base(), 1_000_000 + 2000);
    expect(r.processedSimMs).toBe(0);
    expect(r.events.length).toBe(0);
  });

  it('caps catch-up at awayCatchupMaxSimHours', () => {
    const s = createMockSettings({ timeSpeed: 60, lastRealTimestampMs: 0, awayCatchupMaxSimHours: 6 });
    expect(computeElapsedSimMs(s, 24 * 3600 * 1000)).toBe(6 * 3600 * 1000);
  });

  it('after 8 simulated hours away the baby was cared for but still has a real current need', () => {
    const input = base();
    const eightHoursReal = 1_000_000 + (8 * 60 * 1000); // 8 real minutes at 60x = 8 sim hours
    const r = runAwayCatchup(input, eightHoursReal);
    expect(r.processedSimMs).toBe(8 * 3600 * 1000);
    // Autopilot acted
    const auto = r.actionRecords.filter(a => a.source === 'autopilot');
    expect(auto.length).toBeGreaterThan(0);
    expect(auto.every(a => a.performedByParentId === 'autopilot')).toBe(true);
    expect(r.autopilotSummary!.feeds).toBeGreaterThan(0);
    // Not the catastrophic state the old code produced
    expect(r.babyState.hunger).toBeLessThan(100);
    expect(r.babyState.comfort).toBeGreaterThan(0);
    // Summary event logged, newest first
    expect(r.events[0].type).toBe('away_summary');
    expect(r.events[0].description).toMatch(/Jordan/); // partner covers in two-parent household
    // Autopilot never trains the user's caregiver memory or confidence
    expect(r.babyState.caregiverEffectiveness?.['parent_1']).toBeUndefined();
    expect(r.parents.find(p => p.id === 'parent_1')!.confidence).toBe(70);
    // Day logs recorded the sleep/crying/feeds
    const totalFeeds = r.dayLogs.reduce((s, d) => s + d.feeds, 0);
    expect(totalFeeds).toBe(r.autopilotSummary!.feeds);
  });

  it('with autopilot disabled nobody cares for the baby (and the summary says so)', () => {
    const input = base();
    input.settings = { ...input.settings, awayAutopilotEnabled: false };
    const r = runAwayCatchup(input, 1_000_000 + (8 * 60 * 1000));
    expect(r.actionRecords.length).toBe(0);
    expect(r.autopilotSummary).toBeNull();
    expect(r.events[0].description).toMatch(/no care/);
  });

  it('single-parent household labels away care as simulated baseline care', () => {
    const input = base();
    input.userProfile = createMockUserProfile({ householdType: 'single', partnerName: undefined });
    input.parents = [input.parents[0]];
    const r = runAwayCatchup(input, 1_000_000 + (6 * 60 * 1000));
    expect(r.events[0].description).toMatch(/Simulated baseline care/);
  });

  it('default settings enable autopilot with a 24h cap', () => {
    const d = getDefaultSettings();
    expect(d.awayAutopilotEnabled).toBe(true);
    expect(d.awayCatchupMaxSimHours).toBe(24);
    expect(d.developerMode).toBe(false);
  });
});
