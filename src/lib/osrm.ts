import type { Feature, LineString } from 'geojson';
import type { LatLng, RouteProfile, RouteSummary, RouteStep } from '../types';

const OSRM_BASE = 'https://router.project-osrm.org';

type OSRMStep = {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    instruction?: string;
    type: string;
    modifier?: string;
  };
};

type OSRMLeg = {
  distance: number;
  duration: number;
  steps: OSRMStep[];
};

interface OSRMRoute {
  distance: number;
  duration: number;
  geometry: LineString;
  legs: OSRMLeg[];
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

const buildInstruction = (step: OSRMStep): string => {
  if (step.maneuver?.instruction) {
    return step.maneuver.instruction;
  }
  const parts = [step.maneuver?.type];
  if (step.name) {
    parts.push(`onto ${step.name}`);
  }
  return parts.filter(Boolean).join(' ') || 'Continue';
};

export const requestRoutes = async (
  origin: LatLng,
  destination: LatLng,
  profile: RouteProfile = 'driving'
): Promise<RouteSummary[]> => {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    alternatives: '3'
  });

  const response = await fetch(`${OSRM_BASE}/route/v1/${profile}/${coordinates}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch a route right now.');
  }

  const payload: OSRMResponse = await response.json();
  if (payload.code !== 'Ok' || !payload.routes.length) {
    throw new Error('No matching route found. Try a different pair of points.');
  }

  return payload.routes.map((route, index) => {
    const feature: Feature<LineString> = {
      type: 'Feature',
      geometry: route.geometry,
      properties: {}
    };

    const steps: RouteStep[] =
      route.legs?.flatMap((leg) =>
        (leg.steps ?? []).map((step) => ({
          instruction: buildInstruction(step),
          name: step.name,
          distance: step.distance,
          duration: step.duration
        }))
      ) ?? [];

    return {
      id: `${Date.now()}-${index}`,
      distance: route.distance,
      duration: route.duration,
      geometry: feature,
      steps,
      isAlternate: index > 0
    };
  });
};
