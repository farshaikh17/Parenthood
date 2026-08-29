/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UnitSystem } from '../types';

// Canonical storage is metric (grams, centimetres, millilitres).
// Every user-facing number passes through one of these formatters so the
// Metric / Imperial setting applies consistently across the app.

export const GRAMS_PER_POUND = 453.592;
export const GRAMS_PER_OUNCE = 28.3495;
export const CM_PER_INCH = 2.54;
export const ML_PER_FL_OZ = 29.5735;

export function lbsOzToGrams(lbs: number, oz: number): number {
  return Math.round(lbs * GRAMS_PER_POUND + oz * GRAMS_PER_OUNCE);
}

export function gramsToLbsOz(grams: number): { lbs: number; oz: number } {
  const totalOz = grams / GRAMS_PER_OUNCE;
  const lbs = Math.floor(totalOz / 16);
  const oz = Math.round(totalOz - lbs * 16);
  return oz === 16 ? { lbs: lbs + 1, oz: 0 } : { lbs, oz };
}

export function inchesToCm(inches: number): number {
  return Math.round(inches * CM_PER_INCH * 10) / 10;
}

export function cmToInches(cm: number): number {
  return Math.round((cm / CM_PER_INCH) * 10) / 10;
}

export function flOzToMl(oz: number): number {
  return Math.round(oz * ML_PER_FL_OZ);
}

export function mlToFlOz(ml: number): number {
  return Math.round((ml / ML_PER_FL_OZ) * 10) / 10;
}

export function formatWeight(grams: number, system: UnitSystem): string {
  if (system === 'metric') {
    return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${Math.round(grams)} g`;
  }
  const { lbs, oz } = gramsToLbsOz(grams);
  return `${lbs} lb ${oz} oz`;
}

export function formatWeightDelta(grams: number, system: UnitSystem): string {
  const sign = grams >= 0 ? '+' : '-';
  const abs = Math.abs(grams);
  if (system === 'metric') return `${sign}${Math.round(abs)} g`;
  const oz = abs / GRAMS_PER_OUNCE;
  return oz >= 16 ? `${sign}${(oz / 16).toFixed(1)} lb` : `${sign}${Math.round(oz)} oz`;
}

export function formatLength(cm: number, system: UnitSystem): string {
  return system === 'metric' ? `${cm.toFixed(1)} cm` : `${cmToInches(cm).toFixed(1)} in`;
}

export function formatVolume(ml: number, system: UnitSystem): string {
  return system === 'metric' ? `${Math.round(ml)} ml` : `${mlToFlOz(ml).toFixed(1)} fl oz`;
}

/** Feed slider bounds expressed in the user's unit, mapped to canonical ml. */
export function feedSliderConfig(system: UnitSystem) {
  return system === 'metric'
    ? { min: 30, max: 180, step: 10, default: 90, unitLabel: 'ml', toMl: (v: number) => v }
    : { min: 1, max: 6, step: 0.5, default: 3, unitLabel: 'fl oz', toMl: (v: number) => flOzToMl(v) };
}
