/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Shield, HeartHandshake, ArrowRight, Clock, Award } from 'lucide-react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-stone-100 animate-in fade-in duration-300">
      {/* Top Brand Tag */}
      <div className="pt-4 text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-950/70 border border-teal-800/60 text-teal-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Realistic Parenting Simulation</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-100 pt-2">
          Parenthood
        </h1>
        <p className="text-sm font-medium text-amber-200/90 tracking-wide">
          Experience parenthood before you become a parent.
        </p>
      </div>

      {/* Center Emotional & Philosophical Pillars */}
      <div className="space-y-3 py-6">
        <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/50 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-teal-950 text-teal-400 border border-teal-800/60 shrink-0">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-0.5">
            <h2 className="font-semibold text-stone-200 text-xs">Continuous Simulated Life</h2>
            <p className="text-stone-400 leading-relaxed">
              Not a casual game. Experience the uninterrupted rhythm, wake windows, hunger cycles, and soothing demands of a simulated newborn.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/50 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/60 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-0.5">
            <h2 className="font-semibold text-stone-200 text-xs">Parent Fatigue & Reality</h2>
            <p className="text-stone-400 leading-relaxed">
              Experience the emotional weight, sleep debt, stress management, and profound reward of responsive caregiving.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/50 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800/60 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-0.5">
            <h2 className="font-semibold text-stone-200 text-xs">Evidence-Based Pediatric Science</h2>
            <p className="text-stone-400 leading-relaxed">
              Understand the biological reasons behind crying, cluster feeding, Moro startles, and secure emotional bonding.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="space-y-3 pb-2">
        <button
          onClick={onStart}
          className="w-full py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-semibold text-sm transition-all shadow-lg shadow-teal-950/50 flex items-center justify-center space-x-2"
        >
          <span>Begin Parenting Journey</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-[10px] text-stone-500">
          Designed for prospective parents, couples, and curious adults.
        </p>
      </div>
    </div>
  );
};
