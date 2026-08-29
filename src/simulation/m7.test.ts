/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { predictNightWakes } from './nightPredictor';
import { createMockBaby, createMockState, createMockParents, createMockSettings } from './testUtils';

// 9 pm: baby just settled for the night
const bedtime = new Date(2026, 0, 15, 21, 0, 0).getTime();
const sleeping = () => createMockState({ isSleeping: true, sleepMinutesElapsed: 5, hunger: 25, sleepiness: 10, comfort: 85, mood: 'sleeping_light' });

describe('M7 — night wake prediction', () => {
  it('predicts at most one alert per night in Realistic mode', () => {
    const alerts = predictNightWakes(createMockBaby({ developmentalAgeDays: 20 }), sleeping(), createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, difficulty: 'realistic', nighttimeAlertsEnabled: true }), bedtime);
    expect(alerts.length).toBeLessThanOrEqual(1);
  });
  it('predicts between one and three alerts per night in Hardcore mode for a newborn', () => {
    const alerts = predictNightWakes(createMockBaby({ developmentalAgeDays: 10 }), sleeping(), createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, difficulty: 'hardcore', nighttimeAlertsEnabled: true }), bedtime);
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < alerts.length; i++) expect(alerts[i].atRealMs - alerts[i - 1].atRealMs).toBeGreaterThanOrEqual(90 * 60 * 1000);
  });
  it('alert times are real-time moments inside the night, later than now', () => {
    const alerts = predictNightWakes(createMockBaby({ developmentalAgeDays: 10 }), sleeping(), createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, difficulty: 'hardcore', nighttimeAlertsEnabled: true }), bedtime);
    for (const a of alerts) {
      expect(a.atRealMs).toBeGreaterThan(bedtime);
      expect(a.atRealMs).toBeLessThan(bedtime + 10 * 3600 * 1000);
      expect(a.title).toContain('Leo');
    }
  });
  it('maps simulated time back to real time when the care clock runs fast (developer mode)', () => {
    const nowReal = 5_000_000_000_000;
    const slow = predictNightWakes(createMockBaby({ developmentalAgeDays: 10 }), sleeping(), createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, difficulty: 'hardcore', nighttimeAlertsEnabled: true, timeSpeed: 1 }), nowReal);
    const fast = predictNightWakes(createMockBaby({ developmentalAgeDays: 10 }), sleeping(), createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, difficulty: 'hardcore', nighttimeAlertsEnabled: true, timeSpeed: 60 }), nowReal);
    expect(slow.length).toBe(fast.length);
    if (slow.length) expect((slow[0].atRealMs - nowReal) / (fast[0].atRealMs - nowReal)).toBeCloseTo(60, 0);
  });
  it('returns nothing when night mode is off', () => {
    expect(predictNightWakes(createMockBaby({ developmentalAgeDays: 10 }), sleeping(), createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, difficulty: 'hardcore', nighttimeAlertsEnabled: false }), bedtime)).toEqual([]);
  });
});
