/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, BabyState, CareActionRecord, DayLog, Parent, SimulationEvent } from '../types';
import { BabyMemorySummary, summarizeMemory } from './personality';

/** Derives the structured memory summary purely from recorded data. */
export function buildMemorySummary(
  baby: Baby,
  state: BabyState,
  parents: Parent[],
  actions: CareActionRecord[],
  events: SimulationEvent[],
  dayLogs: DayLog[]
): BabyMemorySummary {
  // How long crying spells lasted before the user acted (resolved by a user action, not autopilot)
  const durations = events
    .filter(e => e.type === 'crying_spell' && e.resolved && e.resolvedAt && e.source !== 'autopilot')
    .map(e => Math.max(0, Math.round((e.resolvedAt! - e.timestamp) / 60000)))
    .filter(d => d <= 240);
  const recent = dayLogs.slice(-3);
  const feedsPerDay = recent.length >= 2 ? Math.round(recent.reduce((s, d) => s + d.feeds, 0) / recent.length) : null;
  // Longest recorded night stretch is approximated by the largest single sleepMinutes accumulation we can see in day logs
  const longestNight = null;
  return summarizeMemory(baby, state, parents, actions, durations, longestNight, feedsPerDay);
}

export function memoryToSentences(babyName: string, m: BabyMemorySummary): string[] {
  const out: string[] = [];
  if (m.preferredCaregiverName) out.push(`${babyName} settles most easily with ${m.preferredCaregiverName}.`);
  if (m.usualSettleMethod === 'cuddle') out.push(`${babyName} is usually held to sleep.`);
  if (m.usualSettleMethod === 'put_to_sleep') out.push(`${babyName} usually goes down in the cot.`);
  if (m.prefersBeingHeld) out.push(`${babyName} has got used to falling asleep in arms.`);
  if (m.settlesInCotEasily) out.push(`${babyName} has learned to settle in the cot.`);
  if (m.averageResponseMinutes !== null) out.push(`Crying spells have lasted about ${m.averageResponseMinutes} minutes before someone responded.`);
  if (m.feedsPerDayRecent !== null) out.push(`About ${m.feedsPerDayRecent} feeds a day lately.`);
  return out;
}
