/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Gentle chime when a care action succeeds
   */
  public playSuccessChime() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * A synthesized baby cry: rising, wavering bursts. Intensity 0.3–1.0.
   * Deliberately unpleasant enough to feel real; stops after a few seconds.
   */
  public playCry(intensity: number = 0.7, seconds: number = 4) {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const bursts = Math.max(2, Math.round(seconds / 1.1));
      for (let i = 0; i < bursts; i++) {
        const t = now + i * 1.1;
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900 + intensity * 400;
        filter.Q.value = 2;
        osc.type = 'sawtooth';
        osc2.type = 'square';
        const base = 380 + intensity * 120;
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.linearRampToValueAtTime(base * 1.6, t + 0.35);
        osc.frequency.linearRampToValueAtTime(base * 1.2, t + 0.8);
        osc2.frequency.setValueAtTime(base * 2.01, t);
        osc2.frequency.linearRampToValueAtTime(base * 3.2, t + 0.35);
        osc2.frequency.linearRampToValueAtTime(base * 2.4, t + 0.8);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.08 + intensity * 0.12, t + 0.08);
        gain.gain.setValueAtTime(0.08 + intensity * 0.12, t + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc2.start(t); osc.stop(t + 1.0); osc2.stop(t + 1.0);
      }
    } catch {
      // Audio may be blocked before a user gesture
    }
  }

  /**
   * Soft baby coo / pleasant tone
   */
  public playBabyCoo() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.4);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  /**
   * Soft heartbeat sound for skin-to-skin and soothing
   */
  public playHeartbeat() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  /**
   * Subtle alert chime for important baby events
   */
  public playAlert() {
    if (!this.isEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(392.00, now); // G4
      osc.frequency.setValueAtTime(329.63, now + 0.15); // E4

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }
}

export const soundFx = new SoundSynthesizer();
