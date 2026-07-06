/**
 * Pure geometry generator for the hero's 3D "API network graph".
 *
 * This module contains no three.js rendering code — it only produces
 * typed arrays of node positions and edge segments. Keeping the math
 * pure makes the graph fully unit-testable without a WebGL context,
 * while the React Three Fiber scene simply consumes the output.
 */

/** Result of generating a network graph. */
export interface NetworkGraphData {
  /** Flat xyz triplets for every node: length = nodeCount * 3. */
  readonly nodePositions: Float32Array;
  /** Node index pairs, one pair per edge. */
  readonly edges: ReadonlyArray<readonly [number, number]>;
  /**
   * Flat xyz triplets for line segments (two points per edge):
   * length = edges.length * 6. Ready to feed a BufferGeometry.
   */
  readonly edgePositions: Float32Array;
}

/**
 * Deterministic pseudo-random number generator (mulberry32).
 * A seeded PRNG keeps the graph identical between renders and makes
 * the generator's output assertable in unit tests.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // mulberry32: fast 32-bit PRNG with good statistical quality.
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates `nodeCount` points distributed inside a spherical shell.
 *
 * Points are placed with uniform random direction and a radius between
 * `innerRadius` and `outerRadius`, producing a cloud that reads as a
 * three-dimensional "constellation" from every camera angle.
 */
export function generateNodePositions(
  nodeCount: number,
  random: () => number,
  innerRadius = 1.4,
  outerRadius = 2.6,
): Float32Array {
  const positions = new Float32Array(nodeCount * 3);
  for (let i = 0; i < nodeCount; i += 1) {
    // Uniform direction on a sphere via the classic z/theta method.
    const z = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const planar = Math.sqrt(1 - z * z);
    // Cube root biases radii outward so density stays roughly uniform
    // by volume instead of clustering at the center.
    const radius = innerRadius + (outerRadius - innerRadius) * Math.cbrt(random());
    positions[i * 3] = planar * Math.cos(theta) * radius;
    positions[i * 3 + 1] = planar * Math.sin(theta) * radius;
    positions[i * 3 + 2] = z * radius;
  }
  return positions;
}

/**
 * Connects each node to its `neighborsPerNode` nearest neighbors,
 * de-duplicating symmetric pairs so each edge appears exactly once.
 */
export function buildNearestNeighborEdges(
  nodePositions: Float32Array,
  neighborsPerNode = 2,
): Array<[number, number]> {
  const nodeCount = nodePositions.length / 3;
  const edgeKeys = new Set<string>();
  const edges: Array<[number, number]> = [];

  for (let i = 0; i < nodeCount; i += 1) {
    // Compute squared distances from node i to every other node.
    const distances: Array<{ index: number; distSq: number }> = [];
    for (let j = 0; j < nodeCount; j += 1) {
      if (i === j) {
        continue;
      }
      const dx = (nodePositions[i * 3] ?? 0) - (nodePositions[j * 3] ?? 0);
      const dy = (nodePositions[i * 3 + 1] ?? 0) - (nodePositions[j * 3 + 1] ?? 0);
      const dz = (nodePositions[i * 3 + 2] ?? 0) - (nodePositions[j * 3 + 2] ?? 0);
      distances.push({ index: j, distSq: dx * dx + dy * dy + dz * dz });
    }
    // Sort ascending and keep the closest N as edges.
    distances.sort((a, b) => a.distSq - b.distSq);
    for (const { index } of distances.slice(0, neighborsPerNode)) {
      // Normalize the pair ordering so (a,b) and (b,a) share one key.
      const a = Math.min(i, index);
      const b = Math.max(i, index);
      const key = `${a}-${b}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

/**
 * Expands edge index pairs into flat line-segment vertex positions
 * (start xyz followed by end xyz for every edge).
 */
export function buildEdgePositions(
  nodePositions: Float32Array,
  edges: ReadonlyArray<readonly [number, number]>,
): Float32Array {
  const segmentPositions = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], edgeIndex) => {
    for (let axis = 0; axis < 3; axis += 1) {
      segmentPositions[edgeIndex * 6 + axis] = nodePositions[a * 3 + axis] ?? 0;
      segmentPositions[edgeIndex * 6 + 3 + axis] = nodePositions[b * 3 + axis] ?? 0;
    }
  });
  return segmentPositions;
}

/**
 * Generates the complete network graph used by the hero scene.
 *
 * @param nodeCount number of nodes in the constellation
 * @param seed PRNG seed; the same seed always yields the same graph
 */
export function generateNetworkGraph(nodeCount = 46, seed = 20260705): NetworkGraphData {
  const random = createRandom(seed);
  const nodePositions = generateNodePositions(nodeCount, random);
  const edges = buildNearestNeighborEdges(nodePositions);
  const edgePositions = buildEdgePositions(nodePositions, edges);
  return { nodePositions, edges, edgePositions };
}
