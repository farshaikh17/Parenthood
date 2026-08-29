/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BabyTemperament, Milestone, TemperamentType } from '../types';
import { MILESTONE_NOTES } from '../content/copy';

export const TEMPERAMENTS: Record<TemperamentType, BabyTemperament> = {
  easygoing: {
    type: 'easygoing',
    label: 'Easygoing & Mellow',
    description: 'Settles fairly easily and copes with changes to routine.',
    soothabilityMultiplier: 1.3,
    hungerToleranceMultiplier: 1.2,
    sleepCycleDurationMinutes: 60,
    cryIntensity: 'gentle'
  },
  sensitive: {
    type: 'sensitive',
    label: 'Sensitive & Perceptive',
    description: 'Notices bright lights and sudden sounds. Prefers calm surroundings.',
    soothabilityMultiplier: 0.9,
    hungerToleranceMultiplier: 0.9,
    sleepCycleDurationMinutes: 45,
    cryIntensity: 'moderate'
  },
  intense: {
    type: 'intense',
    label: 'Intense & Spirited',
    description: 'Loud and urgent when hungry or uncomfortable. Needs active soothing and closeness.',
    soothabilityMultiplier: 0.75,
    hungerToleranceMultiplier: 0.7,
    sleepCycleDurationMinutes: 40,
    cryIntensity: 'piercing'
  },
  active: {
    type: 'active',
    label: 'Active & Curious',
    description: 'Wriggly during feeds and changes. Likes to look around while awake.',
    soothabilityMultiplier: 1.0,
    hungerToleranceMultiplier: 1.0,
    sleepCycleDurationMinutes: 50,
    cryIntensity: 'moderate'
  },
  cautious: {
    type: 'cautious',
    label: 'Cautious & Deliberate',
    description: 'Prefers familiar voices and routines. Takes a few minutes to settle with someone new.',
    soothabilityMultiplier: 0.95,
    hungerToleranceMultiplier: 1.0,
    sleepCycleDurationMinutes: 50,
    cryIntensity: 'moderate'
  }
};

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'focus_faces',
    title: 'Focusing on faces',
    category: 'cognitive',
    minAgeDays: 5,
    description: 'Looks at your face when held close.',
    educationalInsight: MILESTONE_NOTES['focus_faces'] || '',
    unlocked: false
  },
  {
    id: 'first_social_smile',
    title: 'First social smile',
    category: 'social',
    minAgeDays: 42,
    description: 'A smile back at you, not just a reflex.',
    educationalInsight: MILESTONE_NOTES['first_social_smile'] || '',
    unlocked: false
  },
  {
    id: 'tummy_head_lift',
    title: 'Lifts head during tummy time',
    category: 'motor',
    minAgeDays: 30,
    description: 'Briefly lifts their head while on their front.',
    educationalInsight: MILESTONE_NOTES['tummy_head_lift'] || '',
    unlocked: false
  },
  {
    id: 'cooing_sounds',
    title: 'First coos',
    category: 'social',
    minAgeDays: 75,
    description: 'Vowel-like sounds when you talk to them.',
    educationalInsight: MILESTONE_NOTES['cooing_sounds'] || '',
    unlocked: false
  },
  {
    id: 'hands_to_mouth',
    title: 'Hands to mouth',
    category: 'cognitive',
    minAgeDays: 90,
    description: 'Finds their own hands and sucks on them.',
    educationalInsight: MILESTONE_NOTES['hands_to_mouth'] || '',
    unlocked: false
  },
  {
    id: 'longer_night_stretch',
    title: 'First longer night stretch',
    category: 'sleep_growth',
    minAgeDays: 75,
    description: 'Sleeps four hours or more in one go at night.',
    educationalInsight: MILESTONE_NOTES['longer_night_stretch'] || '',
    unlocked: false
  },
  {
    id: 'entering_social_infant',
    title: 'Becoming more social',
    category: 'social',
    minAgeDays: 56,
    description: 'Awake for longer, smiling and interacting more.',
    educationalInsight: MILESTONE_NOTES['entering_social_infant'] || '',
    unlocked: false
  },
  {
    id: 'entering_infant_4_6mo',
    title: 'Four months and growing',
    category: 'cognitive',
    minAgeDays: 119,
    description: 'Stronger, more curious, starting to move.',
    educationalInsight: MILESTONE_NOTES['entering_infant_4_6mo'] || '',
    unlocked: false
  },
  {
    id: 'rolls_over',
    title: 'Rolling over',
    category: 'motor',
    minAgeDays: 135,
    description: 'Rolls over by themselves during play.',
    educationalInsight: MILESTONE_NOTES['rolls_over'] || '',
    unlocked: false
  },
  {
    id: 'first_solid_food',
    title: 'First taste of solids',
    category: 'cognitive',
    minAgeDays: 180,
    description: 'A first spoonful of something other than milk.',
    educationalInsight: MILESTONE_NOTES['first_solid_food'] || '',
    unlocked: false
  },
  {
    id: 'sleep_regression_4mo',
    title: 'A rough patch of sleep',
    category: 'sleep_growth',
    minAgeDays: 120,
    description: 'A temporary period of more night waking.',
    educationalInsight: MILESTONE_NOTES['sleep_regression_4mo'] || '',
    unlocked: false
  }
];
