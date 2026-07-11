'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Synthesised mechanical switch sounds — no audio assets.
 *
 * Each keystroke is built from the three things you actually hear on a real
 * board: a sharp click transient (stem hitting the housing), a low resonant
 * body (the plate/case), and — on stabilised keys — a bit of rattle.
 */

type Profile = 'normal' | 'space' | 'large' | 'modifier';

interface Voice {
  click: number;
  clickGain: number;
  body: number;
  bodyGain: number;
  decay: number;
  rattle: boolean;
}

const DOWN_VOICES: Record<Profile, Voice> = {
  normal: { click: 2600, clickGain: 0.5, body: 168, bodyGain: 0.5, decay: 0.052, rattle: false },
  large: { click: 2100, clickGain: 0.5, body: 132, bodyGain: 0.62, decay: 0.07, rattle: true },
  space: { click: 1500, clickGain: 0.42, body: 88, bodyGain: 0.85, decay: 0.1, rattle: true },
  modifier: { click: 2400, clickGain: 0.4, body: 150, bodyGain: 0.44, decay: 0.05, rattle: false },
};

const UP_VOICES: Record<Profile, Voice> = {
  normal: { click: 3800, clickGain: 0.2, body: 240, bodyGain: 0.12, decay: 0.022, rattle: false },
  large: { click: 3400, clickGain: 0.22, body: 200, bodyGain: 0.15, decay: 0.028, rattle: false },
  space: { click: 2600, clickGain: 0.24, body: 140, bodyGain: 0.2, decay: 0.036, rattle: true },
  modifier: { click: 3600, clickGain: 0.16, body: 230, bodyGain: 0.1, decay: 0.02, rattle: false },
};

const LARGE_KEYS = new Set(['Enter', 'Backspace', 'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight']);

function profileFor(code: string): Profile {
  if (code === 'Space') return 'space';
  if (LARGE_KEYS.has(code)) return 'large';
  if (code.startsWith('Control') || code.startsWith('Alt') || code.startsWith('Meta') || code === 'Fn') {
    return 'modifier';
  }
  return 'normal';
}

/** ±`amount` of jitter, so repeated keys never sound machine-gunned. */
function jitter(value: number, amount: number): number {
  return value * (1 + (Math.random() * 2 - 1) * amount);
}

class KeySoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume: number;

  constructor(volume = 0.5) {
    this.volume = volume;
  }

  /** Built lazily: browsers only allow audio to start inside a user gesture. */
  private ensure(): boolean {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx.state !== 'closed';
    }

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;

    const ctx = new Ctor();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 8;

    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(comp);
    comp.connect(ctx.destination);

    const length = Math.floor(ctx.sampleRate * 0.25);
    const noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.ctx = ctx;
    this.master = master;
    this.noise = noise;
    return true;
  }

  private transient(voice: Voice, at: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = jitter(voice.click, 0.1);

    const gain = ctx.createGain();
    const decay = 0.014;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(jitter(voice.clickGain, 0.15), at + 0.0012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    source.connect(band);
    band.connect(gain);
    gain.connect(this.master!);
    source.start(at);
    source.stop(at + decay + 0.01);
  }

  private resonance(voice: Voice, at: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';

    const freq = jitter(voice.body, 0.06);
    osc.frequency.setValueAtTime(freq, at);
    // Pitch drops as the case rings out — this is what reads as "thock".
    osc.frequency.exponentialRampToValueAtTime(freq * 0.62, at + voice.decay);

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(jitter(voice.bodyGain, 0.12), at + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + voice.decay);

    osc.connect(low);
    low.connect(gain);
    gain.connect(this.master!);
    osc.start(at);
    osc.stop(at + voice.decay + 0.02);
  }

  private play(voice: Voice) {
    if (!this.ensure()) return;

    const at = this.ctx!.currentTime;
    this.transient(voice, at);
    this.resonance(voice, at);

    if (voice.rattle) {
      // Stabiliser tick, a hair after the main strike.
      this.transient({ ...voice, click: voice.click * 1.7, clickGain: voice.clickGain * 0.35 }, at + 0.008);
    }
  }

  press(code: string) {
    this.play(DOWN_VOICES[profileFor(code)]);
  }

  release(code: string) {
    this.play(UP_VOICES[profileFor(code)]);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noise = null;
  }
}

export function useKeySound(enabled: boolean, volume = 0.5) {
  const engineRef = useRef<KeySoundEngine | null>(null);
  const enabledRef = useRef(enabled);
  const volumeRef = useRef(volume);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  /** Created on the first keystroke — an AudioContext needs a user gesture. */
  const engine = useCallback(() => {
    engineRef.current ??= new KeySoundEngine(volumeRef.current);
    return engineRef.current;
  }, []);

  const press = useCallback(
    (code: string) => {
      if (enabledRef.current) engine().press(code);
    },
    [engine]
  );

  const release = useCallback(
    (code: string) => {
      if (enabledRef.current) engine().release(code);
    },
    [engine]
  );

  return { press, release };
}
