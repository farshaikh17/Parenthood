/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Baby, 
  BabyState, 
  CareActionRecord, 
  DayLog,
  JournalEntry, 
  Milestone, 
  Parent, 
  SimulationEvent, 
  SimulationSettings, 
  UserProfile 
} from '../types';
import { INITIAL_MILESTONES } from './initialData';
import { inchesToCm, lbsOzToGrams } from '../utils/units';

/**
 * STORAGE / REPOSITORY BOUNDARY
 * localStorage today. Keep every read/write behind this module so it can become
 * IndexedDB / a server database later without touching the engine or the UI.
 */

/** Newest records are kept; older ones are dropped. (Records are stored newest-first.) */
export const MAX_EVENTS = 500;
export const MAX_ACTIONS = 500;

const STORAGE_KEYS = {
  USER_PROFILE: 'parenthood_user_profile',
  BABY: 'parenthood_baby',
  BABY_STATE: 'parenthood_baby_state',
  PARENTS: 'parenthood_parents',
  SETTINGS: 'parenthood_settings',
  ACTIONS: 'parenthood_actions',
  EVENTS: 'parenthood_events',
  JOURNAL: 'parenthood_journal',
  MILESTONES: 'parenthood_milestones',
  DAY_LOGS: 'parenthood_day_logs',
};

export interface AppSavedData {
  userProfile: UserProfile | null;
  baby: Baby | null;
  babyState: BabyState | null;
  parents: Parent[];
  settings: SimulationSettings;
  actionRecords: CareActionRecord[];
  events: SimulationEvent[];
  journalEntries: JournalEntry[];
  milestones: Milestone[];
  dayLogs: DayLog[];
}

export function getDefaultSettings(): SimulationSettings {
  return {
    difficulty: 'realistic',
    timeSpeed: 60, // Default 60x (1 real sec = 1 sim min, 1 real min = 1 sim hr)
    isPaused: false,
    nighttimeAlertsEnabled: false,
    nighttimeQuietStartHour: 22,
    nighttimeQuietEndHour: 7,
    soundEffectsEnabled: true,
    simulatedTimeMs: Date.now(),
    lastRealTimestampMs: Date.now(),
    unitSystem: 'imperial',
    developerMode: false,
    awayAutopilotEnabled: true,
    awayCatchupMaxSimHours: 24,
  };
}

/** Fills in fields added after a user's data was first saved. */
function migrateSettings(raw: any): SimulationSettings {
  return { ...getDefaultSettings(), ...(raw || {}) };
}

/** Older saves stored imperial units and a fake temperature field. Convert once on load. */
function migrateBaby(raw: any): Baby | null {
  if (!raw) return null;
  if (typeof raw.birthWeightGrams === 'number') return raw as Baby;
  const birthLbs = Number(raw.birthWeightLbs || 7);
  const birthGrams = lbsOzToGrams(Math.floor(birthLbs), Math.round((birthLbs % 1) * 16));
  const curLbs = Number(raw.currentWeightLbs || birthLbs);
  const curGrams = lbsOzToGrams(Math.floor(curLbs), Math.round((curLbs % 1) * 16));
  return {
    id: raw.id,
    name: raw.name,
    sex: raw.sex,
    temperament: raw.temperament,
    birthTimestamp: raw.birthTimestamp,
    birthWeightGrams: birthGrams,
    birthLengthCm: inchesToCm(Number(raw.birthLengthInches || 19.5)),
    currentWeightGrams: curGrams,
    currentLengthCm: inchesToCm(Number(raw.currentLengthInches || raw.birthLengthInches || 19.5)),
  };
}

function migrateBabyState(raw: any): BabyState | null {
  if (!raw) return null;
  const { temperatureFahrenheit, ...rest } = raw;
  void temperatureFahrenheit;
  return { ...rest, healthState: 'healthy' } as BabyState;
}

function migrateRecords<T extends { source?: any }>(list: any[]): T[] {
  return (list || []).map((r: any) => ({ source: 'user', ...r }));
}

export function loadSavedAppData(): AppSavedData {
  try {
    const profileJson = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    const babyJson = localStorage.getItem(STORAGE_KEYS.BABY);
    const stateJson = localStorage.getItem(STORAGE_KEYS.BABY_STATE);
    const parentsJson = localStorage.getItem(STORAGE_KEYS.PARENTS);
    const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const actionsJson = localStorage.getItem(STORAGE_KEYS.ACTIONS);
    const eventsJson = localStorage.getItem(STORAGE_KEYS.EVENTS);
    const journalJson = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    const milestonesJson = localStorage.getItem(STORAGE_KEYS.MILESTONES);
    const dayLogsJson = localStorage.getItem(STORAGE_KEYS.DAY_LOGS);

    const savedMilestones: Milestone[] = milestonesJson ? JSON.parse(milestonesJson) : [];
    // Merge in any milestones added since the save (keeps unlocked state of existing ones)
    const milestones = INITIAL_MILESTONES.map(m => savedMilestones.find(s => s.id === m.id) || m);

    return {
      userProfile: profileJson ? JSON.parse(profileJson) : null,
      baby: migrateBaby(babyJson ? JSON.parse(babyJson) : null),
      babyState: migrateBabyState(stateJson ? JSON.parse(stateJson) : null),
      parents: parentsJson ? JSON.parse(parentsJson) : [],
      settings: migrateSettings(settingsJson ? JSON.parse(settingsJson) : null),
      actionRecords: migrateRecords<CareActionRecord>(actionsJson ? JSON.parse(actionsJson) : []),
      events: migrateRecords<SimulationEvent>(eventsJson ? JSON.parse(eventsJson) : []),
      journalEntries: journalJson ? JSON.parse(journalJson) : [],
      milestones,
      dayLogs: dayLogsJson ? JSON.parse(dayLogsJson) : [],
    };
  } catch (error) {
    console.error('Failed to load saved Parenthood data:', error);
    return {
      userProfile: null,
      baby: null,
      babyState: null,
      parents: [],
      settings: getDefaultSettings(),
      actionRecords: [],
      events: [],
      journalEntries: [],
      milestones: INITIAL_MILESTONES,
      dayLogs: [],
    };
  }
}

export function saveAppData(data: Partial<AppSavedData>) {
  try {
    if (data.userProfile !== undefined) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.userProfile));
    }
    if (data.baby !== undefined) {
      localStorage.setItem(STORAGE_KEYS.BABY, JSON.stringify(data.baby));
    }
    if (data.babyState !== undefined) {
      localStorage.setItem(STORAGE_KEYS.BABY_STATE, JSON.stringify(data.babyState));
    }
    if (data.parents !== undefined) {
      localStorage.setItem(STORAGE_KEYS.PARENTS, JSON.stringify(data.parents));
    }
    if (data.settings !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    if (data.actionRecords !== undefined) {
      // Records are newest-first: keep the NEWEST records (bug fix: slice(-N) kept the oldest)
      localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(data.actionRecords.slice(0, MAX_ACTIONS)));
    }
    if (data.events !== undefined) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data.events.slice(0, MAX_EVENTS)));
    }
    if (data.journalEntries !== undefined) {
      localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(data.journalEntries));
    }
    if (data.milestones !== undefined) {
      localStorage.setItem(STORAGE_KEYS.MILESTONES, JSON.stringify(data.milestones));
    }
    if (data.dayLogs !== undefined) {
      localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(data.dayLogs));
    }
  } catch (error) {
    console.error('Failed to save Parenthood app state:', error);
  }
}

export function resetAppStorage() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
