import { useEffect, useRef } from 'react';
import maplibregl, { GeoJSONSource, Map as MapLibreMap, Marker, ScaleControl } from 'maplibre-gl';
import type {
  BoundingBox,
  BuildingHoverDetails,
  BuildingInfo,
  LatLng,
  MapStyleOption,
  PlaceResult,
  RouteSummary,
  ViewState
} from '../types';

interface MapCanvasProps {
  viewState: ViewState;
  mapStyle: MapStyleOption;
  selectedPlace: PlaceResult | null;
  origin: PlaceResult | null;
  destination: PlaceResult | null;
  userLocation: LatLng | null;
  geoAccuracy: number | null;
  route: RouteSummary | null;
  isGlobeView: boolean;
  showBuildings: boolean;
  buildingScale: number;
  timeOfDay: 'auto' | 'day' | 'night';
  shadowIntensity: number;
  isMeasuring: boolean;
  measurementPoints: LatLng[];
  animationProgress: number;
  searchResults: PlaceResult[];
  onViewStateChange: (view: ViewState) => void;
  onBuildingHover: (details: BuildingHoverDetails | null) => void;
  onMeasurementClick: (coords: LatLng) => void;
  onMapReady?: (canvas: HTMLCanvasElement | null) => void;
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
  geoAccuracy,
  route,
  isGlobeView,
  showBuildings,
  buildingScale,
  timeOfDay,
  shadowIntensity,
  isMeasuring,
  measurementPoints,
  animationProgress,
  searchResults,
  onViewStateChange,
  onBuildingHover,
  onMeasurementClick,
  onMapReady
}: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const activeStyleUrl = useRef<string | null>(null);
  const initialView = useRef<ViewState>(viewState);
  const initialStyle = useRef<string>(mapStyle.url);
  const satelliteZoomHandler = useRef<(() => void) | null>(null);
  const sunAnimationRef = useRef<number | null>(null);
  const hoveredBuildingRef = useRef<{ source: string; sourceLayer?: string; id: string | number } | null>(null);
  const lastHoverDetails = useRef<BuildingHoverDetails | null>(null);

  const emitBuildingHover = (details: BuildingHoverDetails | null) => {
    const previous = lastHoverDetails.current;
    if (
      previous &&
      details &&
      previous.building.name === details.building.name &&
      previous.building.height === details.building.height &&
      previous.position.x === details.position.x &&
      previous.position.y === details.position.y
    ) {
      return;
    }
    lastHoverDetails.current = details;
    onBuildingHover(details);
  };

  const toBoundingBox = (bounds: maplibregl.LngLatBounds): BoundingBox => [
    bounds.getSouth(),
    bounds.getNorth(),
    bounds.getWest(),
    bounds.getEast()
  ];

  const parseNumberValue = (value: unknown): number | undefined => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const extractBuildingInfo = (feature: maplibregl.MapboxGeoJSONFeature): BuildingInfo | null => {
    if (!feature?.properties) {
      return null;
    }
    const properties = feature.properties as Record<string, unknown>;
    const address =
      (properties['addr:full'] as string) ??
      [properties['addr:housenumber'], properties['addr:street']]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      (properties['addr:city'] as string);

    const info: BuildingInfo = {
      name: (properties.name as string) ?? (properties['addr:housename'] as string),
      height: parseNumberValue(properties.render_height ?? properties.height),
      levels: parseNumberValue(properties['building:levels']),
      type: (properties.type as string) ?? (properties['building'] as string),
      address
    };

    if (!info.name && !info.height && !info.levels && !info.type && !info.address) {
      return null;
    }

    return info;
  };

  const clearHighlightedBuilding = () => {
    const map = mapRef.current;
    if (!map || !hoveredBuildingRef.current) {
      emitBuildingHover(null);
      return;
    }
    const target = hoveredBuildingRef.current;
    map.setFeatureState({ source: target.source, sourceLayer: target.sourceLayer, id: target.id }, { highlight: false });
    hoveredBuildingRef.current = null;
    emitBuildingHover(null);
  };

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
    startSunAnimation();

    const syncViewState = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      onViewStateChange({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        bounds: toBoundingBox(bounds)
      });
    };

    map.on('moveend', syncViewState);
    map.on('pitchend', syncViewState);
    map.on('rotateend', syncViewState);

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      if (isMeasuring) {
        onMeasurementClick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      }
    };

    map.on('click', handleMapClick);

    // Notify parent of canvas availability for screenshots
    map.once('load', () => {
      const canvas = map.getCanvas();
      onMapReady?.(canvas);
    });

    const resize = () => map.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (satelliteZoomHandler.current && mapRef.current) {
        mapRef.current.off('zoom', satelliteZoomHandler.current);
        satelliteZoomHandler.current = null;
      }
      if (sunAnimationRef.current) {
        cancelAnimationFrame(sunAnimationRef.current);
        sunAnimationRef.current = null;
      }
      clearHighlightedBuilding();
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
          'line-color': '#94a3b8',
          'line-width': 4,
          'line-opacity': 0.4
        }
      });

      map.addLayer({
        id: `${ROUTE_LAYER_ID}-animated`,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#2563eb',
          'line-width': 5,
          'line-opacity': 0.9
        }
      });
    }

    const coordinates = route.geometry.geometry.coordinates;
    if (coordinates && coordinates.length >= 2 && animationProgress === 0) {
      const bounds = coordinates.reduce(
        (acc, coord) => acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
      );
      map.fitBounds(bounds, { padding: 60, duration: 1200 });
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || animationProgress === 0) {
      return;
    }

    const animatedLayerId = `${ROUTE_LAYER_ID}-animated`;
    if (!map.getLayer(animatedLayerId)) {
      return;
    }

    const coordinates = route.geometry.geometry.coordinates;
    if (!coordinates || coordinates.length === 0) {
      return;
    }

    const cutoffIndex = Math.floor((animationProgress / 100) * coordinates.length);
    const animatedCoords = coordinates.slice(0, Math.max(1, cutoffIndex));

    const animatedGeometry: typeof route.geometry = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: animatedCoords
      },
      properties: {}
    };

    const source = map.getSource(`${ROUTE_SOURCE_ID}-animated`) as GeoJSONSource | undefined;
    if (source) {
      source.setData(animatedGeometry);
    } else if (map.getSource(ROUTE_SOURCE_ID)) {
      map.addSource(`${ROUTE_SOURCE_ID}-animated`, {
        type: 'geojson',
        data: animatedGeometry
      });
      map.addLayer({
        id: animatedLayerId,
        type: 'line',
        source: `${ROUTE_SOURCE_ID}-animated`,
        paint: {
          'line-color': '#2563eb',
          'line-width': 5,
          'line-opacity': 0.9
        }
      });
    }
  }, [animationProgress, route]);

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

    // Sync terrain exaggeration with building scale
    const terrainExaggeration = 1.5 * buildingScale;
    map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration: terrainExaggeration });
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

  // Note: setFog is not available in MapLibre GL, removed for compatibility

  const startSunAnimation = () => {
    const animate = (time: number) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) {
        return;
      }

      // Determine time based on mode
      let hour;
      if (timeOfDay === 'day') {
        hour = 12;
      } else if (timeOfDay === 'night') {
        hour = 0;
      } else {
        // Auto mode uses current time or animation
        const cycleMs = 30000;
        const progress = (time % cycleMs) / cycleMs;
        hour = progress * 24;
      }

      const azimuth = ((hour - 6) / 12) * 180;
      const polar = hour < 6 || hour > 18 ? 30 : 70;
      const baseIntensity = hour < 6 || hour > 18 ? 0.3 : 0.7;
      const intensity = baseIntensity * shadowIntensity;

      map.setLight({
        anchor: 'viewport',
        color: hour < 7 || hour > 19 ? 'hsl(28, 100%, 74%)' : 'hsl(0, 0%, 100%)',
        intensity,
        position: [1.15, azimuth, polar]
      });
      sunAnimationRef.current = requestAnimationFrame(animate);
    };

    if (sunAnimationRef.current) {
      cancelAnimationFrame(sunAnimationRef.current);
    }

    sunAnimationRef.current = requestAnimationFrame(animate);
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

  const baseBuildingHeightExpression = () => [
    'case',
    ['has', 'render_height'],
    ['get', 'render_height'],
    ['has', 'height'],
    ['get', 'height'],
    ['has', 'building:levels'],
    ['*', ['get', 'building:levels'], 4],
    40
  ];

  const scaledBuildingHeightExpression = () => [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0,
    10.5,
    ['*', baseBuildingHeightExpression(), buildingScale]
  ];

  const ensureBuildingLayer = () => {
    const map = mapRef.current;
    if (!map || !showBuildings) {
      return;
    }

    const sourceHint = findVectorSourceForBuildings();
    if (!sourceHint) {
      return;
    }

    const buildingHeightExpr = scaledBuildingHeightExpression();

    if (map.getLayer(BUILDING_LAYER_ID)) {
      map.setLayoutProperty(BUILDING_LAYER_ID, 'visibility', 'visible');
      map.setPaintProperty(BUILDING_LAYER_ID, 'fill-extrusion-height', buildingHeightExpr);
    } else {
      const beforeLayerId = findLabelLayerId();
      map.addLayer(
        {
          id: BUILDING_LAYER_ID,
          type: 'fill-extrusion',
          source: sourceHint.sourceId,
          'source-layer': sourceHint.sourceLayer,
          minzoom: 10,
          filter: ['all', ['!=', ['get', 'type'], 'roof']],
          paint: {
            'fill-extrusion-color': [
              'case',
              ['boolean', ['feature-state', 'highlight'], false],
              '#facc15',
              ['has', 'colour'],
              ['get', 'colour'],
              [
                'interpolate',
                ['exponential', 1.5],
                ['coalesce', ['get', 'height'], ['get', 'render_height'], 30],
                0,
                '#f1f5f9',
                50,
                '#e0e7ef',
                100,
                '#cbd5e1',
                200,
                '#94a3b8',
                400,
                '#64748b',
                600,
                '#475569'
              ]
            ],
            'fill-extrusion-height': buildingHeightExpr,
            'fill-extrusion-base': [
              'case',
              ['has', 'render_min_height'],
              ['get', 'render_min_height'],
              ['has', 'min_height'],
              ['get', 'min_height'],
              0
            ],
            'fill-extrusion-opacity': 0.97,
            'fill-extrusion-vertical-gradient': true,
            'fill-extrusion-ambient-occlusion-intensity': 0.55,
            'fill-extrusion-ambient-occlusion-radius': 8
          }
        },
        beforeLayerId
      );
    }

  };

  const removeBuildingLayer = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (map.getLayer(BUILDING_LAYER_ID)) {
      map.removeLayer(BUILDING_LAYER_ID);
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (activeStyleUrl.current === mapStyle.url) {
      return;
    }

    const prevStyle = activeStyleUrl.current;
    activeStyleUrl.current = mapStyle.url;
    
    try {
      map.setStyle(mapStyle.url);
    } catch (error) {
      console.error('Failed to set map style:', error);
      activeStyleUrl.current = prevStyle;
    }
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
    const map = mapRef.current;
    if (!map || searchResults.length === 0) {
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith('search-') || key.startsWith('cluster-')) {
          markersRef.current[key].remove();
          delete markersRef.current[key];
        }
      });
      return;
    }

    const { clusterPlaces, isCluster } = require('../lib/clustering');
    const clustered = clusterPlaces(searchResults, viewState.zoom);

    const currentKeys = new Set(Object.keys(markersRef.current).filter((k) => k.startsWith('search-') || k.startsWith('cluster-')));

    clustered.forEach((item) => {
      if (isCluster(item)) {
        const key = item.id;
        currentKeys.delete(key);

        const existing = markersRef.current[key];
        if (existing) {
          existing.setLngLat([item.center.lng, item.center.lat]);
        } else {
          const el = document.createElement('div');
          el.className = 'cluster-marker';
          el.textContent = String(item.count);
          el.style.width = '36px';
          el.style.height = '36px';
          el.style.borderRadius = '50%';
          el.style.background = '#3b82f6';
          el.style.color = 'white';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontWeight = '700';
          el.style.fontSize = '14px';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';

          markersRef.current[key] = new maplibregl.Marker({ element: el })
            .setLngLat([item.center.lng, item.center.lat])
            .addTo(map);
        }
      } else {
        const key = `search-${item.id}`;
        currentKeys.delete(key);

        const existing = markersRef.current[key];
        if (existing) {
          existing.setLngLat([item.lng, item.lat]);
        } else {
          markersRef.current[key] = new maplibregl.Marker({ color: '#6366f1', scale: 0.8 })
            .setLngLat([item.lng, item.lat])
            .addTo(map);
        }
      }
    });

    currentKeys.forEach((key) => {
      markersRef.current[key].remove();
      delete markersRef.current[key];
    });
  }, [searchResults, viewState.zoom, mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || !geoAccuracy) {
      if (map?.getSource('accuracy-circle')) {
        map.removeLayer('accuracy-circle-fill');
        map.removeLayer('accuracy-circle-border');
        map.removeSource('accuracy-circle');
      }
      return;
    }

    const createCircle = (center: [number, number], radiusInMeters: number, points = 64) => {
      const coords: number[][] = [];
      const distanceX = radiusInMeters / (111320 * Math.cos((center[1] * Math.PI) / 180));
      const distanceY = radiusInMeters / 110540;

      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        coords.push([center[0] + x, center[1] + y]);
      }
      return coords;
    };

    const circleCoords = createCircle([userLocation.lng, userLocation.lat], geoAccuracy);

    const circleGeoJSON = {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [circleCoords]
      },
      properties: {}
    };

    if (map.getSource('accuracy-circle')) {
      (map.getSource('accuracy-circle') as GeoJSONSource).setData(circleGeoJSON);
    } else {
      map.addSource('accuracy-circle', {
        type: 'geojson',
        data: circleGeoJSON
      });

      map.addLayer({
        id: 'accuracy-circle-fill',
        type: 'fill',
        source: 'accuracy-circle',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.15
        }
      });

      map.addLayer({
        id: 'accuracy-circle-border',
        type: 'line',
        source: 'accuracy-circle',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2,
          'line-opacity': 0.6
        }
      });
    }
  }, [userLocation, geoAccuracy]);

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
  }, [isGlobeView, mapStyle, buildingScale]);

  useEffect(() => {
    if (showBuildings) {
      withStyleReady(() => startSunAnimation());
    }
  }, [mapStyle, isGlobeView, timeOfDay, shadowIntensity, showBuildings]);

  useEffect(() => {
    withStyleReady(() => {
      if (showBuildings) {
        ensureBuildingLayer();
      } else {
        removeBuildingLayer();
      }
    });
  }, [showBuildings, mapStyle, buildingScale, shadowIntensity, timeOfDay]);

  useEffect(() => {
    if (!showBuildings) {
      return;
    }
    withStyleReady(() => {
      const map = mapRef.current;
      if (!map || !map.getLayer(BUILDING_LAYER_ID)) {
        ensureBuildingLayer();
        return;
      }
      map.setPaintProperty(BUILDING_LAYER_ID, 'fill-extrusion-height', scaledBuildingHeightExpression());
    });
  }, [buildingScale, showBuildings]);

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

    const duration = viewState.transition?.duration ?? (showBuildings ? 1500 : 900);
    const curve = viewState.transition?.curve ?? (showBuildings ? 1.5 : 1.2);

    map.easeTo({
      center: [viewState.lng, viewState.lat],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
      duration,
      curve,
      easing: (t) => t * t * (3 - 2 * t),
      essential: true
    });
  }, [viewState, showBuildings]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showBuildings) {
      clearHighlightedBuilding();
      return;
    }

    const handleMove = (event: maplibregl.MapMouseEvent & maplibregl.EventData) => {
      const feature = event.features?.[0];
      if (!feature || feature.id === undefined) {
        clearHighlightedBuilding();
        return;
      }

      const target = {
        source: (feature as any).source,
        sourceLayer: (feature as any)['sourceLayer'] ?? BUILDING_SOURCE_LAYER,
        id: feature.id as string | number
      };

      if (
        hoveredBuildingRef.current &&
        hoveredBuildingRef.current.id === target.id &&
        hoveredBuildingRef.current.source === target.source
      ) {
        return;
      }

      clearHighlightedBuilding();
      hoveredBuildingRef.current = target;
      map.setFeatureState(
        { source: target.source, sourceLayer: target.sourceLayer, id: target.id },
        { highlight: true }
      );
      const info = extractBuildingInfo(feature);
      if (info) {
        emitBuildingHover({
          building: info,
          position: { x: event.point.x, y: event.point.y }
        });
      } else {
        emitBuildingHover(null);
      }
    };

    const handleLeave = () => {
      clearHighlightedBuilding();
      emitBuildingHover(null);
    };

    let listenersBound = false;

    const bindHoverListeners = () => {
      if (listenersBound || !map.getLayer(BUILDING_LAYER_ID)) {
        return;
      }
      map.on('mousemove', BUILDING_LAYER_ID, handleMove);
      map.on('mouseleave', BUILDING_LAYER_ID, handleLeave);
      listenersBound = true;
    };

    bindHoverListeners();

    const waitForLayer = () => {
      bindHoverListeners();
      if (listenersBound) {
        map.off('styledata', waitForLayer);
      }
    };

    if (!listenersBound) {
      map.on('styledata', waitForLayer);
    }

    return () => {
      if (listenersBound) {
        map.off('mousemove', BUILDING_LAYER_ID, handleMove);
        map.off('mouseleave', BUILDING_LAYER_ID, handleLeave);
      } else {
        map.off('styledata', waitForLayer);
      }
      clearHighlightedBuilding();
      emitBuildingHover(null);
    };
  }, [showBuildings, onBuildingHover]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const MEASUREMENT_SOURCE_ID = 'measurement-source';
    const MEASUREMENT_LINE_ID = 'measurement-line';
    const MEASUREMENT_POINTS_ID = 'measurement-points';

    if (measurementPoints.length > 0) {
      const lineCoordinates = measurementPoints.map((p) => [p.lng, p.lat]);

      const geoJsonData = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: lineCoordinates
            },
            properties: {}
          }
        ]
      };

      if (map.getSource(MEASUREMENT_SOURCE_ID)) {
        (map.getSource(MEASUREMENT_SOURCE_ID) as GeoJSONSource).setData(geoJsonData);
      } else {
        map.addSource(MEASUREMENT_SOURCE_ID, {
          type: 'geojson',
          data: geoJsonData
        });
      }

      if (!map.getLayer(MEASUREMENT_LINE_ID)) {
        map.addLayer({
          id: MEASUREMENT_LINE_ID,
          type: 'line',
          source: MEASUREMENT_SOURCE_ID,
          paint: {
            'line-color': '#f59e0b',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        });
      }

      if (!map.getLayer(MEASUREMENT_POINTS_ID)) {
        map.addLayer({
          id: MEASUREMENT_POINTS_ID,
          type: 'circle',
          source: MEASUREMENT_SOURCE_ID,
          paint: {
            'circle-radius': 6,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        });
      }

      markersRef.current['measurement-markers']?.remove();
      delete markersRef.current['measurement-markers'];
    } else {
      if (map.getLayer(MEASUREMENT_POINTS_ID)) {
        map.removeLayer(MEASUREMENT_POINTS_ID);
      }
      if (map.getLayer(MEASUREMENT_LINE_ID)) {
        map.removeLayer(MEASUREMENT_LINE_ID);
      }
      if (map.getSource(MEASUREMENT_SOURCE_ID)) {
        map.removeSource(MEASUREMENT_SOURCE_ID);
      }
    }
  }, [measurementPoints]);

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Interactive world map" />;
};

export default MapCanvas;
