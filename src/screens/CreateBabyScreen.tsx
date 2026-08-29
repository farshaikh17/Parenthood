/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Baby, TemperamentType } from '../types';
import { TEMPERAMENTS } from '../simulation/initialData';
import { Sparkles, Heart, Scale, Ruler, ArrowRight, ArrowLeft } from 'lucide-react';

interface CreateBabyScreenProps {
  onComplete: (baby: Baby) => void;
  onBack: () => void;
}

export const CreateBabyScreen: React.FC<CreateBabyScreenProps> = ({ onComplete, onBack }) => {
  const [name, setName] = useState<string>('Emma');
  const [sex, setSex] = useState<Baby['sex']>('girl');
  const [weightLbs, setWeightLbs] = useState<number>(7);
  const [weightOz, setWeightOz] = useState<number>(6);
  const [lengthInches, setLengthInches] = useState<number>(19.5);
  const [temperament, setTemperament] = useState<TemperamentType>('easygoing');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const totalWeightDecimal = parseFloat((weightLbs + (weightOz / 16)).toFixed(2));

    const newBaby: Baby = {
      id: `baby_${Date.now()}`,
      name: name.trim(),
      sex,
      birthWeightLbs: totalWeightDecimal,
      birthWeightOz: weightOz,
      birthLengthInches: lengthInches,
      temperament,
      currentWeightLbs: totalWeightDecimal,
      currentLengthInches: lengthInches,
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
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="4"
                  max="12"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(parseInt(e.target.value) || 7)}
                  className="w-16 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs text-center font-mono"
                />
                <span className="text-xs text-stone-400">lbs</span>
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
            </div>

            <div>
              <div className="flex items-center space-x-1 text-xs text-stone-400 mb-1">
                <Ruler className="w-3.5 h-3.5 text-teal-400" />
                <span>Length</span>
              </div>
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
                <span className="text-xs text-stone-400">inches</span>
              </div>
            </div>
          </div>
        </div>

        {/* Temperament Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-stone-300 block">
            Newborn Temperament Archetype
          </label>
          <div className="space-y-2">
            {(Object.keys(TEMPERAMENTS) as TemperamentType[]).map((tKey) => {
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
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-100">{t.label}</span>
                    <span className="text-[10px] font-mono uppercase text-teal-400 px-1.5 py-0.5 rounded bg-teal-950/80 border border-teal-800">
                      Cry: {t.cryIntensity}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1 leading-normal">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-6">
        <button
          type="submit"
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/50"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Parenthood Simulation</span>
        </button>
      </div>
    </form>
  );
};
