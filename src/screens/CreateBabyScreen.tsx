/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Baby, TemperamentType, UnitSystem } from '../types';
import { TEMPERAMENTS } from '../simulation/initialData';
import { inchesToCm, lbsOzToGrams } from '../utils/units';
import { Sparkles, Heart, Scale, Ruler, ArrowRight, ArrowLeft } from 'lucide-react';

interface CreateBabyScreenProps {
  unitSystem: UnitSystem;
  onComplete: (baby: Baby) => void;
  onBack: () => void;
}

const TEMPERAMENT_KEYS = Object.keys(TEMPERAMENTS) as TemperamentType[];

export const CreateBabyScreen: React.FC<CreateBabyScreenProps> = ({ unitSystem, onComplete, onBack }) => {
  const metric = unitSystem === 'metric';
  const [name, setName] = useState<string>('Emma');
  const [sex, setSex] = useState<Baby['sex']>('girl');
  const [weightLbs, setWeightLbs] = useState<number>(7);
  const [weightOz, setWeightOz] = useState<number>(6);
  const [weightGrams, setWeightGrams] = useState<number>(3350);
  const [lengthInches, setLengthInches] = useState<number>(19.5);
  const [lengthCm, setLengthCm] = useState<number>(49.5);
  // Temperament is chosen for the user (hidden parameters, not a visible "class"). Advanced users can override.
  const [temperament, setTemperament] = useState<TemperamentType>(() => TEMPERAMENT_KEYS[Math.floor(Math.random() * TEMPERAMENT_KEYS.length)]);
  const [showTemperament, setShowTemperament] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const grams = metric ? Math.round(weightGrams) : lbsOzToGrams(weightLbs, weightOz);
    const cm = metric ? Math.round(lengthCm * 10) / 10 : inchesToCm(lengthInches);

    const newBaby: Baby = {
      id: `baby_${Date.now()}`,
      name: name.trim(),
      sex,
      birthWeightGrams: grams,
      birthLengthCm: cm,
      temperament,
      currentWeightGrams: grams,
      currentLengthCm: cm,
      birthTimestamp: Date.now()
    };

    onComplete(newBaby);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-6 bg-stone-900 text-stone-100 animate-in fade-in duration-200 overflow-y-auto">
      <div className="space-y-5">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold font-mono">Step 4 of 4</span>
            <h2 className="text-lg font-bold text-stone-100">Welcome Your Newborn</h2>
          </div>
        </div>

        {/* Name & Sex */}
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
          <div>
            <label className="text-xs font-semibold text-stone-300 block mb-1">Baby's Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emma, Noah, Maya"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-300 block mb-1.5">Sex</label>
            <div className="grid grid-cols-3 gap-2">
              {(['girl', 'boy', 'surprise'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition-all ${
                    sex === s
                      ? 'bg-teal-950 border-teal-500 text-teal-200 font-semibold'
                      : 'bg-stone-900 border-stone-700 text-stone-400'
                  }`}
                >
                  {s === 'girl' ? '👧 Girl' : s === 'boy' ? '👦 Boy' : '✨ Surprise'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Birth Stats */}
        <div className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3">
          <span className="text-xs font-semibold text-stone-200 block">Birth Statistics</span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center space-x-1 text-xs text-stone-400 mb-1">
                <Scale className="w-3.5 h-3.5 text-teal-400" />
                <span>Weight</span>
              </div>
              {metric ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1500"
                    max="6000"
                    step="10"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(parseInt(e.target.value) || 3350)}
                    className="w-24 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs text-center font-mono"
                  />
                  <span className="text-xs text-stone-400">g</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="4"
                    max="12"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(parseInt(e.target.value) || 7)}
                    className="w-16 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs text-center font-mono"
                  />
                  <span className="text-xs text-stone-400">lb</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={weightOz}
                    onChange={(e) => setWeightOz(parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs text-center font-mono"
                  />
                  <span className="text-xs text-stone-400">oz</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-1 text-xs text-stone-400 mb-1">
                <Ruler className="w-3.5 h-3.5 text-teal-400" />
                <span>Length</span>
              </div>
              {metric ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="40"
                    max="60"
                    value={lengthCm}
                    onChange={(e) => setLengthCm(parseFloat(e.target.value) || 50)}
                    className="w-20 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs text-center font-mono"
                  />
                  <span className="text-xs text-stone-400">cm</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="16"
                    max="24"
                    value={lengthInches}
                    onChange={(e) => setLengthInches(parseFloat(e.target.value) || 20)}
                    className="w-20 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs text-center font-mono"
                  />
                  <span className="text-xs text-stone-400">in</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Temperament: every baby is different. Chosen for you; can be overridden. */}
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/60 text-xs text-stone-300 leading-relaxed">
            <span className="font-semibold text-stone-100 block mb-0.5">Every baby is different</span>
            You won't know {name.trim() || 'your baby'}'s temperament in advance — just like real life. You'll learn it by caring for them.
            <button
              type="button"
              onClick={() => setShowTemperament(v => !v)}
              className="block mt-2 text-[11px] text-teal-400 hover:text-teal-300 underline underline-offset-2"
            >
              {showTemperament ? 'Hide advanced option' : 'Advanced: choose temperament manually'}
            </button>
          </div>

          {showTemperament && (
            <div className="space-y-2">
              {TEMPERAMENT_KEYS.map((tKey) => {
                const t = TEMPERAMENTS[tKey];
                const isSelected = temperament === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setTemperament(tKey)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-teal-950/70 border-teal-500 ring-1 ring-teal-500/50 text-stone-100'
                        : 'bg-stone-800/40 border-stone-700/50 text-stone-400 hover:bg-stone-800/70'
                    }`}
                  >
                    <span className="text-xs font-bold text-stone-100">{t.label}</span>
                    <p className="text-[11px] text-stone-400 mt-1 leading-normal">{t.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="pt-6">
        <button
          type="submit"
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/50"
        >
          <Sparkles className="w-4 h-4" />
          <span>Meet {name.trim() || 'your baby'}</span>
        </button>
      </div>
    </form>
  );
};
