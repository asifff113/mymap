import { useEffect, useRef } from 'react';
import maplibregl, {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  ScaleControl
} from 'maplibre-gl';
import type { LatLng, MapStyleOption, PlaceResult, RouteSummary, ViewState } from '../types';

interface MapCanvasProps {
  viewState: ViewState;
  mapStyle: MapStyleOption;
  selectedPlace: PlaceResult | null;
  origin: PlaceResult | null;
  destination: PlaceResult | null;
  userLocation: LatLng | null;
  route: RouteSummary | null;
  isGlobeView: boolean;
  showBuildings: boolean;
  onViewStateChange: (view: ViewState) => void;
}

const ROUTE_SOURCE_ID = 'route-source';
const ROUTE_LAYER_ID = 'route-line';
const TERRAIN_SOURCE_ID = 'terrain-dem';
const SKY_LAYER_ID = 'atmosphere-sky';
const SATELLITE_SOURCE_ID = 'earth-blue-marble';
const SATELLITE_LAYER_ID = 'earth-blue-marble-layer';
const TERRAIN_TILESET_URL = 'https://demotiles.maplibre.org/tiles/terrain-tiles.json';
const SATELLITE_TILES =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg';
const SATELLITE_FADE_START = 2.2;
const SATELLITE_FADE_END = 5.5;
const BUILDING_LAYER_ID = 'custom-3d-buildings';
const BUILDING_SOURCE_LAYER = 'building';

const MapCanvas = ({
  viewState,
  mapStyle,
  selectedPlace,
  origin,
  destination,
  userLocation,
  route,
  isGlobeView,
  showBuildings,
  onViewStateChange
}: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const activeStyleUrl = useRef<string | null>(null);
  const initialView = useRef<ViewState>(viewState);
  const initialStyle = useRef<string>(mapStyle.url);
  const satelliteZoomHandler = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    // Globe interaction options
    const globeInteractionOptions = {
      dragPan: {
        inertia: 0.12, // lower inertia for easier globe spinning
        deceleration: 1800, // faster stop
        maxSpeed: 2400 // allow fast spins
      },
      dragRotate: true,
      scrollZoom: {
        speed: 1.2, // more responsive zoom
        around: 'center'
      },
      doubleClickZoom: true,
      touchZoomRotate: true,
      minZoom: 1.2,
      maxZoom: 14,
      minPitch: 0,
      maxPitch: 85,
      bearingSnap: 0,
      kinetic: true // enable kinetic rotation
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle.current,
      center: [initialView.current.lng, initialView.current.lat],
      zoom: initialView.current.zoom,
      pitch: initialView.current.pitch,
      bearing: initialView.current.bearing,
      attributionControl: true,
      ...globeInteractionOptions
    });

    mapRef.current = map;
    activeStyleUrl.current = mapStyle.url;
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

    const syncViewState = () => {
      const center = map.getCenter();
      onViewStateChange({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    };

    map.on('moveend', syncViewState);
    map.on('pitchend', syncViewState);
    map.on('rotateend', syncViewState);

    const resize = () => map.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (satelliteZoomHandler.current && mapRef.current) {
        mapRef.current.off('zoom', satelliteZoomHandler.current);
        satelliteZoomHandler.current = null;
      }
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, [onViewStateChange]);

  const withStyleReady = (callback: () => void) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (map.isStyleLoaded()) {
      callback();
      return;
    }

    const onceHandler = () => {
      map.off('styledata', onceHandler);
      callback();
    };

    map.on('styledata', onceHandler);
  };

  const updateMarker = (key: string, coordinates: LatLng | null, color: string) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const existing = markersRef.current[key];
    if (!coordinates) {
      existing?.remove();
      delete markersRef.current[key];
      return;
    }

    if (existing) {
      existing.setLngLat([coordinates.lng, coordinates.lat]);
      return;
    }

    markersRef.current[key] = new maplibregl.Marker({ color })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map);
  };

  const updateRouteLayer = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const sourceExists = Boolean(map.getSource(ROUTE_SOURCE_ID));
    if (!route) {
      if (sourceExists) {
        map.removeLayer(ROUTE_LAYER_ID);
        map.removeSource(ROUTE_SOURCE_ID);
      }
      return;
    }

    if (sourceExists) {
      const routeSource = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource;
      routeSource.setData(route.geometry);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: route.geometry
      });

      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.9
        }
      });
    }

    const coordinates = route.geometry.geometry.coordinates;
    if (coordinates && coordinates.length >= 2) {
      const bounds = coordinates.reduce(
        (acc, coord) => acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
      );
      map.fitBounds(bounds, { padding: 60, duration: 1200 });
    }
  };

  const ensureTerrain = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        url: TERRAIN_TILESET_URL,
        tileSize: 256,
        maxzoom: 14
      });
    }

    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: 1.2 });
  };

  const removeTerrain = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    map.setTerrain(undefined);
    if (map.getSource(TERRAIN_SOURCE_ID)) {
      map.removeSource(TERRAIN_SOURCE_ID);
    }
  };

  const ensureSkyLayer = () => {
    const map = mapRef.current;
    if (!map || map.getLayer(SKY_LAYER_ID)) {
      return;
    }

    map.addLayer({
      id: SKY_LAYER_ID,
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-color': 'rgba(15, 38, 64, 0.85)',
        'sky-atmosphere-halo-color': '#b3dafe',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 20
      }
    });
  };

  const removeSkyLayer = () => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SKY_LAYER_ID)) {
      return;
    }
    map.removeLayer(SKY_LAYER_ID);
  };

  const calculateSatelliteOpacity = (zoom: number) => {
    if (zoom <= SATELLITE_FADE_START) {
      return 0.95;
    }
    if (zoom >= SATELLITE_FADE_END) {
      return 0;
    }
    const t = (zoom - SATELLITE_FADE_START) / (SATELLITE_FADE_END - SATELLITE_FADE_START);
    return Number((0.95 * (1 - t)).toFixed(2));
  };

  const updateSatelliteOpacity = (zoom: number) => {
    const map = mapRef.current;
    if (!map || !map.getLayer(SATELLITE_LAYER_ID)) {
      return;
    }
    const opacity = calculateSatelliteOpacity(zoom);
    map.setPaintProperty(SATELLITE_LAYER_ID, 'raster-opacity', opacity);
  };

  const ensureSatelliteLayer = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (!map.getSource(SATELLITE_SOURCE_ID)) {
      map.addSource(SATELLITE_SOURCE_ID, {
        type: 'raster',
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: 8
      });
    }

    if (!map.getLayer(SATELLITE_LAYER_ID)) {
      const beforeId = map.getStyle().layers?.[0]?.id;
      map.addLayer(
        {
          id: SATELLITE_LAYER_ID,
          type: 'raster',
          source: SATELLITE_SOURCE_ID,
          minzoom: 0,
          maxzoom: 8,
          paint: {
            'raster-opacity': 0.95
          }
        },
        beforeId
      );
    }

    updateSatelliteOpacity(map.getZoom());

    if (!satelliteZoomHandler.current) {
      const handler = () => updateSatelliteOpacity(map.getZoom());
      satelliteZoomHandler.current = handler;
      map.on('zoom', handler);
    }
  };

  const removeSatelliteLayer = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (satelliteZoomHandler.current) {
      map.off('zoom', satelliteZoomHandler.current);
      satelliteZoomHandler.current = null;
    }

    if (map.getLayer(SATELLITE_LAYER_ID)) {
      map.removeLayer(SATELLITE_LAYER_ID);
    }

    if (map.getSource(SATELLITE_SOURCE_ID)) {
      map.removeSource(SATELLITE_SOURCE_ID);
    }
  };

  const findVectorSourceForBuildings = (): { sourceId: string; sourceLayer: string } | null => {
    const map = mapRef.current;
    if (!map) {
      return null;
    }

    const style = map.getStyle();
    if (!style?.sources) {
      return null;
    }

    if (style.sources.openmaptiles) {
      return { sourceId: 'openmaptiles', sourceLayer: BUILDING_SOURCE_LAYER };
    }
    if (style.sources.composite) {
      return { sourceId: 'composite', sourceLayer: BUILDING_SOURCE_LAYER };
    }

    const firstVectorSource = Object.entries(style.sources).find(([, source]) => source.type === 'vector');
    if (firstVectorSource) {
      return { sourceId: firstVectorSource[0], sourceLayer: BUILDING_SOURCE_LAYER };
    }

    return null;
  };

  const findLabelLayerId = (): string | undefined => {
    const map = mapRef.current;
    const style = map?.getStyle();
    return style?.layers?.find((layer) => layer.type === 'symbol')?.id;
  };

  const ensureBuildingLayer = () => {
    const map = mapRef.current;
    if (!map || !showBuildings) {
      return;
    }

    const sourceHint = findVectorSourceForBuildings();
    if (!sourceHint) {
      return;
    }

    if (map.getLayer(BUILDING_LAYER_ID)) {
      map.setLayoutProperty(BUILDING_LAYER_ID, 'visibility', 'visible');
    } else {
      const beforeLayerId = findLabelLayerId();
      map.addLayer(
        {
          id: BUILDING_LAYER_ID,
          type: 'fill-extrusion',
          source: sourceHint.sourceId,
          'source-layer': sourceHint.sourceLayer,
          minzoom: 12,
          paint: {
            'fill-extrusion-color': [
              'case',
              ['boolean', ['feature-state', 'highlight'], false],
              '#facc15',
              ['has', 'colour'],
              ['get', 'colour'],
              [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'height'], ['get', 'render_height'], 30],
                0,
                '#e2e8f0',
                60,
                '#cbd5f5',
                200,
                '#94a3b8',
                400,
                '#64748b'
              ]
            ],
            'fill-extrusion-height': [
              'case',
              ['has', 'render_height'],
              ['*', ['get', 'render_height'], 1.1],
              ['has', 'height'],
              ['*', ['get', 'height'], 1.05],
              35
            ],
            'fill-extrusion-base': [
              'case',
              ['has', 'render_min_height'],
              ['get', 'render_min_height'],
              ['has', 'min_height'],
              ['get', 'min_height'],
              0
            ],
            'fill-extrusion-opacity': 0.96,
            'fill-extrusion-vertical-gradient': true
          }
        },
        beforeLayerId
      );
    }

    map.setLight({
      anchor: 'map',
      color: 'hsl(0, 0%, 100%)',
      intensity: 0.6,
      position: [1.15, 180, 80]
    });
  };

  const removeBuildingLayer = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (map.getLayer(BUILDING_LAYER_ID)) {
      map.removeLayer(BUILDING_LAYER_ID);
    }
    map.setLight({});
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (activeStyleUrl.current === mapStyle.url) {
      return;
    }

    activeStyleUrl.current = mapStyle.url;
    map.setStyle(mapStyle.url);
  }, [mapStyle]);

  useEffect(() => {
    withStyleReady(() => updateMarker('selected', selectedPlace, '#2563eb'));
  }, [selectedPlace, mapStyle]);

  useEffect(() => {
    withStyleReady(() => updateMarker('origin', origin, '#0f766e'));
  }, [origin, mapStyle]);

  useEffect(() => {
    withStyleReady(() => updateMarker('destination', destination, '#dc2626'));
  }, [destination, mapStyle]);

  useEffect(() => {
    withStyleReady(() => updateMarker('you', userLocation, '#f59e0b'));
  }, [userLocation, mapStyle]);

  useEffect(() => {
    withStyleReady(updateRouteLayer);
  }, [route, mapStyle]);

  useEffect(() => {
    withStyleReady(() => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      if (isGlobeView) {
        map.setProjection({ type: 'globe' });
        ensureTerrain();
        ensureSkyLayer();
        ensureSatelliteLayer();
      } else {
        map.setProjection({ type: 'mercator' });
        removeSkyLayer();
        removeTerrain();
        removeSatelliteLayer();
      }
    });
  }, [isGlobeView, mapStyle]);

  useEffect(() => {
    withStyleReady(() => {
      if (showBuildings) {
        ensureBuildingLayer();
      } else {
        removeBuildingLayer();
      }
    });
  }, [showBuildings, mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const center = map.getCenter();
    const isSameCenter = Math.abs(center.lat - viewState.lat) < 0.0001 && Math.abs(center.lng - viewState.lng) < 0.0001;
    const isSameZoom = Math.abs(map.getZoom() - viewState.zoom) < 0.01;
    const isSamePitch = Math.abs(map.getPitch() - viewState.pitch) < 0.5;
    const isSameBearing = Math.abs(map.getBearing() - viewState.bearing) < 0.5;

    if (isSameCenter && isSameZoom && isSamePitch && isSameBearing) {
      return;
    }

    map.easeTo({
      center: [viewState.lng, viewState.lat],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
      duration: 800
    });
  }, [viewState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const padding = isGlobeView
      ? { top: 260, bottom: 0, left: 0, right: 0 }
      : { top: 0, bottom: 40, left: 0, right: 0 };

    map.setPadding(padding);
  }, [isGlobeView]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Interactive world map" />;
};

export default MapCanvas;
