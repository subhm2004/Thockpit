'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The clack of a pull-chain light switch.
 *
 * Synthesised rather than sampled: it's a different object from the keyboard and
 * has to sound like one — a bright snap, the chain's return click a moment later,
 * and a small hollow body under both.
 */

function jitter(value: number, amount: number): number {
  return value * (1 + (Math.random() * 2 - 1) * amount);
}

class LampSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Built on the first pull — an AudioContext needs a user gesture. */
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
    const master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const length = Math.floor(ctx.sampleRate * 0.1);
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

  private snap(at: number, frequency: number, gain: number, decay: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = jitter(frequency, 0.08);
    band.Q.value = 1.4;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(jitter(gain, 0.1), at + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay);

    source.connect(band);
    band.connect(envelope);
    envelope.connect(this.master!);
    source.start(at);
    source.stop(at + decay + 0.01);
  }

  private body(at: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';

    const frequency = jitter(210, 0.05);
    osc.frequency.setValueAtTime(frequency, at);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.6, at + 0.045);

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1600;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(0.22, at + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);

    osc.connect(low);
    low.connect(envelope);
    envelope.connect(this.master!);
    osc.start(at);
    osc.stop(at + 0.06);
  }

  click() {
    if (!this.ensure()) return;

    const at = this.ctx!.currentTime;
    this.snap(at, 3200, 0.5, 0.012); // the switch catching
    this.body(at);
    this.snap(at + jitter(0.016, 0.2), 2200, 0.22, 0.01); // the chain dropping back
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noise = null;
  }
}

export function useLampSound(enabled: boolean) {
  const lampRef = useRef<LampSound | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    return () => {
      lampRef.current?.dispose();
      lampRef.current = null;
    };
  }, []);

  return useCallback(() => {
    if (!enabledRef.current) return;
    lampRef.current ??= new LampSound();
    lampRef.current.click();
  }, []);
}
