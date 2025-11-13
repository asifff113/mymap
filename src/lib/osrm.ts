import type { Feature, LineString } from 'geojson';
import type { LatLng, RouteSummary } from '../types';

const OSRM_BASE = 'https://router.project-osrm.org';

type OSRMRoute = {
  distance: number;
  duration: number;
  geometry: LineString;
};

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

export const requestRoute = async (origin: LatLng, destination: LatLng): Promise<RouteSummary> => {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false'
  });

  const response = await fetch(`${OSRM_BASE}/route/v1/driving/${coordinates}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch a route right now.');
  }

  const payload: OSRMResponse = await response.json();
  if (payload.code !== 'Ok' || !payload.routes.length) {
    throw new Error('No matching route found. Try a different pair of points.');
  }

  const [route] = payload.routes;
  const feature: Feature<LineString> = {
    type: 'Feature',
    geometry: route.geometry,
    properties: {}
  };

  return {
    id: `${Date.now()}`,
    distance: route.distance,
    duration: route.duration,
    geometry: feature
  };
};
