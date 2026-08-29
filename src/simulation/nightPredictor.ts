/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, BabyState, Parent, SimulationSettings } from '../types';
import { SimulationEngine, isNighttimeHour } from './engine';
import { INITIAL_MILESTONES } from './initialData';
import { ScheduledAlert } from '../notifications/pushClient';

/**
 * Predicts tonight's wakings by running the engine forward from now (nobody caring
 * except a sleepy parent who feeds and resettles after each waking). The result is a
 * list of real-time moments the phone should buzz. It is a prediction, not a promise:
 * when the app is opened the real simulation state decides what the baby needs.
 *
 * Realistic: at most 1 alert per night. Hardcore: up to 3, unpredictable times.
 * Simulated time is mapped back to real time through the current care-clock speed.
 */
export function predictNightWakes(
  baby: Baby,
  state: BabyState,
  parents: Parent[],
  settings: SimulationSettings,
  nowRealMs: number,
  horizonHours = 10
): ScheduledAlert[] {
  if (!settings.nighttimeAlertsEnabled) return [];
  const maxAlerts = settings.difficulty === 'hardcore' ? 3 : 1;
  const alerts: ScheduledAlert[] = [];
  let b = baby, s = state, p = parents;
  const speed = Math.max(1, settings.timeSpeed || 1);
  const startSimMs = settings.simulatedTimeMs;
  let sim = { ...settings, isPaused: false };
  const step = 5 * 60 * 1000;
  let lastAlertAt = -Infinity;
  const activeParentId = parents[0]?.id || 'parent_primary';
  for (let t = 0; t < horizonHours * 3600 * 1000 && alerts.length < maxAlerts; t += step) {
    const r = SimulationEngine.tick(b, s, p, activeParentId, sim, step, [], INITIAL_MILESTONES);
    b = r.nextBaby; s = r.nextState; p = r.nextParents;
    sim = { ...sim, simulatedTimeMs: sim.simulatedTimeMs + step };
    const hour = new Date(sim.simulatedTimeMs).getHours();
    const night = isNighttimeHour(hour, sim);
    const woke = r.newEvents.some(e => e.type === 'night_waking' || e.type === 'sleep_regression') || (!s.isSleeping && s.comfort < 45 && night);
    if (night && woke && sim.simulatedTimeMs - lastAlertAt > 90 * 60 * 1000) {
      lastAlertAt = sim.simulatedTimeMs;
      const atRealMs = nowRealMs + Math.round((sim.simulatedTimeMs - startSimMs) / speed);
      alerts.push({ atRealMs, title: `${baby.name} is awake`, body: 'Open Parenthood to see what they need.' });
      // A sleepy parent feeds and resettles; the simulation continues from there
      const fed = SimulationEngine.applyAction('feed', b, s, p, activeParentId, sim, { amountMl: 90 }, { source: 'autopilot' });
      s = fed.nextState; p = fed.nextParents; b = fed.nextBaby;
      const settled = SimulationEngine.applyAction('cuddle', b, s, p, activeParentId, sim, {}, { source: 'autopilot' });
      s = settled.nextState; p = settled.nextParents; b = settled.nextBaby;
      if (!s.isSleeping) { s = { ...s, isSleeping: true, sleepMinutesElapsed: 0 }; }
    }
  }
  return alerts;
}
