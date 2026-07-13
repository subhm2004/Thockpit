'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { KeyTallies } from '@/types';
import { KeyDef, MAC_ROWS } from '@/utils/keyboard';

/** World units: 1u = one letter key. Every row of the layout is 14.5u wide. */
const U = 1;
const GAP = 0.09;
const CAP_H = 0.36;
const DECK_H = 0.55;
const FN_DEPTH = 0.58;
const PRESS_DROP = 0.16;
const DECK_MARGIN = 0.42;

const ACCENT = new THREE.Color('#f59e0b');

interface Theme {
  deck: string;
  cap: string;
  /** Emissive alone is invisible on a white keycap, so the hint tints it too. */
  hint: string;
  label: string;
}

const THEMES: Record<'dark' | 'light', Theme> = {
  dark: { deck: '#1f1f24', cap: '#33333b', hint: '#5a4622', label: '#d4d4d8' },
  light: { deck: '#c8c8cf', cap: '#f6f6f8', hint: '#fcd34d', label: '#3f3f46' },
};

interface PlacedKey {
  def: KeyDef;
  x: number;
  z: number;
  w: number;
  d: number;
}

const ARROWS: Record<'left' | 'up' | 'down' | 'right', KeyDef> = {
  left: { code: 'ArrowLeft', label: '◀' },
  up: { code: 'ArrowUp', label: '▲' },
  down: { code: 'ArrowDown', label: '▼' },
  right: { code: 'ArrowRight', label: '▶' },
};

/** Turns the layout table into centred world-space positions. */
function buildLayout() {
  const keys: PlacedKey[] = [];
  let z = 0;

  for (const [rowIndex, row] of MAC_ROWS.entries()) {
    const rowDepth = rowIndex === 0 ? FN_DEPTH : U;
    let x = 0;

    for (const def of row) {
      const units = def.w ?? 1;
      const width = units * U + (units - 1) * GAP;

      if (def.shape === 'arrows') {
        const half = (rowDepth - GAP) / 2;
        keys.push({ def: ARROWS.left, x: x + U / 2, z: z + rowDepth / 2, w: U, d: rowDepth });
        keys.push({ def: ARROWS.up, x: x + U + GAP + U / 2, z: z + half / 2, w: U, d: half });
        keys.push({
          def: ARROWS.down,
          x: x + U + GAP + U / 2,
          z: z + rowDepth - half / 2,
          w: U,
          d: half,
        });
        keys.push({
          def: ARROWS.right,
          x: x + 2 * (U + GAP) + U / 2,
          z: z + rowDepth / 2,
          w: U,
          d: rowDepth,
        });
      } else {
        keys.push({ def, x: x + width / 2, z: z + rowDepth / 2, w: width, d: rowDepth });
      }

      x += width + GAP;
    }

    z += rowDepth + GAP;
  }

  const width = 14.5 * U + 13.5 * GAP;
  const depth = z - GAP;

  // Centre the board on the origin.
  for (const key of keys) {
    key.x -= width / 2;
    key.z -= depth / 2;
  }

  return { keys, width, depth };
}

const LAYOUT = buildLayout();

const textureCache = new Map<string, THREE.CanvasTexture>();

/** Legends are drawn to a canvas so they need no font file and stay crisp. */
function legendTexture(def: KeyDef, w: number, d: number, color: string): THREE.CanvasTexture {
  const cacheKey = `${def.code}|${color}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const PX = 128;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(PX * w);
  canvas.height = Math.round(PX * d);

  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const font = (size: number, weight = 500) =>
    `${weight} ${size}px ui-monospace, "SF Mono", "JetBrains Mono", monospace`;

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const small = def.shape === 'fn';

  if (def.shifted) {
    ctx.globalAlpha = 0.6;
    ctx.font = font(30);
    ctx.fillText(def.shifted, cx, canvas.height * 0.34);
    ctx.globalAlpha = 1;
    ctx.font = font(34, 600);
    ctx.fillText(def.label, cx, canvas.height * 0.68);
  } else if (def.glyph && def.label) {
    ctx.font = font(30);
    ctx.fillText(def.glyph, cx, canvas.height * 0.34);
    ctx.globalAlpha = 0.65;
    ctx.font = font(20, 400);
    ctx.fillText(def.label, cx, canvas.height * 0.7);
    ctx.globalAlpha = 1;
  } else if (def.label) {
    ctx.font = font(small ? 24 : 38, 600);
    if (small) ctx.globalAlpha = 0.7;
    ctx.fillText(def.label, cx, canvas.height * 0.52);
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

interface KeycapProps {
  placed: PlacedKey;
  isPressed: boolean;
  isHint: boolean;
  /** Accuracy on this key, 0–1. Null when it wasn't typed (or we're not in heatmap mode). */
  score: number | null;
  theme: Theme;
}

const RESTING_Y = DECK_H / 2 + CAP_H / 2;

/** Status colours: a key you always hit is green, one you keep missing is red. */
const GOOD = new THREE.Color('#0ca30c');
const WARN = new THREE.Color('#fab219');
const BAD = new THREE.Color('#d03b3b');

function heatColor(score: number): THREE.Color {
  // 100%–90% good → 90%–70% amber → below that, red.
  if (score >= 0.9) return GOOD.clone().lerp(WARN, (1 - score) / 0.1);
  if (score >= 0.7) return WARN.clone().lerp(BAD, (0.9 - score) / 0.2);
  return BAD;
}

const Keycap = React.memo(function Keycap({
  placed,
  isPressed,
  isHint,
  score,
  theme,
}: KeycapProps) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);

  const base = useMemo(() => new THREE.Color(theme.cap), [theme.cap]);
  const hintColor = useMemo(() => new THREE.Color(theme.hint), [theme.hint]);
  const heat = useMemo(() => (score === null ? null : heatColor(score)), [score]);
  const texture = useMemo(
    () => legendTexture(placed.def, placed.w, placed.d, theme.label),
    [placed.def, placed.w, placed.d, theme.label]
  );

  useFrame((state, delta) => {
    const g = group.current;
    const m = material.current;
    if (!g || !m) return;

    const targetY = RESTING_Y - (isPressed ? PRESS_DROP : 0);
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 22, delta);

    const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 4.5) * 0.16;
    const glow = isPressed ? 1.3 : isHint ? pulse : 0;
    m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, glow, 14, delta);

    const target = heat ?? (isPressed ? ACCENT : isHint ? hintColor : base);
    m.color.lerp(target, 1 - Math.exp(-16 * delta));
  });

  return (
    <group ref={group} position={[placed.x, RESTING_Y, placed.z]}>
      <RoundedBox
        args={[placed.w, CAP_H, placed.d]}
        radius={0.06}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          ref={material}
          color={theme.cap}
          emissive={ACCENT}
          emissiveIntensity={0}
          roughness={0.55}
          metalness={0.15}
        />
      </RoundedBox>

      <mesh position={[0, CAP_H / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[placed.w * 0.92, placed.d * 0.92]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
});

/** How far the board swings with the cursor. The camera fit budgets for this. */
const MAX_YAW = 0.06;
const MAX_PITCH = 0.035;

interface BoardProps {
  pressed: ReadonlySet<string>;
  hints: ReadonlySet<string>;
  scores: Map<string, number> | null;
  theme: Theme;
  boardRef: React.RefObject<THREE.Group | null>;
}

function Board({ pressed, hints, scores, theme, boardRef }: BoardProps) {
  // Follow the cursor a little, so the board reads as a solid object.
  useFrame((state, delta) => {
    const g = boardRef.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * MAX_YAW, 4, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * MAX_PITCH, 4, delta);
  });

  return (
    <group ref={boardRef}>
      <RoundedBox
        args={[LAYOUT.width + DECK_MARGIN, DECK_H, LAYOUT.depth + DECK_MARGIN]}
        radius={0.16}
        smoothness={4}
        position={[0, 0, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color={theme.deck} roughness={0.4} metalness={0.65} />
      </RoundedBox>

      {LAYOUT.keys.map((placed) => (
        <Keycap
          key={placed.def.code}
          placed={placed}
          isPressed={pressed.has(placed.def.code)}
          isHint={hints.has(placed.def.code)}
          score={scores?.get(placed.def.code) ?? null}
          theme={theme}
        />
      ))}
    </group>
  );
}

/** Viewing angle above the deck. Low enough that the keycaps keep their depth. */
const ELEVATION = THREE.MathUtils.degToRad(40);

/**
 * Dollies the camera back until the whole board is inside the frustum.
 *
 * Fitting by formula is a trap here: the keycaps stand above the deck plane
 * and the board yaws with the cursor, so the silhouette is bigger than the
 * deck's own footprint and the edges get clipped. This measures the real
 * bounding box instead and binary-searches the closest distance that still
 * projects every corner inside the view — correct at any aspect ratio.
 * (drei's <Bounds> fits a bounding *sphere*, which for a board this wide and
 * flat overshoots the other way and leaves it tiny.)
 */
function CameraRig({ boardRef }: { boardRef: React.RefObject<THREE.Group | null> }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const cam = camera as THREE.PerspectiveCamera;
    const previousRotation = board.rotation.clone();
    board.rotation.set(0, 0, 0);
    board.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(board);
    board.rotation.copy(previousRotation);

    const center = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    // Room for the cursor swing, plus a little breathing space at the edges.
    // Only the wide axes need it — padding the (thin) height just shrinks the board.
    const swing = Math.max(half.x, half.z) * Math.sin(Math.max(MAX_YAW, MAX_PITCH));
    half.x += swing + 0.2;
    half.z += swing + 0.2;
    half.y += 0.12;

    const corners: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          corners.push(
            new THREE.Vector3(
              center.x + sx * half.x,
              center.y + sy * half.y,
              center.z + sz * half.z
            )
          );
        }
      }
    }

    const direction = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION));
    const projected = new THREE.Vector3();

    const fitsAt = (distance: number) => {
      cam.position.copy(center).addScaledVector(direction, distance);
      cam.lookAt(center);
      cam.updateMatrixWorld(true);
      cam.updateProjectionMatrix();
      return corners.every((corner) => {
        projected.copy(corner).project(cam);
        return Math.abs(projected.x) <= 0.98 && Math.abs(projected.y) <= 0.98;
      });
    };

    let near = 3;
    let far = 120;
    for (let i = 0; i < 24; i++) {
      const mid = (near + far) / 2;
      if (fitsAt(mid)) far = mid;
      else near = mid;
    }
    fitsAt(far);
  }, [camera, size, boardRef]);

  return null;
}

interface Keyboard3DProps {
  pressed: ReadonlySet<string>;
  hints: ReadonlySet<string>;
  /** Per-key accuracy (0–1). Present only on the results screen. */
  keys?: KeyTallies;
  isDark?: boolean;
}

export default function Keyboard3D({ pressed, hints, keys, isDark = true }: Keyboard3DProps) {
  const theme = THEMES[isDark ? 'dark' : 'light'];
  const boardRef = useRef<THREE.Group>(null);

  const scores = useMemo(() => {
    if (!keys) return null;

    const map = new Map<string, number>();
    for (const [code, tally] of Object.entries(keys)) {
      // One stray press on a key you barely touched isn't a weakness.
      if (tally.presses >= 2) {
        map.set(code, (tally.presses - tally.errors) / tally.presses);
      }
    }
    return map;
  }, [keys]);

  return (
    <div className="w-full max-w-5xl h-[clamp(210px,30vw,420px)] select-none">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} camera={{ fov: 30 }}>
        <ambientLight intensity={isDark ? 0.55 : 0.9} />
        <directionalLight
          position={[5, 12, 7]}
          intensity={isDark ? 1.5 : 2.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-11}
          shadow-camera-right={11}
          shadow-camera-top={11}
          shadow-camera-bottom={-11}
          shadow-bias={-0.0006}
        />
        <directionalLight position={[-8, 5, -6]} intensity={isDark ? 0.5 : 0.7} />

        <Board
          pressed={pressed}
          hints={hints}
          scores={scores}
          theme={theme}
          boardRef={boardRef}
        />
        {/* After <Board>, so its ref is set when the rig measures it. */}
        <CameraRig boardRef={boardRef} />

        <ContactShadows
          position={[0, -DECK_H / 2 - 0.02, 0]}
          scale={22}
          blur={2.4}
          opacity={isDark ? 0.6 : 0.35}
          far={5}
        />
      </Canvas>
    </div>
  );
}
