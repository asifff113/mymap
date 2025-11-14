import type { LatLng } from '../types';

export type HeatmapLayer = 'none' | 'traffic' | 'weather' | 'population';

export interface HeatmapPoint {
  location: LatLng;
  intensity: number;
}

// Generate synthetic heatmap data for demonstration
function generateGridPoints(
  bounds: { north: number; south: number; east: number; west: number },
  density: number
): LatLng[] {
  const points: LatLng[] = [];
  const latStep = (bounds.north - bounds.south) / density;
  const lngStep = (bounds.east - bounds.west) / density;

  for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
    for (let lng = bounds.west; lng <= bounds.east; lng += lngStep) {
      points.push({ lat, lng });
    }
  }

  return points;
}

export function generateTrafficHeatmap(
  bounds: { north: number; south: number; east: number; west: number }
): HeatmapPoint[] {
  const gridPoints = generateGridPoints(bounds, 15);

  return gridPoints.map((point) => {
    // Higher traffic near city centers (simulated)
    const cityFactor = Math.sin(point.lng * 10) * Math.cos(point.lat * 10);
    const randomFactor = Math.random() * 0.3;
    const intensity = Math.max(0, Math.min(1, cityFactor * 0.5 + 0.5 + randomFactor));

    return {
      location: point,
      intensity
    };
  });
}

export function generateWeatherHeatmap(
  bounds: { north: number; south: number; east: number; west: number }
): HeatmapPoint[] {
  const gridPoints = generateGridPoints(bounds, 12);

  return gridPoints.map((point) => {
    // Temperature gradient from equator
    const latitudeFactor = Math.abs(point.lat) / 90;
    const waveFactor = Math.sin(point.lng * 5) * 0.2;
    const intensity = Math.max(0, Math.min(1, 1 - latitudeFactor + waveFactor));

    return {
      location: point,
      intensity
    };
  });
}

export function generatePopulationHeatmap(
  bounds: { north: number; south: number; east: number; west: number }
): HeatmapPoint[] {
  const gridPoints = generateGridPoints(bounds, 20);

  return gridPoints.map((point) => {
    // Cluster-based population (simulated cities)
    const cluster1 = Math.exp(-((point.lat - bounds.north * 0.6) ** 2 + (point.lng - bounds.west * 0.4) ** 2) * 50);
    const cluster2 = Math.exp(-((point.lat - bounds.south * 0.7) ** 2 + (point.lng - bounds.east * 0.6) ** 2) * 50);
    const cluster3 = Math.exp(-((point.lat - (bounds.north + bounds.south) / 2) ** 2 + (point.lng - (bounds.east + bounds.west) / 2) ** 2) * 40);
    
    const intensity = Math.max(0, Math.min(1, cluster1 + cluster2 + cluster3 + Math.random() * 0.2));

    return {
      location: point,
      intensity
    };
  });
}

export function getHeatmapData(
  layer: HeatmapLayer,
  bounds: { north: number; south: number; east: number; west: number }
): HeatmapPoint[] {
  switch (layer) {
    case 'traffic':
      return generateTrafficHeatmap(bounds);
    case 'weather':
      return generateWeatherHeatmap(bounds);
    case 'population':
      return generatePopulationHeatmap(bounds);
    default:
      return [];
  }
}
