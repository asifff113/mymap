import type { PlaceResult } from '../types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'earthlike-map-demo/1.0 (+https://openstreetmap.org)';

interface NominatimEntry {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  category?: string;
  importance?: number;
  boundingbox?: [string, string, string, string];
}

const humanizeLabel = (entry: NominatimEntry): string => {
  if (entry.type) {
    return entry.type.replace(/_/g, ' ');
  }
  return 'Location';
};

export const searchPlaces = async (query: string): Promise<PlaceResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '1',
    polygon_geojson: '0',
    limit: '7'
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error('Unable to reach the OpenStreetMap directory.');
  }

  const payload: NominatimEntry[] = await response.json();

  return payload.map((entry) => ({
    id: String(entry.place_id),
    name: entry.display_name.split(',')[0] ?? humanizeLabel(entry),
    description: entry.display_name,
    lat: Number(entry.lat),
    lng: Number(entry.lon),
    boundingBox: entry.boundingbox
      ? [
          Number(entry.boundingbox[0]),
          Number(entry.boundingbox[1]),
          Number(entry.boundingbox[2]),
          Number(entry.boundingbox[3])
        ]
      : undefined
  }));
};
