/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Where the AI endpoints live. Same origin when the app is served by server.ts
 * (AI Studio / Cloud Run); the Worker's URL when the app is a static site on
 * Cloudflare Pages and the Worker hosts /api/gemini/*.
 */
export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_WORKER_URL || '';
