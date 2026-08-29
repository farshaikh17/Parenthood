/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Baby as BabyIcon, 
  Coffee, 
  Heart, 
  Moon, 
  Sparkles, 
  Thermometer, 
  ShieldCheck, 
  Wind, 
  Droplet,
  Users,
  CheckCircle2,
  Utensils
} from 'lucide-react';
import { Baby, BabyState, Parent, UnitSystem, UserProfile } from '../types';
import { feedSliderConfig, formatVolume } from '../utils/units';

interface ActionModalProps {
  isOpen: boolean;
  actionType: string | null;
  baby: Baby;
  babyState: BabyState;
  parents: Parent[];
  userProfile: UserProfile;
  unitSystem: UnitSystem;
  lastFeedback?: string | null;
  onClose: () => void;
  onConfirmAction: (actionType: string, params?: any) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  actionType,
  baby,
  babyState,
  parents,
  userProfile,
  unitSystem,
  onClose,
  onConfirmAction,
}) => {
  const slider = feedSliderConfig(unitSystem);
  const [feedAmount, setFeedAmount] = useState<number>(slider.default);
  const [feedMethod, setFeedMethod] = useState<'bottle' | 'nursing'>('bottle');
  const [solidFoodType, setSolidFoodType] = useState<string>('Sweet Potato Puree');
  const [isPerforming, setIsPerforming] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  if (!isOpen || !actionType) return null;

  const handlePerform = (params?: any) => {
    setIsPerforming(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsPerforming(false);
            onConfirmAction(actionType, params);
            onClose();
          }, 250);
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  const renderContent = () => {
    switch (actionType) {
      case 'feed':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-amber-200">
              <Droplet className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-amber-100">Feeding {baby.name}</p>
                <p className="text-stone-400 mt-0.5">
                  {babyState.hunger > 60 ? `${baby.name} is rooting and sucking on their hands.` : babyState.hunger > 35 ? `${baby.name} might take a feed.` : `${baby.name} doesn't seem hungry right now.`} A burp afterwards often helps.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">Feeding Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFeedMethod('bottle')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    feedMethod === 'bottle'
                      ? 'bg-amber-900/60 border-amber-600 text-amber-100 font-semibold'
                      : 'bg-stone-800/60 border-stone-700 text-stone-300'
                  }`}
                >
                  🍼 Bottle (Formula/Milk)
                </button>
                <button
                  type="button"
                  onClick={() => setFeedMethod('nursing')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    feedMethod === 'nursing'
                      ? 'bg-amber-900/60 border-amber-600 text-amber-100 font-semibold'
                      : 'bg-stone-800/60 border-stone-700 text-stone-300'
                  }`}
                >
                  🤱 Breastfeeding
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs text-stone-300 mb-1.5">
                <span className="font-semibold">Feeding Volume</span>
                <span className="font-mono text-amber-300 font-bold">{formatVolume(slider.toMl(feedAmount), unitSystem)}</span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={feedAmount}
                onChange={(e) => setFeedAmount(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-stone-800 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>{formatVolume(slider.toMl(slider.min), unitSystem)}</span>
                <span>{formatVolume(slider.toMl(slider.max), unitSystem)}</span>
              </div>
            </div>

            <button
              onClick={() => handlePerform({ amountMl: slider.toMl(feedAmount), method: feedMethod })}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition-all shadow-lg shadow-amber-900/30 flex items-center justify-center space-x-2"
            >
              {isPerforming ? (
                <span>Feeding {baby.name}... ({progress}%)</span>
              ) : (
                <>
                  <Droplet className="w-4 h-4" />
                  <span>Feed {formatVolume(slider.toMl(feedAmount), unitSystem)}</span>
                </>
              )}
            </button>
          </div>
        );

      case 'feed_solids':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-orange-950/40 border border-orange-800/40 text-orange-200">
              <Utensils className="w-5 h-5 text-orange-400 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-orange-100">Introducing Solid Foods (4-6 Months)</p>
                <p className="text-stone-400 mt-0.5">
                  Small tastes alongside milk feeds. In the simulation this is available from the 4–6 month stage.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">Select Puree / First Food</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '🍠 Sweet Potato', value: 'Sweet Potato Puree' },
                  { label: '🥕 Carrot & Squash', value: 'Carrot & Squash Puree' },
                  { label: '🥑 Avocado Puree', value: 'Smooth Avocado Mash' },
                  { label: '🥣 Iron-Fortified Cereal', value: 'Oat Infant Cereal' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSolidFoodType(item.value)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-left transition-all ${
                      solidFoodType === item.value
                        ? 'bg-orange-900/60 border-orange-600 text-orange-100 font-semibold'
                        : 'bg-stone-800/60 border-stone-700 text-stone-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-800/40 border border-stone-700/50 text-[11px] text-stone-400">
              <span className="text-stone-200 font-semibold block mb-0.5">Spoon-Feeding Technique</span>
              Offer tiny spoonfuls at mouth level. Allow {baby.name} to open mouth and draw puree off the soft silicone spoon.
            </div>

            <button
              onClick={() => handlePerform({ foodType: solidFoodType })}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-all shadow-lg shadow-orange-900/30 flex items-center justify-center space-x-2"
            >
              {isPerforming ? (
                <span>Spoon-Feeding {baby.name}... ({progress}%)</span>
              ) : (
                <>
                  <Utensils className="w-4 h-4" />
                  <span>Offer {solidFoodType}</span>
                </>
              )}
            </button>
          </div>
        );

      case 'burp':
        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-300">
              <Wind className="w-8 h-8 animate-bounce" />
            </div>

            <div className="text-xs text-stone-300 max-w-sm mx-auto">
              <p className="font-semibold text-stone-100 text-sm mb-1">Burp & Gas Relief</p>
              <p className="text-stone-400">
                Hold {baby.name} upright against your shoulder and pat gently. It doesn't always work first time.
              </p>
            </div>

            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950/40"
            >
              {isPerforming ? (
                <span>Gently Patting Back... ({progress}%)</span>
              ) : (
                <>
                  <Wind className="w-4 h-4" />
                  <span>Burp {baby.name}</span>
                </>
              )}
            </button>
          </div>
        );

      case 'change_diaper':
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-stone-800/60 border border-stone-700/60 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-stone-200">Diaper Status</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold ${
                  babyState.diaperType === 'clean' 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {babyState.diaperType}
                </span>
              </div>
              <p className="text-stone-400">
                Fresh nappy, quick clean. {babyState.diaperType === 'clean' ? `${baby.name}'s nappy seems clean, but you can check.` : ''}
              </p>
            </div>

            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40"
            >
              {isPerforming ? (
                <span>Wiping & Changing Diaper... ({progress}%)</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Change into Fresh Diaper</span>
                </>
              )}
            </button>
          </div>
        );

      case 'rock':
      case 'cuddle':
        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-300">
              <Heart className="w-8 h-8 animate-pulse" />
            </div>

            <div className="text-xs text-stone-300 max-w-sm mx-auto">
              <p className="font-semibold text-stone-100 text-sm mb-1">Hold and rock</p>
              <p className="text-stone-400">
                Hold {baby.name} close and rock gently. Being held often helps a baby settle — but not always, and not instantly.
              </p>
            </div>

            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-rose-950/40"
            >
              {isPerforming ? (
                <span>Holding & Soothing... ({progress}%)</span>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  <span>Cuddle & Soothe {baby.name}</span>
                </>
              )}
            </button>
          </div>
        );

      case 'put_to_sleep':
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-200">
              <div className="flex items-center space-x-2 mb-1">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-indigo-100">Put down to sleep</span>
              </div>
              <p className="text-stone-300 mt-2 text-[11px]">
                Put {baby.name} down in the cot on their back. If they are hungry, windy or not tired, they won't settle.
              </p>
              <p className="mt-2 text-stone-500 text-[10px]">
                Safe-sleep guidance for a real baby should come from a qualified source, not this app.
              </p>
            </div>

            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-950/40"
            >
              {isPerforming ? (
                <span>Settling... ({progress}%)</span>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span>Put {baby.name} down</span>
                </>
              )}
            </button>
          </div>
        );

      case 'tummy_time':
        return (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-teal-950/60 border border-teal-800/60 flex items-center justify-center text-teal-300">
              <BabyIcon className="w-7 h-7" />
            </div>
            <div className="text-xs text-stone-300">
              <p className="font-semibold text-stone-100 text-sm mb-1">Supervised Tummy Time</p>
              <p className="text-stone-400">
                A few minutes on their front on a firm mat while awake and watched. Tiring for a small baby.
              </p>
            </div>
            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-medium text-sm transition-all shadow-lg shadow-teal-950/40"
            >
              {isPerforming ? `Active Play Session... (${progress}%)` : `Start Tummy Time`}
            </button>
          </div>
        );

      case 'parent_break':
        return (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400">
              <Coffee className="w-7 h-7" />
            </div>
            <div className="text-xs text-stone-300">
              <p className="font-semibold text-stone-100 text-sm mb-1">Ten minutes for you</p>
              <p className="text-stone-400">
                Put {baby.name} down somewhere safe and step away for ten minutes. It helps. It does not make the workload disappear.
              </p>
            </div>
            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-medium text-sm transition-all"
            >
              {isPerforming ? `Breathing... (${progress}%)` : `Take a break`}
            </button>
          </div>
        );

      case 'observe':
        return (
          <div className="space-y-4 text-center">
            <div className="text-xs text-stone-300">
              <p className="font-semibold text-stone-100 text-sm mb-1">Take a look at {baby.name}</p>
              <p className="text-stone-400">
                Watch for a moment. You'll get what you can see and hear — not numbers, and not a diagnosis.
              </p>
            </div>
            <button
              onClick={() => handlePerform()}
              disabled={isPerforming}
              className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-medium text-sm transition-all"
            >
              {isPerforming ? `Watching... (${progress}%)` : `Look at ${baby.name}`}
            </button>
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <p className="text-xs text-stone-300">Confirm caregiving action for {baby.name}.</p>
            <button
              onClick={() => handlePerform()}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-semibold"
            >
              Confirm Action
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-stone-100 tracking-tight capitalize">
              {actionType.replace('_', ' ')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};
