import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ParticleType = 'confetti' | 'sparkles' | 'bubbles' | 'geometric';

interface ParticleFieldProps {
  type: ParticleType;
  /** 0..1 — scales the number of particles on screen. */
  density: number;
}

/** Visible half-extents at the camera distance used by the intro/outro previews. */
const BOUND_X = 5;
const BOUND_Y = 3;

const PALETTES: Record<ParticleType, string[]> = {
  confetti: ['#E44E51', '#F5A623', '#4ADE80', '#38BDF8', '#A855F7'],
  sparkles: ['#FFFFFF', '#FDE68A', '#FCD34D'],
  bubbles: ['#93C5FD', '#BFDBFE', '#E0F2FE'],
  geometric: ['#E44E51', '#111827', '#9CA3AF']
};

const BASE_COUNT: Record<ParticleType, number> = {
  confetti: 320,
  sparkles: 260,
  bubbles: 160,
  geometric: 220
};

const POINT_SIZE: Record<ParticleType, number> = {
  confetti: 0.12,
  sparkles: 0.08,
  bubbles: 0.2,
  geometric: 0.1
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Real GPU particle field used by the intro/outro previews. Positions are
 * integrated every frame on the CPU and uploaded to the point cloud, so the
 * density / type controls visibly change what is rendered.
 */
export const ParticleField: React.FC<ParticleFieldProps> = ({ type, density }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const count = Math.max(24, Math.round(BASE_COUNT[type] * Math.min(1, Math.max(0.05, density))));

  const { positions, colors, velocities, phases } = useMemo(() => {
    const positionArray = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);
    const velocityArray = new Float32Array(count * 3);
    const phaseArray = new Float32Array(count);
    const palette = PALETTES[type].map((hex) => new THREE.Color(hex));

    for (let i = 0; i < count; i++) {
      positionArray[i * 3] = randomBetween(-BOUND_X, BOUND_X);
      positionArray[i * 3 + 1] = randomBetween(-BOUND_Y, BOUND_Y);
      positionArray[i * 3 + 2] = randomBetween(-1, 1);

      const color = palette[i % palette.length];
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;

      switch (type) {
        case 'confetti':
          velocityArray[i * 3] = randomBetween(-0.25, 0.25);
          velocityArray[i * 3 + 1] = randomBetween(-1.6, -0.7);
          break;
        case 'bubbles':
          velocityArray[i * 3] = randomBetween(-0.1, 0.1);
          velocityArray[i * 3 + 1] = randomBetween(0.25, 0.8);
          break;
        case 'sparkles':
          velocityArray[i * 3] = randomBetween(-0.15, 0.15);
          velocityArray[i * 3 + 1] = randomBetween(-0.15, 0.15);
          break;
        default:
          velocityArray[i * 3] = 0;
          velocityArray[i * 3 + 1] = 0;
          break;
      }
      velocityArray[i * 3 + 2] = randomBetween(-0.05, 0.05);
      phaseArray[i] = Math.random() * Math.PI * 2;
    }

    return {
      positions: positionArray,
      colors: colorArray,
      velocities: velocityArray,
      phases: phaseArray
    };
  }, [count, type]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const step = Math.min(delta, 0.05);
    const attribute = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      switch (type) {
        case 'confetti': {
          array[ix] += (velocities[ix] + Math.sin(time * 2 + phases[i]) * 0.35) * step;
          array[iy] += velocities[iy] * step;
          break;
        }
        case 'bubbles': {
          array[ix] += (velocities[ix] + Math.sin(time * 1.2 + phases[i]) * 0.2) * step;
          array[iy] += velocities[iy] * step;
          break;
        }
        case 'sparkles': {
          array[ix] += velocities[ix] * step;
          array[iy] += velocities[iy] * step;
          array[iz] = Math.sin(time * 3 + phases[i]) * 0.6;
          break;
        }
        default: {
          // Geometric: the whole lattice slowly orbits the centre.
          const x = array[ix];
          const y = array[iy];
          const angle = 0.25 * step;
          array[ix] = x * Math.cos(angle) - y * Math.sin(angle);
          array[iy] = x * Math.sin(angle) + y * Math.cos(angle);
          break;
        }
      }

      // Wrap particles back into view so the field never empties out.
      if (array[ix] > BOUND_X) array[ix] = -BOUND_X;
      else if (array[ix] < -BOUND_X) array[ix] = BOUND_X;
      if (array[iy] > BOUND_Y) array[iy] = -BOUND_Y;
      else if (array[iy] < -BOUND_Y) array[iy] = BOUND_Y;
    }

    attribute.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} key={`${type}-${count}`}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        opacity={type === 'bubbles' ? 0.55 : 0.9}
        size={POINT_SIZE[type]}
      />
    </points>
  );
};
