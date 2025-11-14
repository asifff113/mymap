import type { LatLng } from '../types';

export interface Landmark {
  id: string;
  name: string;
  location: LatLng;
  modelUrl: string;
  scale: number;
  rotation: number;
  height: number;
}

export const FAMOUS_LANDMARKS: Landmark[] = [
  {
    id: 'empire-state',
    name: 'Empire State Building',
    location: { lat: 40.748817, lng: -73.985428 },
    modelUrl: '/models/skyscraper.glb',
    scale: 1.0,
    rotation: 0,
    height: 443
  },
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    location: { lat: 48.858370, lng: 2.294481 },
    modelUrl: '/models/tower.glb',
    scale: 1.0,
    rotation: 0,
    height: 330
  },
  {
    id: 'big-ben',
    name: 'Big Ben',
    location: { lat: 51.500729, lng: -0.124625 },
    modelUrl: '/models/clock-tower.glb',
    scale: 1.0,
    rotation: 0,
    height: 96
  },
  {
    id: 'burj-khalifa',
    name: 'Burj Khalifa',
    location: { lat: 25.197197, lng: 55.274376 },
    modelUrl: '/models/supertall.glb',
    scale: 1.0,
    rotation: 0,
    height: 828
  },
  {
    id: 'statue-liberty',
    name: 'Statue of Liberty',
    location: { lat: 40.689247, lng: -74.044502 },
    modelUrl: '/models/statue.glb',
    scale: 1.0,
    rotation: 0,
    height: 93
  },
  {
    id: 'sydney-opera',
    name: 'Sydney Opera House',
    location: { lat: -33.856784, lng: 151.215297 },
    modelUrl: '/models/opera.glb',
    scale: 1.0,
    rotation: 45,
    height: 65
  },
  {
    id: 'cn-tower',
    name: 'CN Tower',
    location: { lat: 43.642566, lng: -79.387057 },
    modelUrl: '/models/communications-tower.glb',
    scale: 1.0,
    rotation: 0,
    height: 553
  },
  {
    id: 'tokyo-tower',
    name: 'Tokyo Tower',
    location: { lat: 35.658581, lng: 139.745438 },
    modelUrl: '/models/lattice-tower.glb',
    scale: 1.0,
    rotation: 0,
    height: 333
  }
];

export function getLandmarksInBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Landmark[] {
  return FAMOUS_LANDMARKS.filter(
    (landmark) =>
      landmark.location.lat >= bounds.south &&
      landmark.location.lat <= bounds.north &&
      landmark.location.lng >= bounds.west &&
      landmark.location.lng <= bounds.east
  );
}

export function getNearbyLandmarks(center: LatLng, radiusKm: number = 100): Landmark[] {
  return FAMOUS_LANDMARKS.filter((landmark) => {
    const R = 6371;
    const dLat = ((landmark.location.lat - center.lat) * Math.PI) / 180;
    const dLng = ((landmark.location.lng - center.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((center.lat * Math.PI) / 180) *
        Math.cos((landmark.location.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusKm;
  });
}
