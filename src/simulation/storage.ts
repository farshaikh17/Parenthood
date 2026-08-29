/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Baby, 
  BabyState, 
  CareActionRecord, 
  JournalEntry, 
  Milestone, 
  Parent, 
  SimulationEvent, 
  SimulationSettings, 
  UserProfile 
} from '../types';
import { INITIAL_MILESTONES } from './initialData';

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
  };
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

    return {
      userProfile: profileJson ? JSON.parse(profileJson) : null,
      baby: babyJson ? JSON.parse(babyJson) : null,
      babyState: stateJson ? JSON.parse(stateJson) : null,
      parents: parentsJson ? JSON.parse(parentsJson) : [],
      settings: settingsJson ? JSON.parse(settingsJson) : getDefaultSettings(),
      actionRecords: actionsJson ? JSON.parse(actionsJson) : [],
      events: eventsJson ? JSON.parse(eventsJson) : [],
      journalEntries: journalJson ? JSON.parse(journalJson) : [],
      milestones: milestonesJson ? JSON.parse(milestonesJson) : INITIAL_MILESTONES,
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
      // Keep last 100 actions to avoid localStorage blowup
      localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(data.actionRecords.slice(-100)));
    }
    if (data.events !== undefined) {
      // Keep last 100 events
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(data.events.slice(-100)));
    }
    if (data.journalEntries !== undefined) {
      localStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(data.journalEntries));
    }
    if (data.milestones !== undefined) {
      localStorage.setItem(STORAGE_KEYS.MILESTONES, JSON.stringify(data.milestones));
    }
  } catch (error) {
    console.error('Failed to save Parenthood app state:', error);
  }
}

export function resetAppStorage() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
