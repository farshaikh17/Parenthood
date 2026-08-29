/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BabyTemperament, Milestone, TemperamentType } from '../types';

export const TEMPERAMENTS: Record<TemperamentType, BabyTemperament> = {
  easygoing: {
    type: 'easygoing',
    label: 'Easygoing & Mellow',
    description: 'Calmly communicates needs, adjusts flexibly to routines, easily soothed by gentle rocking.',
    soothabilityMultiplier: 1.3,
    hungerToleranceMultiplier: 1.2,
    sleepCycleDurationMinutes: 60,
    cryIntensity: 'gentle'
  },
  sensitive: {
    type: 'sensitive',
    label: 'Sensitive & Perceptive',
    description: 'Quickly notices bright lights and sudden sounds. Needs consistent swaddling and calm environments.',
    soothabilityMultiplier: 0.9,
    hungerToleranceMultiplier: 0.9,
    sleepCycleDurationMinutes: 45,
    cryIntensity: 'moderate'
  },
  intense: {
    type: 'intense',
    label: 'Intense & Spirited',
    description: 'Vocal and urgent when hungry or uncomfortable. Strong lung capacity, thrives with active soothing and close contact.',
    soothabilityMultiplier: 0.75,
    hungerToleranceMultiplier: 0.7,
    sleepCycleDurationMinutes: 40,
    cryIntensity: 'piercing'
  },
  active: {
    type: 'active',
    label: 'Active & Curious',
    description: 'Wiggles frequently during feedings and diaper changes. Loves wakeful observation and visual stimulation.',
    soothabilityMultiplier: 1.0,
    hungerToleranceMultiplier: 1.0,
    sleepCycleDurationMinutes: 50,
    cryIntensity: 'moderate'
  },
  cautious: {
    type: 'cautious',
    label: 'Cautious & Deliberate',
    description: 'Prefers predictable schedules and familiar voices. Takes a few minutes to settle into new arms.',
    soothabilityMultiplier: 0.95,
    hungerToleranceMultiplier: 1.0,
    sleepCycleDurationMinutes: 50,
    cryIntensity: 'moderate'
  }
};

export const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'focus_faces',
    title: 'Focusing on Faces (8-12 inches)',
    category: 'cognitive',
    minAgeDays: 3,
    description: 'Baby fixates intently on your face when held close during skin-to-skin or feeding.',
    educationalInsight: 'Newborn visual acuity is roughly 20/400. They instinctively lock onto human eye contrast at exactly the distance of nursing.',
    unlocked: false
  },
  {
    id: 'first_social_smile',
    title: 'First Intentional Social Smile',
    category: 'social',
    minAgeDays: 28,
    description: 'A genuine reciprocal smile in response to your voice and loving smile, distinct from newborn reflex gas smiles.',
    educationalInsight: 'Social smiling typically emerges between weeks 4 and 8, marking a major leap in emotional reciprocity and neurological visual-motor integration.',
    unlocked: false
  },
  {
    id: 'tummy_head_lift',
    title: 'Lifting Head During Tummy Time',
    category: 'motor',
    minAgeDays: 14,
    description: 'Baby briefly lifts their chin and turns their head 45 degrees while resting on their belly.',
    educationalInsight: 'Tummy time builds cervical extensor muscles and shoulder stability required later for rolling, sitting, and crawling.',
    unlocked: false
  },
  {
    id: 'cooing_sounds',
    title: 'First Coos & Vowel Vocalizations',
    category: 'social',
    minAgeDays: 45,
    description: 'Delightful vowel sounds ("ooh", "aah") accompanied by excited arm and leg kicks when talked to.',
    educationalInsight: 'Cooing represents early expressive speech synthesis. Responsive "conversations" where parents mimic sounds accelerate infant language mapping.',
    unlocked: false
  },
  {
    id: 'hands_to_mouth',
    title: 'Bringing Hands to Mouth & Self-Soothing',
    category: 'cognitive',
    minAgeDays: 35,
    description: 'Baby discovers their fists, bringing them to their lips to suck on knuckles when feeling drowsy or curious.',
    educationalInsight: 'Hand-to-mouth coordination is one of the very first active self-regulation and tactile discovery mechanisms infants develop.',
    unlocked: false
  },
  {
    id: 'longer_night_stretch',
    title: 'First 4+ Hour Nighttime Sleep Stretch',
    category: 'sleep_growth',
    minAgeDays: 60,
    description: 'Baby successfully connects two sleep cycles without waking for an emergency feeding.',
    educationalInsight: 'As stomach capacity expands to 4-5 ounces and melatonin production synchronizes with circadian day-night cues, sleep cycles gradually lengthen.',
    unlocked: false
  },
  {
    id: 'entering_social_infant',
    title: 'Entering Social Infant Stage (8+ Weeks)',
    category: 'social',
    minAgeDays: 57,
    description: 'Baby graduates into the social infant stage with wider wake windows, reciprocal smiles, and enthusiastic vocal play.',
    educationalInsight: 'At 8 weeks, infants complete the newborn "fourth trimester." Alert periods expand to 90-120 minutes with sharp visual contrast recognition.',
    unlocked: false
  },
  {
    id: 'entering_infant_4_6mo',
    title: 'Entering 4-6 Month Infant Stage',
    category: 'cognitive',
    minAgeDays: 120,
    description: 'Baby enters the 4-6 month stage, exhibiting robust trunk control, curiosity about family meals, and rolling exploration.',
    educationalInsight: 'Between 17 and 26 weeks, infants double their birth weight, build core stability, and show developmental readiness for complementary solid foods.',
    unlocked: false
  },
  {
    id: 'rolls_over',
    title: 'Rolling Over (Motor Milestone)',
    category: 'motor',
    minAgeDays: 120,
    description: 'Baby uses core muscles and neck strength to roll over independently during play.',
    educationalInsight: 'Rolling over is a major motor milestone requiring coordinated trunk rotation. Once rolling begins, swaddling must be discontinued immediately.',
    unlocked: false
  },
  {
    id: 'first_solid_food',
    title: 'First Solid Food Tasted',
    category: 'cognitive',
    minAgeDays: 120,
    description: 'Baby experiences their first spoonful of nutrient-rich complementary purees or single-grain infant cereal.',
    educationalInsight: 'Solid foods introduce new textures, oral motor tongue-push patterns, and micronutrients like iron, while breast milk or formula remains primary nutrition.',
    unlocked: false
  },
  {
    id: 'sleep_regression_4mo',
    title: '4-Month Sleep Architecture Leap',
    category: 'sleep_growth',
    minAgeDays: 120,
    description: 'Baby navigates the 4-month sleep regression as brain waves transition into adult-like 4-stage sleep cycles.',
    educationalInsight: 'The 4-month regression is a permanent neurological maturation where infant sleep reorganizes into distinct light and deep cycles, often causing temporary frequent night waking.',
    unlocked: false
  }
];

export const EDUCATIONAL_TOPICS = [
  {
    id: 'fourth_trimester',
    title: 'The "Fourth Trimester" Reality',
    summary: 'Newborns are born neurodevelopmentally immature compared to other mammals.',
    content: 'For the first 12 weeks, human babies benefit from womb-like environments: gentle motion, white noise, rhythmic shushing, swaddling, and continuous closeness. You cannot "spoil" a newborn with responsive holding.'
  },
  {
    id: 'wake_windows',
    title: 'Wake Windows & Overtiredness',
    summary: 'A newborn can typically only stay awake for 45 to 90 minutes at a time.',
    content: 'When an infant stays awake too long, their body releases cortisol and adrenaline. An overtired baby fights sleep and cries more intensely, which is why watching subtle sleepy cues (yawning, zoning out, jerky limbs) is vital.'
  },
  {
    id: 'cluster_feeding',
    title: 'Why Cluster Feeding Occurs',
    summary: 'Frequent, closely spaced feedings in the evening are completely normal.',
    content: 'During growth spurts (around 10 days, 3 weeks, 6 weeks), babies will feed every 30-60 minutes for several hours. This is nature’s way of boosting milk supply and stocking up on calories before longer night rests.'
  },
  {
    id: 'moro_reflex',
    title: 'The Startle (Moro) Reflex',
    summary: 'Sudden arm-flinging is an involuntary evolutionary survival reflex.',
    content: 'When babies feel a sudden sensation of falling or hear an abrupt sound, their arms shoot out and they may cry. A snug swaddle provides proprioceptive security and prevents the reflex from waking them prematurely.'
  },
  {
    id: 'parental_mental_health',
    title: 'Parental Fatigue & Compassion',
    summary: 'Severe sleep fragmentation affects emotional bandwidth and executive function.',
    content: 'Parenting in the early months is mentally and physically rigorous. Taking 10-minute pauses, asking for partner support, and letting go of non-essential chores are critical strategies for emotional resilience.'
  }
];
