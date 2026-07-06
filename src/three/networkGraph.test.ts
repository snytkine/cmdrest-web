/**
 * Tests for the pure network-graph generator that feeds the 3D hero
 * scene. Because the module has no three.js dependency, the geometry
 * math is fully verifiable without a WebGL context.
 */
import { describe, expect, it } from 'vitest';
import {
  buildEdgePositions,
  buildNearestNeighborEdges,
  createRandom,
  generateNetworkGraph,
  generateNodePositions,
} from './networkGraph';

describe('createRandom', () => {
  it('produces values in [0, 1)', () => {
    const random = createRandom(1);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    // Two generators with the same seed emit identical sequences.
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('differs between seeds', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });
});

describe('generateNodePositions', () => {
  it('emits one xyz triplet per node', () => {
    const positions = generateNodePositions(10, createRandom(7));
    expect(positions).toHaveLength(30);
  });

  it('keeps every node inside the configured radius shell', () => {
    const inner = 1.4;
    const outer = 2.6;
    const positions = generateNodePositions(50, createRandom(7), inner, outer);
    for (let i = 0; i < 50; i += 1) {
      const x = positions[i * 3] ?? 0;
      const y = positions[i * 3 + 1] ?? 0;
      const z = positions[i * 3 + 2] ?? 0;
      const radius = Math.sqrt(x * x + y * y + z * z);
      // Tiny epsilon for floating point rounding at the boundaries.
      expect(radius).toBeGreaterThanOrEqual(inner - 1e-9);
      expect(radius).toBeLessThanOrEqual(outer + 1e-9);
    }
  });
});

describe('buildNearestNeighborEdges', () => {
  /** A tiny fixed layout: four points on a line at x = 0, 1, 2, 10. */
  const linePositions = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 10, 0, 0]);

  it('connects each node to its nearest neighbors', () => {
    const edges = buildNearestNeighborEdges(linePositions, 1);
    // Node 0's nearest is 1; node 1's nearest is 0 or 2; node 3's nearest is 2.
    expect(edges).toContainEqual([0, 1]);
    expect(edges).toContainEqual([2, 3]);
  });

  it('never produces self-edges or duplicate pairs', () => {
    const positions = generateNodePositions(30, createRandom(11));
    const edges = buildNearestNeighborEdges(positions, 3);
    const keys = edges.map(([a, b]) => `${a}-${b}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [a, b] of edges) {
      expect(a).not.toBe(b);
      // Pairs are normalized with the smaller index first.
      expect(a).toBeLessThan(b);
    }
  });

  it('gives every node at least one incident edge', () => {
    const positions = generateNodePositions(20, createRandom(3));
    const edges = buildNearestNeighborEdges(positions, 2);
    const connected = new Set(edges.flat());
    expect(connected.size).toBe(20);
  });
});

describe('buildEdgePositions', () => {
  it('expands edges into start/end xyz segments', () => {
    const positions = new Float32Array([0, 1, 2, 3, 4, 5]);
    const segments = buildEdgePositions(positions, [[0, 1]]);
    // One edge -> 6 floats: node 0's xyz followed by node 1's xyz.
    expect([...segments]).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('generateNetworkGraph', () => {
  it('is fully deterministic for the same seed', () => {
    const a = generateNetworkGraph(30, 99);
    const b = generateNetworkGraph(30, 99);
    expect([...a.nodePositions]).toEqual([...b.nodePositions]);
    expect(a.edges).toEqual(b.edges);
  });

  it('produces consistent array sizes', () => {
    const graph = generateNetworkGraph(25, 5);
    expect(graph.nodePositions).toHaveLength(75);
    // Each edge contributes exactly two xyz endpoints.
    expect(graph.edgePositions).toHaveLength(graph.edges.length * 6);
  });
});
