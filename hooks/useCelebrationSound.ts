'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * The sound of a personal best: a short rising arpeggio, deliberately musical so
 * it can't be mistaken for a keystroke.
 */

/** A major triad plus the octave, in Hz — C5, E5, G5, C6. */
const NOTES = [523.25, 659.25, 783.99, 1046.5];

class CelebrationSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

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
    master.gain.value = 0.32;
    master.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    return true;
  }

  private note(frequency: number, at: number, duration: number) {
    const ctx = this.ctx!;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;

    // A second voice an octave up, quietly, so it rings rather than beeps.
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = frequency * 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.6, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, at);
    shimmerGain.gain.linearRampToValueAtTime(0.12, at + 0.012);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, at + duration * 0.7);

    osc.connect(gain);
    shimmer.connect(shimmerGain);
    gain.connect(this.master!);
    shimmerGain.connect(this.master!);

    osc.start(at);
    shimmer.start(at);
    osc.stop(at + duration + 0.05);
    shimmer.stop(at + duration + 0.05);
  }

  play() {
    if (!this.ensure()) return;

    const start = this.ctx!.currentTime + 0.02;
    NOTES.forEach((frequency, i) => {
      // The last note rings on, the ones before it skip past.
      this.note(frequency, start + i * 0.085, i === NOTES.length - 1 ? 0.9 : 0.35);
    });
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}

export function useCelebrationSound(enabled: boolean) {
  const soundRef = useRef<CelebrationSound | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    return () => {
      soundRef.current?.dispose();
      soundRef.current = null;
    };
  }, []);

  return useCallback(() => {
    if (!enabledRef.current) return;
    soundRef.current ??= new CelebrationSound();
    soundRef.current.play();
  }, []);
}
