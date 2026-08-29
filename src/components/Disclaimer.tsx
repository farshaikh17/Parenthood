/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DISCLAIMER_SHORT } from '../content/copy';

/** Persistent, unobtrusive disclaimer shown on every main screen. */
export const Disclaimer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`px-4 py-1.5 text-[10px] text-stone-500 text-center border-t border-stone-800/60 bg-stone-900 ${className}`}>
    {DISCLAIMER_SHORT}
  </div>
);
