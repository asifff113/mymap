import type { Feature, LineString } from 'geojson';

export type LatLng = {
  lat: number;
  lng: number;
};

export type BoundingBox = [south: number, north: number, west: number, east: number];

export interface PlaceResult extends LatLng {
  id: string;
  name: string;
  description: string;
  boundingBox?: BoundingBox;
}

export interface RouteSummary {
  id: string;
  distance: number; // meters
  duration: number; // seconds
  geometry: Feature<LineString>;
}

export interface ViewState extends LatLng {
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapStyleOption {
  id: string;
  label: string;
  description: string;
  url: string;
}

export type WaypointRole = 'origin' | 'destination';

export type RouteProfile = 'driving' | 'walking' | 'cycling';
