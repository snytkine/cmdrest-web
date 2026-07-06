/**
 * The hero's 3D scene: a slowly rotating "API network graph" rendered
 * with three.js via React Three Fiber.
 *
 * Visual composition:
 * - green spheres = API nodes (services/endpoints),
 * - faint slate lines = connections between them,
 * - bright green "pulses" = requests traveling along random edges.
 *
 * All geometry comes from the pure generator in `networkGraph.ts`;
 * this file only handles rendering and animation.
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateNetworkGraph, createRandom } from './networkGraph';
import type { NetworkGraphData } from './networkGraph';

/** Scene accent colors, matching the site's CSS palette. */
const NODE_COLOR = '#16a34a';
const EDGE_COLOR = '#64748b';
const PULSE_COLOR = '#4ade80';

/** Runtime state of one request pulse traveling along an edge. */
interface PulseState {
  /** Index into the graph's edge list. */
  edgeIndex: number;
  /** Progress along the edge in [0, 1]. */
  progress: number;
  /** Progress increase per second (individual speed per pulse). */
  speed: number;
}

/**
 * Renders every graph node as one instanced mesh (a single draw call
 * regardless of node count).
 */
function Nodes({ graph }: { graph: NetworkGraphData }): React.JSX.Element {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const nodeCount = graph.nodePositions.length / 3;

  // Position each instance once; the graph is static so there is no
  // per-frame work for the nodes themselves.
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const list: THREE.Matrix4[] = [];
    for (let i = 0; i < nodeCount; i += 1) {
      dummy.position.set(
        graph.nodePositions[i * 3] ?? 0,
        graph.nodePositions[i * 3 + 1] ?? 0,
        graph.nodePositions[i * 3 + 2] ?? 0,
      );
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [graph, nodeCount]);

  return (
    <instancedMesh
      ref={(mesh) => {
        // Imperatively write the instance matrices when the mesh mounts.
        if (mesh) {
          matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
          mesh.instanceMatrix.needsUpdate = true;
        }
        meshRef.current = mesh;
      }}
      args={[undefined, undefined, nodeCount]}
    >
      <sphereGeometry args={[0.055, 16, 16]} />
      <meshBasicMaterial color={NODE_COLOR} />
    </instancedMesh>
  );
}

/** Renders all graph edges as a single line-segments object. */
function Edges({ graph }: { graph: NetworkGraphData }): React.JSX.Element {
  // Build the BufferGeometry once from the pre-computed segment positions.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(graph.edgePositions, 3));
    return geo;
  }, [graph]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={EDGE_COLOR} transparent opacity={0.3} />
    </lineSegments>
  );
}

/**
 * Renders animated "request pulses": small bright spheres that travel
 * along randomly chosen edges and respawn on a new edge when they arrive.
 */
function Pulses({ graph, count = 8 }: { graph: NetworkGraphData; count?: number }): React.JSX.Element {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Seeded PRNG so pulse behavior is stable across mounts (and tests).
  const random = useMemo(() => createRandom(97), []);

  // Initialize each pulse on a random edge with a random speed/phase.
  const pulses = useMemo<PulseState[]>(
    () =>
      Array.from({ length: count }, () => ({
        edgeIndex: Math.floor(random() * graph.edges.length),
        progress: random(),
        speed: 0.25 + random() * 0.5,
      })),
    [graph, count, random],
  );

  // Reused scratch objects to avoid per-frame allocations.
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const start = useMemo(() => new THREE.Vector3(), []);
  const end = useMemo(() => new THREE.Vector3(), []);

  // Advance every pulse along its edge each frame; when a pulse reaches
  // the end of its edge it respawns at the start of a new random edge.
  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    pulses.forEach((pulse, index) => {
      pulse.progress += pulse.speed * delta;
      if (pulse.progress >= 1) {
        pulse.progress = 0;
        pulse.edgeIndex = Math.floor(random() * graph.edges.length);
      }
      const edge = graph.edges[pulse.edgeIndex];
      if (!edge) {
        return;
      }
      const [a, b] = edge;
      start.fromArray(graph.nodePositions, a * 3);
      end.fromArray(graph.nodePositions, b * 3);
      // Linear interpolation between the edge's endpoints.
      dummy.position.lerpVectors(start, end, pulse.progress);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.035, 12, 12]} />
      <meshBasicMaterial color={PULSE_COLOR} />
    </instancedMesh>
  );
}

/**
 * The rotating group containing the whole constellation.
 * Rotation is time-based (frame-rate independent) and intentionally slow
 * so the hero reads as calm, not busy.
 */
function RotatingGraph(): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  // Generate the static graph exactly once per mount.
  const graph = useMemo(() => generateNetworkGraph(), []);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (group) {
      // Slow yaw plus a gentle fixed tilt gives constant subtle motion.
      group.rotation.y += delta * 0.12;
      group.rotation.x = 0.28;
    }
  });

  return (
    <group ref={groupRef}>
      <Nodes graph={graph} />
      <Edges graph={graph} />
      <Pulses graph={graph} />
    </group>
  );
}

/**
 * Public hero scene component: wraps the graph in a React Three Fiber
 * <Canvas>. `dpr` is capped at 2 so high-density mobile screens do not
 * pay for oversampled rendering, and antialiasing keeps the thin edge
 * lines smooth on the light background.
 */
export function NetworkScene(): React.JSX.Element {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      aria-label="Animated 3D network of API nodes"
      role="img"
    >
      <RotatingGraph />
    </Canvas>
  );
}
