// DBSCAN clustering implementation in TypeScript
// Groups reports by proximity and time

interface Point {
  id: number;
  lat: number;
  lng: number;
  createdAt: Date;
}

interface ClusterResult {
  clusterId: number;
  points: number[];
  centerLat: number;
  centerLng: number;
  isRecurring: boolean;
}

const EARTH_RADIUS_KM = 6371;

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c * 1000; // return meters
}

export function runDBSCAN(
  points: Point[],
  epsilonMeters = 300, // 300m radius
  minPoints = 2,
  maxDaysWindow = 14
): ClusterResult[] {
  const now = new Date();
  const windowMs = maxDaysWindow * 24 * 60 * 60 * 1000;

  // Filter to points within time window
  const recentPoints = points.filter(
    (p) => now.getTime() - new Date(p.createdAt).getTime() <= windowMs
  );

  const visited = new Set<number>();
  const clusterId = new Map<number, number>();
  let currentCluster = 0;

  function getNeighbors(point: Point): Point[] {
    return recentPoints.filter(
      (other) =>
        other.id !== point.id &&
        haversineDistance(point.lat, point.lng, other.lat, other.lng) <=
          epsilonMeters
    );
  }

  function expandCluster(point: Point, neighbors: Point[], cluster: number) {
    clusterId.set(point.id, cluster);
    let queue = [...neighbors];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!visited.has(current.id)) {
        visited.add(current.id);
        const currentNeighbors = getNeighbors(current);
        if (currentNeighbors.length >= minPoints) {
          queue = [...queue, ...currentNeighbors];
        }
      }
      if (!clusterId.has(current.id)) {
        clusterId.set(current.id, cluster);
      }
    }
  }

  for (const point of recentPoints) {
    if (visited.has(point.id)) continue;
    visited.add(point.id);
    const neighbors = getNeighbors(point);

    if (neighbors.length < minPoints) {
      clusterId.set(point.id, -1); // noise
    } else {
      currentCluster++;
      expandCluster(point, neighbors, currentCluster);
    }
  }

  // Build cluster results
  const clusterMap = new Map<number, number[]>();
  for (const [pointId, cid] of clusterId.entries()) {
    if (cid === -1) continue;
    if (!clusterMap.has(cid)) clusterMap.set(cid, []);
    clusterMap.get(cid)!.push(pointId);
  }

  const results: ClusterResult[] = [];
  for (const [cid, pointIds] of clusterMap.entries()) {
    const clusterPoints = recentPoints.filter((p) => pointIds.includes(p.id));
    const centerLat =
      clusterPoints.reduce((s, p) => s + p.lat, 0) / clusterPoints.length;
    const centerLng =
      clusterPoints.reduce((s, p) => s + p.lng, 0) / clusterPoints.length;
    results.push({
      clusterId: cid,
      points: pointIds,
      centerLat,
      centerLng,
      isRecurring: pointIds.length >= 3, // 3+ reports = recurring hotspot
    });
  }

  return results;
}

// Nearest-neighbor route optimization (TSP heuristic)
export function optimizeRoute(
  points: Array<{ id: number; lat: number; lng: number }>
): number[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0].id];

  const visited = new Set<number>();
  const route: number[] = [];
  let current = points[0];
  visited.add(current.id);
  route.push(current.id);

  while (route.length < points.length) {
    let nearest: (typeof points)[0] | null = null;
    let minDist = Infinity;

    for (const point of points) {
      if (visited.has(point.id)) continue;
      const dist = haversineDistance(
        current.lat,
        current.lng,
        point.lat,
        point.lng
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }

    if (!nearest) break;
    visited.add(nearest.id);
    route.push(nearest.id);
    current = nearest;
  }

  return route;
}
