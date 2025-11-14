import type { LatLng, PlaceResult } from '../types';

interface ClusterPoint {
  place: PlaceResult;
  x: number;
  y: number;
}

export interface Cluster {
  id: string;
  center: LatLng;
  places: PlaceResult[];
  count: number;
}

const CLUSTER_RADIUS = 60; // pixels

const latLngToPixel = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const scale = 256 * Math.pow(2, zoom);
  const x = (lng + 180) / 360 * scale;
  const y = (1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2 * scale;
  return { x, y };
};

const pixelDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const clusterPlaces = (places: PlaceResult[], zoom: number): (Cluster | PlaceResult)[] => {
  if (places.length === 0 || zoom >= 15) {
    return places;
  }

  const points: ClusterPoint[] = places.map((place) => {
    const { x, y } = latLngToPixel(place.lat, place.lng, zoom);
    return { place, x, y };
  });

  const clusters: Cluster[] = [];
  const used = new Set<number>();

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) {
      continue;
    }

    const clusterPoints: ClusterPoint[] = [points[i]];
    used.add(i);

    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) {
        continue;
      }

      if (pixelDistance(points[i], points[j]) < CLUSTER_RADIUS) {
        clusterPoints.push(points[j]);
        used.add(j);
      }
    }

    if (clusterPoints.length > 1) {
      const avgLat = clusterPoints.reduce((sum, p) => sum + p.place.lat, 0) / clusterPoints.length;
      const avgLng = clusterPoints.reduce((sum, p) => sum + p.place.lng, 0) / clusterPoints.length;

      clusters.push({
        id: `cluster-${i}`,
        center: { lat: avgLat, lng: avgLng },
        places: clusterPoints.map((p) => p.place),
        count: clusterPoints.length
      });
    }
  }

  const result: (Cluster | PlaceResult)[] = [...clusters];
  for (let i = 0; i < points.length; i++) {
    if (!used.has(i)) {
      result.push(points[i].place);
    }
  }

  return result;
};

export const isCluster = (item: Cluster | PlaceResult): item is Cluster => {
  return 'count' in item && 'places' in item;
};
