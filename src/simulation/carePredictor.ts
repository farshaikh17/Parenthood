/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, BabyState, Parent, SimulationSettings } from '../types';
import { SimulationEngine, isNighttimeHour } from './engine';
import { INITIAL_MILESTONES } from './initialData';
import { ScheduledAlert } from '../notifications/pushClient';

/**
 * CHILD UPDATES — what the phone should say while the app is closed, so the baby is
 * not forgotten. Built the same honest way as everything else: the engine is run
 * forward and the phone buzzes at moments the simulation actually predicts —
 * a feed coming due, crying, a night waking — plus at most two gentle
 * "you've been away a while" check-ins. Never more than 5 alerts, all within 24 h;
 * every time the app is opened the schedule is thrown away and rebuilt.
 */
export function predictCareAlerts(
  baby: Baby,
  state: BabyState,
  parents: Parent[],
  settings: SimulationSettings,
  nowRealMs: number,
  horizonHours = 12
): ScheduledAlert[] {
  const alerts: ScheduledAlert[] = [];
  const speed = Math.max(1, settings.timeSpeed || 1);
  const startSimMs = settings.simulatedTimeMs;
  const maxNight = settings.difficulty === 'hardcore' ? 3 : 1;
  let nightCount = 0;
  let b = baby, s = state, p = parents;
  let sim = { ...settings, isPaused: false };
  const step = 5 * 60 * 1000;
  let lastAlertSimMs = -Infinity;
  const activeParentId = parents[0]?.id || 'parent_primary';

  for (let t = 0; t < horizonHours * 3600 * 1000 && alerts.length < 4; t += step) {
    const r = SimulationEngine.tick(b, s, p, activeParentId, sim, step, [], INITIAL_MILESTONES);
    b = r.nextBaby; s = r.nextState; p = r.nextParents;
    sim = { ...sim, simulatedTimeMs: sim.simulatedTimeMs + step };
    const hour = new Date(sim.simulatedTimeMs).getHours();
    const night = isNighttimeHour(hour, sim);
    const wokeEvent = r.newEvents.some(e => e.type === 'night_waking' || e.type === 'sleep_regression' || e.type === 'crying_spell' || e.type === 'hunger_cue');
    const needsYou = wokeEvent || (!s.isSleeping && (s.hunger >= 70 || s.comfort < 40));

    if (needsYou && sim.simulatedTimeMs - lastAlertSimMs > 90 * 60 * 1000) {
      const nightAllowed = sim.nighttimeAlertsEnabled && nightCount < maxNight;
      if (!night || nightAllowed) {
        lastAlertSimMs = sim.simulatedTimeMs;
        if (night) nightCount++;
        const atRealMs = nowRealMs + Math.round((sim.simulatedTimeMs - startSimMs) / speed);
        const body = night
          ? 'Open Parenthood to see what they need.'
          : s.hunger >= 70
            ? `A feed will be due. Open Parenthood to look after ${baby.name}.`
            : `${baby.name} is unsettled and needs someone. Open Parenthood.`;
        alerts.push({ atRealMs, title: night ? `${baby.name} is awake` : `${baby.name} needs you`, body });
      }
      // Either way, a sleepy simulated caregiver steps in so the prediction can continue
      const fed = SimulationEngine.applyAction('feed', b, s, p, activeParentId, sim, { amountMl: 90 }, { source: 'autopilot' });
      s = fed.nextState; p = fed.nextParents; b = fed.nextBaby;
      const settled = SimulationEngine.applyAction('cuddle', b, s, p, activeParentId, sim, {}, { source: 'autopilot' });
      s = settled.nextState; p = settled.nextParents; b = settled.nextBaby;
      if (night && !s.isSleeping) s = { ...s, isSleeping: true, sleepMinutesElapsed: 0 };
    }
  }

  // Gentle "don't forget" check-ins — honest about what is happening while they are away
  const awayLine = settings.awayAutopilotEnabled
    ? `${baby.name} is in simulated care while you're away. Come see how the day went.`
    : `${baby.name} has nobody with them while the app is closed. Come back when you can.`;
  const checkIns: { hours: number; body: string }[] = [
    { hours: 4, body: `It's been a few hours. ${awayLine}` },
    { hours: 9, body: `A long stretch without you. ${awayLine}` }
  ];
  for (const c of checkIns) {
    if (alerts.length >= 5) break;
    const atRealMs = nowRealMs + c.hours * 3600 * 1000;
    // skip a check-in that lands within an hour of a real predicted need
    if (alerts.some(a => Math.abs(a.atRealMs - atRealMs) < 60 * 60 * 1000)) continue;
    alerts.push({ atRealMs, title: `${baby.name} update`, body: c.body });
  }

  return alerts.sort((a, z) => a.atRealMs - z.atRealMs).slice(0, 5);
}
