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

export interface RouteStep {
  instruction: string;
  name: string;
  distance: number;
  duration: number;
}

export interface RouteSummary {
  id: string;
  distance: number; // meters
  duration: number; // seconds
  geometry: Feature<LineString>;
  steps?: RouteStep[];
  isAlternate?: boolean;
}

export interface CameraTransition {
  duration?: number;
  curve?: number;
}

export interface ViewState extends LatLng {
  zoom: number;
  pitch: number;
  bearing: number;
  transition?: CameraTransition;
  bounds?: BoundingBox;
}

export interface MapStyleOption {
  id: string;
  label: string;
  description: string;
  url: string;
}

export type WaypointRole = 'origin' | 'destination';

export type RouteProfile = 'driving' | 'walking' | 'cycling';

export interface ScreenPosition {
  x: number;
  y: number;
}

export interface BuildingInfo {
  name?: string;
  height?: number;
  levels?: number;
  type?: string;
  address?: string;
}

export interface BuildingHoverDetails {
  building: BuildingInfo;
  position: ScreenPosition;
}
