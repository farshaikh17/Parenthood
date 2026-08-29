/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, BabyState, CareActionRecord, DayLog, JournalEntry, Milestone, Parent, SimulationEvent, UserProfile } from '../types';
import { summarizeDay } from './dayLog';
import { buildMemorySummary, memoryToSentences } from './memory';
import { formatDevelopmentalAge } from './clock';

/**
 * JOURNEY REPORT — the data behind the six-month story (M10) and the weekly summaries.
 * Everything here is computed from records. Scores are reflective tools, not verdicts.
 */

export interface WeekSummary {
  weekIndex: number;          // 0-based care week
  days: number;
  feeds: number;
  diaperChanges: number;
  sleepHoursPerDay: number;
  cryingMinutesPerDay: number;
  nightWakings: number;
  userActions: number;
  autopilotActions: number;
  avgParentStress: number;
  milestones: string[];
  notableEvents: string[];    // titles of difficult-period / health / vaccination events that week
}

export interface JourneyReport {
  babyName: string;
  developmentalAgeLabel: string;
  careDays: number;
  totals: { feeds: number; diaperChanges: number; sleepHours: number; cryingHours: number; nightWakings: number; userActions: number; autopilotActions: number };
  weeks: WeekSummary[];
  milestonesReached: string[];
  memory: string[];
  strengths: string[];
  challenges: string[];
  patterns: string[];
}

export function buildWeekSummaries(dayLogs: DayLog[], events: SimulationEvent[], milestones: Milestone[], baby: Baby): WeekSummary[] {
  if (dayLogs.length === 0) return [];
  const maxDay = Math.max(...dayLogs.map(d => d.dayNumber));
  const weeks: WeekSummary[] = [];
  for (let w = 0; w * 7 <= maxDay; w++) {
    const days = dayLogs.filter(d => Math.floor(d.dayNumber / 7) === w);
    if (days.length === 0) continue;
    const startMs = baby.birthTimestamp + w * 7 * 86400000;
    const endMs = startMs + 7 * 86400000;
    const weekEvents = events.filter(e => e.timestamp >= startMs && e.timestamp < endMs);
    const sum = (k: keyof DayLog) => days.reduce((s, d) => s + (d[k] as number), 0);
    const stressSamples = sum('parentStressSamples');
    weeks.push({
      weekIndex: w,
      days: days.length,
      feeds: sum('feeds'),
      diaperChanges: sum('diaperChanges'),
      sleepHoursPerDay: parseFloat((sum('sleepMinutes') / 60 / days.length).toFixed(1)),
      cryingMinutesPerDay: Math.round(sum('cryingMinutes') / days.length),
      nightWakings: sum('nightWakings'),
      userActions: sum('userActions'),
      autopilotActions: sum('autopilotActions'),
      avgParentStress: stressSamples > 0 ? Math.round(sum('parentStressSum') / stressSamples) : 0,
      milestones: milestones.filter(m => m.unlocked && m.unlockedAtTimestamp && m.unlockedAtTimestamp >= startMs && m.unlockedAtTimestamp < endMs).map(m => m.title),
      notableEvents: weekEvents
        .filter(e => ['growth_spurt', 'evening_fussiness', 'illness_start', 'vaccination', 'sleep_regression', 'rolls_over'].includes(e.type))
        .map(e => e.title)
        .filter((t, i, a) => a.indexOf(t) === i)
    });
  }
  return weeks;
}

/** Plain, non-judgemental observations. Only claims the data supports. */
export function buildJourneyReport(
  baby: Baby,
  state: BabyState,
  parents: Parent[],
  userProfile: UserProfile | null,
  actions: CareActionRecord[],
  events: SimulationEvent[],
  dayLogs: DayLog[],
  milestones: Milestone[]
): JourneyReport {
  const weeks = buildWeekSummaries(dayLogs, events, milestones, baby);
  const sum = (k: keyof DayLog) => dayLogs.reduce((s, d) => s + (d[k] as number), 0);
  const careDays = dayLogs.length;
  const userActions = sum('userActions');
  const autoActions = sum('autopilotActions');
  const memory = memoryToSentences(baby.name, buildMemorySummary(baby, state, parents, actions, events, dayLogs));

  const strengths: string[] = [];
  const challenges: string[] = [];
  const patterns: string[] = [];

  const cryDurations = events.filter(e => e.type === 'crying_spell' && e.resolved && e.resolvedAt && e.resolvedBy !== 'autopilot').map(e => (e.resolvedAt! - e.timestamp) / 60000);
  const avgResp = cryDurations.length >= 3 ? cryDurations.reduce((s, d) => s + d, 0) / cryDurations.length : null;
  if (avgResp !== null && avgResp <= 10) strengths.push(`Crying was usually answered within about ${Math.round(avgResp)} minutes.`);
  if (avgResp !== null && avgResp > 25) challenges.push(`Crying spells often ran ${Math.round(avgResp)} minutes or more before a response.`);

  if (userActions + autoActions > 0) {
    const share = userActions / (userActions + autoActions);
    if (share >= 0.7) strengths.push(`You did most of the care yourself (${Math.round(share * 100)} % of actions).`);
    else if (share < 0.4) patterns.push(`Most care happened while you were away (${Math.round((1 - share) * 100)} % of actions by the simulated caregiver).`);
  }

  const nightTotal = sum('nightWakings');
  if (careDays >= 3) patterns.push(`About ${(nightTotal / careDays).toFixed(1)} night wakings per day over ${careDays} days.`);

  const lateWeeks = weeks.slice(-2);
  const earlyWeeks = weeks.slice(0, 2);
  if (lateWeeks.length && earlyWeeks.length && weeks.length >= 4) {
    const late = lateWeeks.reduce((s, w) => s + w.avgParentStress, 0) / lateWeeks.length;
    const early = earlyWeeks.reduce((s, w) => s + w.avgParentStress, 0) / earlyWeeks.length;
    if (late < early - 10) strengths.push('Your stress eased as the weeks went on.');
    if (late > early + 10) challenges.push('Your stress rose over the journey rather than easing.');
  }

  const twoParent = userProfile?.householdType === 'two_parent' && parents.length >= 2;
  if (twoParent) {
    const counts = parents.map(p => actions.filter(a => a.performedByParentId === p.id).length);
    const total = counts.reduce((s, c) => s + c, 0);
    if (total >= 10) {
      const maxShare = Math.max(...counts) / total;
      if (maxShare > 0.75) patterns.push(`One of you did ${Math.round(maxShare * 100)} % of the hands-on care.`);
      else strengths.push('Care was shared fairly evenly between you.');
    }
  }

  const sniffles = events.filter(e => e.type === 'illness_start').length;
  if (sniffles > 0) patterns.push(`${sniffles} mild ${sniffles === 1 ? 'episode' : 'episodes'} (snuffles or an unsettled tummy), all of which passed.`);

  return {
    babyName: baby.name,
    developmentalAgeLabel: formatDevelopmentalAge(Math.floor(baby.developmentalAgeDays)),
    careDays,
    totals: {
      feeds: sum('feeds'),
      diaperChanges: sum('diaperChanges'),
      sleepHours: Math.round(sum('sleepMinutes') / 60),
      cryingHours: parseFloat((sum('cryingMinutes') / 60).toFixed(1)),
      nightWakings: nightTotal,
      userActions,
      autopilotActions: autoActions
    },
    weeks,
    milestonesReached: milestones.filter(m => m.unlocked).map(m => m.title),
    memory,
    strengths,
    challenges,
    patterns
  };
}

/** A factual journal entry for a finished care day — written automatically, no AI needed. */
export function autoJournalEntry(baby: Baby, dayNumber: number, log: DayLog, simTimeMs: number, milestones: Milestone[], events: SimulationEvent[]): JournalEntry {
  const stats = summarizeDay(log);
  const dayStart = baby.birthTimestamp + dayNumber * 86400000;
  const dayEnd = dayStart + 86400000;
  const notable = events.filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd && ['growth_spurt', 'evening_fussiness', 'illness_start', 'illness_end', 'vaccination', 'rolls_over', 'sleep_regression'].includes(e.type)).map(e => e.title);
  const ms = milestones.filter(m => m.unlocked && m.unlockedAtTimestamp && m.unlockedAtTimestamp >= dayStart && m.unlockedAtTimestamp < dayEnd).map(m => m.title);
  const parts = [
    `Day ${dayNumber + 1}: ${stats.feedsCount} feed${stats.feedsCount === 1 ? '' : 's'}, ${stats.diapersCount} nappy change${stats.diapersCount === 1 ? '' : 's'}, about ${stats.sleepHoursTotal} hours of sleep and ${stats.cryingMinutesTotal} minutes of crying.`
  ];
  if (log.nightWakings > 0) parts.push(`${log.nightWakings} night waking${log.nightWakings === 1 ? '' : 's'}.`);
  if (log.autopilotActions > 0) parts.push(`${log.autopilotActions} care actions happened while you were away.`);
  if (notable.length) parts.push(`Also: ${notable.join('; ').toLowerCase()}.`);
  if (ms.length) parts.push(`Milestone${ms.length === 1 ? '' : 's'}: ${ms.join(', ')}.`);
  return {
    id: `journal_auto_${dayNumber}`,
    dayNumber,
    simDateString: new Date(simTimeMs).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    title: `Day ${dayNumber + 1} (automatic)`,
    summary: `${stats.feedsCount} feeds • ${stats.diapersCount} changes • ${stats.sleepHoursTotal}h sleep • ${stats.cryingMinutesTotal} min crying`,
    reflection: parts.join(' '),
    educationalInsight: '',
    stats,
    milestonesEarned: ms
  };
}
