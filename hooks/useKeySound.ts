'use client';

import { useCallback, useEffect, useRef } from 'react';
import { rowForCode } from '@/utils/keyboard';

/**
 * Plays recordings of real mechanical switches (see public/sounds/CREDITS.md).
 *
 * The packs carry one press sample per keyboard row plus dedicated samples for
 * the stabilised keys, which is what makes a real board sound uneven as you type.
 */

export const SWITCHES = [
  { id: 'holypanda', name: 'Holy Panda' },
  { id: 'boxnavy', name: 'Box Navy' },
  { id: 'cream', name: 'Cream' },
  { id: 'mxbrown', name: 'MX Brown' },
] as const;

export type SwitchId = (typeof SWITCHES)[number]['id'];

export const DEFAULT_SWITCH: SwitchId = 'holypanda';

export function isSwitchId(value: string): value is SwitchId {
  return SWITCHES.some((s) => s.id === value);
}

type Stroke = 'press' | 'release';

const PRESS_SAMPLES = [
  'BACKSPACE',
  'ENTER',
  'SPACE',
  'GENERIC_R0',
  'GENERIC_R1',
  'GENERIC_R2',
  'GENERIC_R3',
  'GENERIC_R4',
];
const RELEASE_SAMPLES = ['BACKSPACE', 'ENTER', 'SPACE', 'GENERIC'];

const STABILISED: Record<string, string> = {
  Space: 'SPACE',
  Enter: 'ENTER',
  Backspace: 'BACKSPACE',
};

function sampleFor(code: string, stroke: Stroke): string {
  const stabilised = STABILISED[code];
  if (stabilised) return stabilised;
  return stroke === 'press' ? `GENERIC_R${rowForCode(code)}` : 'GENERIC';
}

class KeySoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: SwitchId | null = null;
  private volume: number;

  constructor(volume: number) {
    this.volume = volume;
  }

  /**
   * Created up front (suspended) so samples are decoded and ready before the
   * first keystroke — a keydown then only has to resume it.
   */
  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.volume;

    // Fast typing stacks samples on top of each other; this keeps it from clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.1;

    master.connect(comp);
    comp.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  async load(pack: SwitchId): Promise<void> {
    const ctx = this.context();
    if (!ctx || this.loading === pack) return;
    this.loading = pack;

    const files: [Stroke, string][] = [
      ...PRESS_SAMPLES.map((name) => ['press', name] as [Stroke, string]),
      ...RELEASE_SAMPLES.map((name) => ['release', name] as [Stroke, string]),
    ];

    await Promise.all(
      files.map(async ([stroke, name]) => {
        const key = `${pack}/${stroke}/${name}`;
        if (this.buffers.has(key)) return;
        try {
          const res = await fetch(`/sounds/${key}.mp3`);
          if (!res.ok) return;
          this.buffers.set(key, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // A missing sample just means that key stays silent.
        }
      })
    );
  }

  play(pack: SwitchId, code: string, stroke: Stroke) {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const buffer = this.buffers.get(`${pack}/${stroke}/${sampleFor(code, stroke)}`);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // A touch of detune: two presses of the same key are never identical.
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * 0.04;

    const gain = ctx.createGain();
    gain.gain.value = stroke === 'press' ? 1 : 0.55;

    source.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.01);
    }
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.buffers.clear();
  }
}

export function useKeySound(enabled: boolean, switchId: SwitchId, volume = 0.8) {
  const engineRef = useRef<KeySoundEngine | null>(null);
  const enabledRef = useRef(enabled);
  const switchRef = useRef(switchId);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    switchRef.current = switchId;
  }, [switchId]);

  useEffect(() => {
    engineRef.current ??= new KeySoundEngine(volume);
    engineRef.current.setVolume(volume);
    void engineRef.current.load(switchId);
  }, [switchId, volume]);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const press = useCallback((code: string) => {
    if (enabledRef.current) engineRef.current?.play(switchRef.current, code, 'press');
  }, []);

  const release = useCallback((code: string) => {
    if (enabledRef.current) engineRef.current?.play(switchRef.current, code, 'release');
  }, []);

  return { press, release };
}
