/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { predictCareAlerts } from './carePredictor';
import { createMockBaby, createMockState, createMockParents, createMockSettings } from './testUtils';

const noon = new Date(2026, 0, 15, 12, 0, 0).getTime();
const bedtime = new Date(2026, 0, 15, 21, 0, 0).getTime();

describe('M11 — child updates while the app is closed', () => {
  it('never schedules more than 5 alerts, all in the future and in order', () => {
    const alerts = predictCareAlerts(createMockBaby({ developmentalAgeDays: 10 }), createMockState(), createMockParents(), createMockSettings({ simulatedTimeMs: noon, nighttimeAlertsEnabled: true, difficulty: 'hardcore' }), noon);
    expect(alerts.length).toBeLessThanOrEqual(5);
    expect(alerts.length).toBeGreaterThan(0);
    for (let i = 0; i < alerts.length; i++) {
      expect(alerts[i].atRealMs).toBeGreaterThan(noon);
      if (i > 0) expect(alerts[i].atRealMs).toBeGreaterThanOrEqual(alerts[i - 1].atRealMs);
    }
  });
  it('a hungry daytime baby produces a "needs you" update naming the baby', () => {
    const alerts = predictCareAlerts(createMockBaby({ developmentalAgeDays: 20, name: 'Leo' }), createMockState({ hunger: 55 }), createMockParents(), createMockSettings({ simulatedTimeMs: noon, nighttimeAlertsEnabled: true }), noon);
    expect(alerts.some(a => a.title.includes('Leo'))).toBe(true);
    expect(alerts.every(a => a.title.includes('Leo'))).toBe(true);
  });
  it('includes gentle check-in updates so the baby is not forgotten', () => {
    const alerts = predictCareAlerts(createMockBaby({ developmentalAgeDays: 20, name: 'Leo' }), createMockState(), createMockParents(), createMockSettings({ simulatedTimeMs: noon, nighttimeAlertsEnabled: true }), noon);
    expect(alerts.some(a => a.title === 'Leo update')).toBe(true);
  });
  it('with night mode off, no alerts land during simulated night hours from a bedtime start', () => {
    const sleeping = createMockState({ isSleeping: true, sleepMinutesElapsed: 5, hunger: 25, mood: 'sleeping_light' });
    const alerts = predictCareAlerts(createMockBaby({ developmentalAgeDays: 10 }), sleeping, createMockParents(), createMockSettings({ simulatedTimeMs: bedtime, nighttimeAlertsEnabled: false, timeSpeed: 1 }), bedtime, 8);
    for (const a of alerts) {
      const simMs = bedtime + (a.atRealMs - bedtime);
      const hour = new Date(simMs).getHours();
      const isNight = hour >= 22 || hour < 7;
      if (a.title.includes('is awake')) expect(isNight).toBe(false);
    }
  });
});
