import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { T } from './textures';
import type { Weather as WeatherKind } from '../types';

const N = 2600;
const SPAN = 36;
const HEIGHT = 14;

interface WeatherSystem {
  rain: THREE.LineSegments;
  snow: THREE.Points;
  tick: (kind: WeatherKind, dt: number, t: number, target: THREE.Vector3) => void;
  dispose: () => void;
}

function createWeatherSystem(): WeatherSystem {
  const drops = Array.from({ length: N }, () => [(Math.random() - 0.5) * SPAN, Math.random() * HEIGHT, (Math.random() - 0.5) * SPAN, Math.random()]);

  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(N * 6);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#cfd8e6', transparent: true, opacity: 0.35 }));
  rain.frustumCulled = false;

  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(N * 3);
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const flake = T(
    (ctx, w, h) => {
      const gr = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
    },
    [1, 1],
    64,
  );
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ size: 0.08, map: flake, transparent: true, depthWrite: false }));
  snow.frustumCulled = false;

  return {
    rain,
    snow,
    tick(kind, dt, t, target) {
      if (kind === 'rain') {
        for (let i = 0; i < N; i++) {
          const d = drops[i];
          d[1] -= dt * 9;
          if (d[1] < 0) d[1] += HEIGHT;
          const x = target.x + d[0],
            z = target.z + d[2];
          rainPos.set([x, d[1], z, x + 0.02, d[1] + 0.35, z], i * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      } else if (kind === 'snow') {
        for (let i = 0; i < N; i++) {
          const d = drops[i];
          d[1] -= dt * (0.5 + d[3] * 0.5);
          if (d[1] < 0) d[1] += HEIGHT;
          snowPos[i * 3] = target.x + d[0] + Math.sin(t * 0.5 + d[3] * 9) * 0.4;
          snowPos[i * 3 + 1] = d[1];
          snowPos[i * 3 + 2] = target.z + d[2];
        }
        snowGeo.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      rainGeo.dispose();
      (rain.material as THREE.Material).dispose();
      snowGeo.dispose();
      flake.dispose();
      (snow.material as THREE.Material).dispose();
    },
  };
}

const ORIGIN = new THREE.Vector3();

/** Rain streaks or drifting snow that follow the orbit target, as in the prototype's `tickWeather`. */
export function Weather({ kind, motion }: { kind: WeatherKind; motion: boolean }) {
  const sys = useMemo(() => createWeatherSystem(), []);
  useEffect(() => () => sys.dispose(), [sys]);

  useFrame((state, delta) => {
    if (kind === 'clear') return;
    const target = (state.controls as unknown as { target?: THREE.Vector3 } | null)?.target ?? ORIGIN;
    sys.tick(kind, motion ? Math.min(0.05, delta) : 0, state.clock.elapsedTime, target);
  });

  if (kind === 'rain') return <primitive object={sys.rain} />;
  if (kind === 'snow') return <primitive object={sys.snow} />;
  return null;
}

/** A fixed dome of stars, shown at night. */
function createStars(count: number) {
  const p: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2,
      v = Math.acos(0.05 + Math.random() * 0.95);
    p.push(Math.sin(v) * Math.cos(u) * 450, Math.cos(v) * 450, Math.sin(v) * Math.sin(u) * 450);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }));
}

export function Stars({ count = 1000 }: { count?: number }) {
  const points = useMemo(() => createStars(count), [count]);

  useEffect(
    () => () => {
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    },
    [points],
  );

  return <primitive object={points} />;
}
