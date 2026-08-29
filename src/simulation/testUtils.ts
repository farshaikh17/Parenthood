/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Baby, BabyState, Parent, SimulationSettings, UserProfile } from '../types';

export function createMockBaby(overrides: Partial<Baby> = {}): Baby {
  return {
    id: 'test_baby',
    name: 'Leo',
    sex: 'boy',
    birthTimestamp: 1700000000000,
    birthWeightGrams: 3400,
    birthLengthCm: 50.8,
    currentWeightGrams: 3400,
    currentLengthCm: 50.8,
    developmentalAgeDays: 0,
    temperament: 'easygoing',
    ...overrides,
  };
}

export function createMockState(overrides: Partial<BabyState> = {}): BabyState {
  return {
    hunger: 20,
    sleepiness: 20,
    diaperSoiled: 0,
    diaperType: 'clean',
    gasDiscomfort: 0,
    comfort: 90,
    energy: 90,
    isSleeping: false,
    sleepMinutesElapsed: 0,
    awakeMinutesElapsed: 10,
    healthState: 'healthy',
    mood: 'quiet_alert',
    lastFedTimestamp: 1700000000000,
    lastDiaperTimestamp: 1700000000000,
    lastBurpedTimestamp: 1700000000000,
    lastSootherTimestamp: 1700000000000,
    lastTummyTimeTimestamp: 1700000000000,
    cryingMinutesContinuous: 0,
    ...overrides,
  };
}

export function createMockParents(): Parent[] {
  return [
    {
      id: 'parent_1',
      name: 'Alex',
      role: 'primary',
      workStatus: 'parental_leave',
      stressLevel: 30,
      energy: 80,
      sleepDebtHours: 1.0,
      confidence: 70,
      knowledgeScore: 60,
    },
    {
      id: 'parent_2',
      name: 'Jordan',
      role: 'secondary',
      workStatus: 'full_time',
      stressLevel: 35,
      energy: 75,
      sleepDebtHours: 1.5,
      confidence: 65,
      knowledgeScore: 55,
    },
  ];
}

export function createMockSettings(overrides: Partial<SimulationSettings> = {}): SimulationSettings {
  return {
    timeSpeed: 1,
    isPaused: false,
    difficulty: 'realistic',
    nighttimeAlertsEnabled: false,
    nighttimeQuietStartHour: 22,
    nighttimeQuietEndHour: 7,
    soundEffectsEnabled: true,
    simulatedTimeMs: 1700000000000 + 3600000 * 12, // 12:00 PM
    lastRealTimestampMs: Date.now(),
    unitSystem: 'imperial',
    developerMode: false,
    awayAutopilotEnabled: true,
    awayCatchupMaxSimHours: 24,
    compressionSchedule: [{ untilAgeDays: 999, devDaysPerRealDay: 1 }], // tests: 1 dev day per real day unless overridden
    ...overrides,
  };
}

export function createMockUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user_1',
    motivation: 'planning_children',
    householdType: 'two_parent',
    primaryParentName: 'Alex',
    partnerName: 'Jordan',
    onboardingCompleted: true,
    activeParentId: 'parent_1',
    createdAt: 1700000000000,
    ...overrides,
  };
}

