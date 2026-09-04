/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildFactualStory } from './story';
import { buildJourneyReport } from './report';
import { isJourneyComplete } from './clock';
import { createMockBaby, createMockState, createMockParents } from './testUtils';
import { DayLog } from '../types';
import { INITIAL_MILESTONES } from './initialData';

const dayLog = (n: number): DayLog => ({ dayNumber: n, feeds: 7, diaperChanges: 6, sleepMinutes: 15 * 60, cryingMinutes: 70, nightWakings: 2, autopilotActions: 1, userActions: 9, parentStressSum: 4000, parentStressSamples: 100 });

describe('M10 — six-month completion and story', () => {
  it('the journey completes at 182 developmental days', () => {
    expect(isJourneyComplete(createMockBaby({ developmentalAgeDays: 181 }))).toBe(false);
    expect(isJourneyComplete(createMockBaby({ developmentalAgeDays: 182 }))).toBe(true);
  });
  it('the factual story only states what the report contains, and never grades the parent', () => {
    const baby = createMockBaby({ developmentalAgeDays: 182, name: 'Leo' });
    const logs = Array.from({ length: 14 }, (_, i) => dayLog(i));
    const report = buildJourneyReport(baby, createMockState(), createMockParents(), null, [], [], logs, INITIAL_MILESTONES);
    const story = buildFactualStory(report);
    const text = story.join(' ');
    expect(text).toContain('Leo');
    expect(text).not.toContain('old old');
    expect(text).toContain(`${report.totals.feeds} feeds`);
    expect(text).toContain(`${report.totals.diaperChanges} nappies`);
    expect(text.toLowerCase()).not.toMatch(/score|rating|verdict|well done|you failed/);
    expect(text).toContain('Real babies vary');
    // paragraphs, not a wall of text
    expect(story.length).toBeGreaterThanOrEqual(2);
  });
  it('report totals equal the sum of the day logs', () => {
    const baby = createMockBaby({ developmentalAgeDays: 182 });
    const logs = Array.from({ length: 10 }, (_, i) => dayLog(i));
    const report = buildJourneyReport(baby, createMockState(), createMockParents(), null, [], [], logs, INITIAL_MILESTONES);
    expect(report.totals.feeds).toBe(70);
    expect(report.totals.nightWakings).toBe(20);
    expect(report.careDays).toBe(10);
  });
});
