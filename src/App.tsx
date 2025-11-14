import { useCallback, useEffect, useMemo, useState } from 'react';
import MapCanvas from './components/MapCanvas';
import SearchPanel from './components/SearchPanel';
import RoutePlanner from './components/RoutePlanner';
import ControlPanel from './components/ControlPanel';
import FloatingControls from './components/FloatingControls';
import Minimap from './components/Minimap';
import BuildingInfoPopup from './components/BuildingInfoPopup';
import MeasurementTool from './components/MeasurementTool';
import RouteAnimation from './components/RouteAnimation';
import GeoLocationControl from './components/GeoLocationControl';
import ExportControls from './components/ExportControls';
import DrawingTools from './components/DrawingTools';
import OfflineControls from './components/OfflineControls';
import LandmarkControls from './components/LandmarkControls';
import { requestRoutes } from './lib/osrm';
import { getNearbyLandmarks, type Landmark } from './lib/landmarks';
import { exportAsGPX, exportAsGeoJSON, printDirections } from './lib/export';
import { getCacheSize, clearCache, downloadAreaTiles, MAX_CACHE_SIZE } from './lib/tileCache';
import type {
  BuildingHoverDetails,
  DrawingMode,
  DrawingShape,
  LatLng,
  MapStyleOption,
  PlaceResult,
  RouteProfile,
  RouteSummary,
  ViewState,
  WaypointRole
} from './types';

const MAP_STYLES: MapStyleOption[] = [
  {
    id: 'streets',
    label: 'Vector',
    description: 'Default vector tiles',
    url: 'https://demotiles.maplibre.org/style.json'
  },
  {
    id: 'outdoors',
    label: 'Terrain',
    description: 'Open source hillshades',
    url: 'https://tiles.openfreemap.org/styles/liberty'
  }
];

const INITIAL_VIEW: ViewState = {
  lat: 40.758,
  lng: -73.985,
  zoom: 3.5,
  pitch: 0,
  bearing: 0
};

const TOUR_STOPS: Array<{
  id: string;
  label: string;
  description: string;
  view: Pick<ViewState, 'lat' | 'lng' | 'zoom' | 'pitch' | 'bearing'>;
}> = [
  {
    id: 'midtown',
    label: 'Midtown NYC',
    description: 'Classic skyscraper canyon flyover.',
    view: { lat: 40.754, lng: -73.984, zoom: 16.2, pitch: 72, bearing: 28 }
  },
  {
    id: 'tokyo',
    label: 'Tokyo Skyline',
    description: 'Sweep across Shinjuku towers.',
    view: { lat: 35.6938, lng: 139.7034, zoom: 16.5, pitch: 75, bearing: 120 }
  },
  {
    id: 'andes',
    label: 'Andes Ridge',
    description: 'Tilt across the Peruvian Andes with rich terrain.',
    view: { lat: -13.532, lng: -71.972, zoom: 10.8, pitch: 65, bearing: 160 }
  }
];

const App = () => {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [activeStyle, setActiveStyle] = useState<MapStyleOption>(MAP_STYLES[0]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('driving');
  const [isRouting, setIsRouting] = useState(false);
  const [isGlobeView, setIsGlobeView] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [buildingScale, setBuildingScale] = useState(1.2);
  const [timeOfDay, setTimeOfDay] = useState<'auto' | 'day' | 'night'>('auto');
  const [shadowIntensity, setShadowIntensity] = useState(0.7);
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingHoverDetails | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementPoints, setMeasurementPoints] = useState<LatLng[]>([]);
  const [measurementDistance, setMeasurementDistance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [followCamera, setFollowCamera] = useState(true);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [followPosition, setFollowPosition] = useState(true);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [mapCanvas, setMapCanvas] = useState<HTMLCanvasElement | null>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('none');
  const [drawingShapes, setDrawingShapes] = useState<DrawingShape[]>([]);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<LatLng[]>([]);
  const [drawingColor, setDrawingColor] = useState('#3b82f6');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheProgress, setCacheProgress] = useState<number | null>(null);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [landmarkScale, setLandmarkScale] = useState(1.0);
  const [visibleLandmarks, setVisibleLandmarks] = useState<Landmark[]>([]);

  const handleViewStateChange = useCallback((next: ViewState) => {
    setViewState(next);
  }, []);

  const flyToPlace = (place: PlaceResult) => {
    setViewState((state) => ({
      ...state,
      lat: place.lat,
      lng: place.lng,
      zoom: Math.max(state.zoom, showBuildings ? 15.5 : 12),
      pitch: showBuildings ? Math.max(state.pitch, 70) : Math.max(state.pitch, 48),
      bearing: showBuildings ? (state.bearing + 35) % 360 : state.bearing,
      transition: {
        duration: showBuildings ? 2400 : 1400,
        curve: showBuildings ? 1.6 : 1.3
      }
    }));
  };

  const handleSelectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    flyToPlace(place);
  };

  const handleSetWaypoint = (place: PlaceResult, role: WaypointRole) => {
    setSelectedPlace(place);
    flyToPlace(place);
    if (role === 'origin') {
      setOrigin(place);
    } else {
      setDestination(place);
    }
    setRoutes([]);
    setActiveRouteId(null);
    setStatusMessage(null);
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setRoutes([]);
    setActiveRouteId(null);
  };

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    setRoutes([]);
    setActiveRouteId(null);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Your browser does not allow geolocation.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(coords);
        setSelectedPlace({
          id: 'me',
          name: 'You are here',
          description: 'Current location',
          ...coords
        });
        setViewState((state) => ({
          ...state,
          ...coords,
          zoom: 13,
          transition: { duration: 1200, curve: 1.2 }
        }));
      },
      () => setStatusMessage('Unable to read your location. Make sure permissions are granted.')
    );
  };

  const handleStyleChange = (styleId: string) => {
    const nextStyle = MAP_STYLES.find((style) => style.id === styleId);
    if (nextStyle) {
      setActiveStyle(nextStyle);
    }
  };

  const toggleGlobeView = () => {
    setIsGlobeView((prev) => {
      const next = !prev;
      setViewState((state) => ({
        ...state,
        lat: next ? 80 : state.lat,
        pitch: next ? 55 : 0,
        bearing: next ? 30 : 0,
        zoom: next ? 2.7 : state.zoom,
        transition: {
          duration: next ? 2000 : 1200,
          curve: next ? 1.5 : 1.2
        }
      }));
      return next;
    });
  };

  const toggleBuildings = () => {
    setShowBuildings((prev) => {
      const next = !prev;
      setViewState((state) => ({
        ...state,
        pitch: next ? Math.max(state.pitch, 68) : Math.min(state.pitch, 50),
        bearing: next ? (state.bearing || 35) : state.bearing,
        zoom: next ? Math.max(state.zoom, 15) : state.zoom,
        transition: {
          duration: next ? 1800 : 900,
          curve: next ? 1.6 : 1.2
        }
      }));
      return next;
    });
    setStatusMessage((prev) =>
      prev && prev.includes('buildings')
        ? prev
        : '3D buildings are experimental – zoom closer to city centers for taller extrusions.'
    );
  };

  const handleBuildingScaleChange = (value: number) => {
    setBuildingScale(value);
  };

  const handleTimeOfDayChange = (mode: 'auto' | 'day' | 'night') => {
    setTimeOfDay(mode);
  };

  const handleShadowIntensityChange = (value: number) => {
    setShadowIntensity(value);
  };

  const placeFromParams = (params: URLSearchParams, prefix: 'o' | 'd'): PlaceResult | null => {
    const lat = Number(params.get(`${prefix}Lat`));
    const lng = Number(params.get(`${prefix}Lng`));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const name = params.get(`${prefix}Name`) || (prefix === 'o' ? 'Shared origin' : 'Shared destination');
    const description = params.get(`${prefix}Desc`) || 'Shared waypoint';
    const id = prefix === 'o' ? 'shared-origin' : 'shared-destination';
    return {
      id,
      name,
      description,
      lat,
      lng
    };
  };

  const setCameraPreset = (preset: 'topDown' | 'overview' | 'street') => {
    setViewState((state) => {
      const presets = {
        topDown: { pitch: 0, bearing: 0, zoom: Math.max(state.zoom, 14) },
        overview: { pitch: 60, bearing: 45, zoom: Math.max(state.zoom, 15) },
        street: { pitch: 75, bearing: state.bearing, zoom: Math.max(state.zoom, 17) }
      };
      return {
        ...state,
        ...presets[preset],
        transition: { duration: 1200, curve: 1.4 }
      };
    });
  };

  const handleTourSelect = (tourId: string) => {
    const stop = TOUR_STOPS.find((tour) => tour.id === tourId);
    if (!stop) {
      return;
    }
    if (!isGlobeView) {
      setIsGlobeView(true);
    }
    setViewState((state) => ({
      ...state,
      ...stop.view,
      transition: { duration: 2600, curve: 1.55 }
    }));
    setStatusMessage(stop.description);
  };

  const handleMinimapPan = (coords: LatLng) => {
    setViewState((state) => ({
      ...state,
      lat: coords.lat,
      lng: coords.lng,
      transition: { duration: 700, curve: 1.1 }
    }));
  };

  const handleBuildingHover = useCallback((details: BuildingHoverDetails | null) => {
    setHoveredBuilding(details);
  }, []);

  const buildRoute = useCallback(
    async (profileOverride?: RouteProfile) => {
      if (!(origin && destination)) {
        return;
      }

      const targetProfile = profileOverride ?? routeProfile;
      setIsRouting(true);
      setStatusMessage(null);

      try {
        const nextRoutes = await requestRoutes(origin, destination, targetProfile);
        setRoutes(nextRoutes);
        setActiveRouteId(nextRoutes[0]?.id ?? null);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'We could not compute a route right now.';
        setStatusMessage(reason);
        setRoutes([]);
        setActiveRouteId(null);
      } finally {
        setIsRouting(false);
      }
    },
    [destination, origin, routeProfile]
  );

  const handleRouteRequest = () => {
    setActiveRouteId(null);
    setRoutes([]);
    void buildRoute();
  };

  const handleProfileChange = (profile: RouteProfile) => {
    setRouteProfile(profile);
    if (origin && destination) {
      setActiveRouteId(null);
      setRoutes([]);
      void buildRoute(profile);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsInitialized(true);
      return;
    }

    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (!rawHash) {
      setIsInitialized(true);
      return;
    }

    const params = new URLSearchParams(rawHash);
    const lat = Number(params.get('lat'));
    const lng = Number(params.get('lng'));
    const zoom = Number(params.get('zoom'));
    const pitch = Number(params.get('pitch'));
    const bearing = Number(params.get('bearing'));
    setViewState((state) => ({
      ...state,
      lat: Number.isFinite(lat) ? lat : state.lat,
      lng: Number.isFinite(lng) ? lng : state.lng,
      zoom: Number.isFinite(zoom) ? zoom : state.zoom,
      pitch: Number.isFinite(pitch) ? pitch : state.pitch,
      bearing: Number.isFinite(bearing) ? bearing : state.bearing
    }));

    const styleId = params.get('style');
    if (styleId) {
      const style = MAP_STYLES.find((option) => option.id === styleId);
      if (style) {
        setActiveStyle(style);
      }
    }

    const incomingProfile = params.get('profile');
    if (incomingProfile === 'cycling' || incomingProfile === 'walking' || incomingProfile === 'driving') {
      setRouteProfile(incomingProfile);
    }

    setIsGlobeView(params.get('globe') === '1');
    setShowBuildings(params.get('buildings') === '1');

    const sharedOrigin = placeFromParams(params, 'o');
    const sharedDestination = placeFromParams(params, 'd');
    if (sharedOrigin) {
      setOrigin(sharedOrigin);
    }
    if (sharedDestination) {
      setDestination(sharedDestination);
    }

    setIsInitialized(true);
  }, []);

  const buildShareParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('lat', viewState.lat.toFixed(5));
    params.set('lng', viewState.lng.toFixed(5));
    params.set('zoom', viewState.zoom.toFixed(2));
    params.set('pitch', viewState.pitch.toFixed(1));
    params.set('bearing', viewState.bearing.toFixed(1));
    params.set('style', activeStyle.id);
    params.set('globe', isGlobeView ? '1' : '0');
    params.set('buildings', showBuildings ? '1' : '0');
    params.set('profile', routeProfile);
    if (origin) {
      params.set('oLat', origin.lat.toFixed(5));
      params.set('oLng', origin.lng.toFixed(5));
      params.set('oName', origin.name);
      params.set('oDesc', origin.description);
    }
    if (destination) {
      params.set('dLat', destination.lat.toFixed(5));
      params.set('dLng', destination.lng.toFixed(5));
      params.set('dName', destination.name);
      params.set('dDesc', destination.description);
    }
    return params;
  }, [viewState, activeStyle.id, isGlobeView, showBuildings, routeProfile, origin, destination]);

  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') {
      return;
    }
    const params = buildShareParams();
    window.history.replaceState({}, '', `${window.location.pathname}#${params.toString()}`);
  }, [buildShareParams, isInitialized]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    const params = buildShareParams();
    return `${window.location.origin}${window.location.pathname}#${params.toString()}`;
  }, [buildShareParams]);

  const handleCopyShareLink = async () => {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkCopied(true);
    } catch {
      setShareLinkCopied(false);
    }
  };

  useEffect(() => {
    if (!shareLinkCopied || typeof window === 'undefined') {
      return;
    }
    const timer = window.setTimeout(() => setShareLinkCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [shareLinkCopied]);

  const activeRoute = useMemo(
    () => routes.find((candidate) => candidate.id === activeRouteId) ?? null,
    [routes, activeRouteId]
  );

  const infoBanner = useMemo(() => {
    if (statusMessage) {
      return statusMessage;
    }
    if (activeRoute) {
      const profileLabel =
        routeProfile === 'cycling' ? 'Cycling' : routeProfile === 'walking' ? 'Walking' : 'Driving';
      return `${profileLabel} route ready – the highlighted path follows your selections.`;
    }
    if (isGlobeView) {
      return 'Globe mode is on – spin the earth then zoom closer for standard detail.';
    }
    return 'Pick an origin and destination using the search results to build a route.';
  }, [statusMessage, activeRoute, isGlobeView, routeProfile]);

  useEffect(() => {
    if (origin && destination && !routes.length && !isRouting) {
      void buildRoute();
    }
  }, [origin, destination, routes.length, isRouting, buildRoute]);

  const [panelsMinimized, setPanelsMinimized] = useState(false);

  const zoomDelta = (delta: number) => {
    setViewState((state) => ({
      ...state,
      zoom: Math.min(18, Math.max(1.25, state.zoom + delta)),
      transition: { duration: 600 }
    }));
  };

  const handleResetView = () => {
    setViewState((state) => ({
      ...state,
      pitch: isGlobeView ? Math.max(state.pitch, 45) : 0,
      bearing: 0,
      transition: { duration: 900 }
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'arrowup':
          event.preventDefault();
          setViewState((state) => ({
            ...state,
            lat: Math.min(85, state.lat + 0.5),
            transition: { duration: 300 }
          }));
          break;
        case 'arrowdown':
          event.preventDefault();
          setViewState((state) => ({
            ...state,
            lat: Math.max(-85, state.lat - 0.5),
            transition: { duration: 300 }
          }));
          break;
        case 'arrowleft':
          event.preventDefault();
          setViewState((state) => ({
            ...state,
            lng: state.lng - 0.5,
            transition: { duration: 300 }
          }));
          break;
        case 'arrowright':
          event.preventDefault();
          setViewState((state) => ({
            ...state,
            lng: state.lng + 0.5,
            transition: { duration: 300 }
          }));
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomDelta(0.8);
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomDelta(-0.8);
          break;
        case 'g':
          event.preventDefault();
          toggleGlobeView();
          break;
        case 'b':
          event.preventDefault();
          toggleBuildings();
          break;
        case 'escape':
          event.preventDefault();
          if (!panelsMinimized) {
            setPanelsMinimized(true);
          }
          break;
        case 'r':
          event.preventDefault();
          handleResetView();
          break;
        case 'm':
          event.preventDefault();
          setIsMeasuring((prev) => !prev);
          break;
        case 'enter':
          if (drawingMode !== 'none' && drawingMode !== 'circle') {
            event.preventDefault();
            finishDrawing();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobeView, panelsMinimized, drawingMode, finishDrawing]);

  const handleMapClick = useCallback((coords: LatLng) => {
    if (isMeasuring) {
      setMeasurementPoints((prev) => [...prev, coords]);
    } else if (drawingMode !== 'none') {
      handleDrawingClick(coords);
    }
  }, [isMeasuring, drawingMode, handleDrawingClick]);

  const handleScreenshot = useCallback(() => {
    if (!mapCanvas) {
      setStatusMessage('Map not ready for screenshot');
      return;
    }
    mapCanvas.toBlob((blob) => {
      if (!blob) {
        setStatusMessage('Failed to capture screenshot');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `map-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Screenshot saved');
    });
  }, [mapCanvas]);

  const handleExportRoute = useCallback((format: 'gpx' | 'geojson') => {
    const route = routes.find((r) => r.id === activeRouteId);
    if (!route) {
      setStatusMessage('No route selected');
      return;
    }
    if (format === 'gpx') {
      exportAsGPX(route, origin, destination);
      setStatusMessage('GPX file exported');
    } else {
      exportAsGeoJSON(route);
      setStatusMessage('GeoJSON file exported');
    }
  }, [routes, activeRouteId, origin, destination]);

  const handlePrintDirections = useCallback(() => {
    const route = routes.find((r) => r.id === activeRouteId);
    if (!route) {
      setStatusMessage('No route selected');
      return;
    }
    printDirections(route, origin, destination);
  }, [routes, activeRouteId, origin, destination]);

  const handleDrawingClick = useCallback((coords: LatLng) => {
    if (drawingMode === 'none') {
      return;
    }

    if (drawingMode === 'circle') {
      if (currentDrawingPoints.length === 0) {
        setCurrentDrawingPoints([coords]);
        setStatusMessage('Click again to set radius');
      } else {
        const center = currentDrawingPoints[0];
        const R = 6371000;
        const dLat = ((coords.lat - center.lat) * Math.PI) / 180;
        const dLng = ((coords.lng - center.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((center.lat * Math.PI) / 180) *
            Math.cos((coords.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const radius = R * c;

        const newShape: DrawingShape = {
          id: `shape-${Date.now()}`,
          type: 'circle',
          coordinates: [center],
          properties: {
            color: drawingColor,
            fillOpacity: 0.3,
            strokeWidth: 2,
            radius
          },
          createdAt: Date.now()
        };
        setDrawingShapes((prev) => [...prev, newShape]);
        setCurrentDrawingPoints([]);
        setDrawingMode('none');
        setStatusMessage('Circle created');
      }
    } else {
      setCurrentDrawingPoints((prev) => [...prev, coords]);
      setStatusMessage(
        `${currentDrawingPoints.length + 1} points. Double-click or press Enter to finish.`
      );
    }
  }, [drawingMode, currentDrawingPoints, drawingColor]);

  const finishDrawing = useCallback(() => {
    if (currentDrawingPoints.length < 2) {
      setStatusMessage('Need at least 2 points');
      return;
    }

    const newShape: DrawingShape = {
      id: `shape-${Date.now()}`,
      type: drawingMode as 'polygon' | 'line',
      coordinates: [...currentDrawingPoints],
      properties: {
        color: drawingColor,
        fillOpacity: 0.3,
        strokeWidth: 2
      },
      createdAt: Date.now()
    };

    setDrawingShapes((prev) => [...prev, newShape]);
    setCurrentDrawingPoints([]);
    setDrawingMode('none');
    setStatusMessage(`${newShape.type} created`);
  }, [currentDrawingPoints, drawingMode, drawingColor]);

  const handleDrawingModeChange = useCallback((mode: DrawingMode) => {
    setDrawingMode(mode);
    setCurrentDrawingPoints([]);
    if (mode === 'none') {
      setStatusMessage(null);
    } else {
      setStatusMessage(`Click to start drawing ${mode}`);
    }
  }, []);

  const handleExportShapes = useCallback(() => {
    const geojson = {
      type: 'FeatureCollection',
      features: drawingShapes.map((shape) => ({
        type: 'Feature',
        properties: {
          type: shape.type,
          ...shape.properties,
          createdAt: new Date(shape.createdAt).toISOString()
        },
        geometry:
          shape.type === 'circle'
            ? {
                type: 'Point',
                coordinates: [shape.coordinates[0].lng, shape.coordinates[0].lat]
              }
            : {
                type: shape.type === 'line' ? 'LineString' : 'Polygon',
                coordinates:
                  shape.type === 'polygon'
                    ? [
                        [...shape.coordinates.map((c) => [c.lng, c.lat]), [shape.coordinates[0].lng, shape.coordinates[0].lat]]
                      ]
                    : shape.coordinates.map((c) => [c.lng, c.lat])
              }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drawings-${new Date().toISOString().slice(0, 10)}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Drawings exported');
  }, [drawingShapes]);

  const handleDeleteShape = useCallback((id: string) => {
    setDrawingShapes((prev) => prev.filter((s) => s.id !== id));
    setStatusMessage('Shape deleted');
  }, []);

  const handleClearAllShapes = useCallback(() => {
    if (window.confirm(`Delete all ${drawingShapes.length} shapes?`)) {
      setDrawingShapes([]);
      setStatusMessage('All shapes cleared');
    }
  }, [drawingShapes.length]);

  const updateCacheSize = useCallback(async () => {
    const size = await getCacheSize();
    setCacheSize(size);
  }, []);

  useEffect(() => {
    updateCacheSize();
    const interval = setInterval(updateCacheSize, 5000);
    return () => clearInterval(interval);
  }, [updateCacheSize]);

  const handleDownloadArea = useCallback(async () => {
    if (!viewState.bounds) {
      setStatusMessage('Map bounds not available');
      return;
    }

    setCacheProgress(0);
    setStatusMessage('Downloading tiles...');

    try {
      const bounds = {
        north: viewState.bounds[1],
        south: viewState.bounds[0],
        east: viewState.bounds[3],
        west: viewState.bounds[2]
      };

      // Extract tile URL from current map style
      const tileUrl = 'https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf';

      await downloadAreaTiles(bounds, viewState.zoom, tileUrl, (progress) => {
        setCacheProgress(progress);
      });

      setCacheProgress(null);
      await updateCacheSize();
      setStatusMessage('Area downloaded successfully');
    } catch (error) {
      setCacheProgress(null);
      setStatusMessage('Download failed');
      console.error('Download error:', error);
    }
  }, [viewState, updateCacheSize]);

  const handleClearCache = useCallback(async () => {
    if (window.confirm('Clear all cached tiles? This cannot be undone.')) {
      try {
        await clearCache();
        await updateCacheSize();
        setStatusMessage('Cache cleared');
      } catch (error) {
        setStatusMessage('Failed to clear cache');
        console.error('Clear cache error:', error);
      }
    }
  }, [updateCacheSize]);

  const handleToggleOffline = useCallback(() => {
    setIsOfflineMode((prev) => !prev);
    setStatusMessage(isOfflineMode ? 'Online mode enabled' : 'Offline mode enabled');
  }, [isOfflineMode]);

  useEffect(() => {
    if (showLandmarks) {
      const nearby = getNearbyLandmarks({ lat: viewState.lat, lng: viewState.lng }, 500);
      setVisibleLandmarks(nearby);
    }
  }, [showLandmarks, viewState.lat, viewState.lng]);

  const handleFlyToLandmark = useCallback((landmark: Landmark) => {
    setViewState((state) => ({
      ...state,
      lat: landmark.location.lat,
      lng: landmark.location.lng,
      zoom: 16,
      pitch: 60,
      bearing: 45,
      transition: {
        duration: 2000,
        curve: 1.5
      }
    }));
    setStatusMessage(`Flying to ${landmark.name}`);
  }, []);

  const calculateMeasurementDistance = useCallback((points: LatLng[]): number => {
    if (points.length < 2) {
      return 0;
    }
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const R = 6371000;
      const dLat = ((curr.lat - prev.lat) * Math.PI) / 180;
      const dLng = ((curr.lng - prev.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((prev.lat * Math.PI) / 180) *
          Math.cos((curr.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return total;
  }, []);

  useEffect(() => {
    const distance = calculateMeasurementDistance(measurementPoints);
    setMeasurementDistance(distance);
  }, [measurementPoints, calculateMeasurementDistance]);

  useEffect(() => {
    if (!isMeasuring) {
      setMeasurementPoints([]);
      setMeasurementDistance(0);
    }
  }, [isMeasuring]);

  const getPointAlongRoute = useCallback((progress: number): LatLng | null => {
    if (!activeRoute?.geometry?.geometry?.coordinates) {
      return null;
    }
    const coords = activeRoute.geometry.geometry.coordinates;
    if (coords.length === 0) {
      return null;
    }
    const index = Math.floor((progress / 100) * (coords.length - 1));
    const [lng, lat] = coords[Math.min(index, coords.length - 1)];
    return { lat, lng };
  }, [activeRoute]);

  useEffect(() => {
    if (!isAnimating || !activeRoute) {
      return;
    }

    const animate = () => {
      setAnimationProgress((prev) => {
        const next = prev + animationSpeed * 0.5;
        if (next >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return next;
      });
    };

    const intervalId = setInterval(animate, 50);
    return () => clearInterval(intervalId);
  }, [isAnimating, animationSpeed, activeRoute]);

  useEffect(() => {
    if (!followCamera || !activeRoute) {
      return;
    }
    const point = getPointAlongRoute(animationProgress);
    if (point) {
      setViewState((state) => ({
        ...state,
        lat: point.lat,
        lng: point.lng,
        zoom: Math.max(state.zoom, 15),
        transition: { duration: 300 }
      }));
    }
  }, [animationProgress, followCamera, activeRoute, getPointAlongRoute]);

  useEffect(() => {
    if (activeRoute) {
      setAnimationProgress(0);
      setIsAnimating(false);
    }
  }, [activeRoute?.id]);

  useEffect(() => {
    if (!isTracking) {
      setGeoAccuracy(null);
      return;
    }

    if (!('geolocation' in navigator)) {
      setStatusMessage('Geolocation is not supported by your browser');
      setIsTracking(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLocation);
        setGeoAccuracy(position.coords.accuracy);

        if (followPosition) {
          setViewState((state) => ({
            ...state,
            lat: newLocation.lat,
            lng: newLocation.lng,
            zoom: Math.max(state.zoom, 16),
            transition: { duration: 500 }
          }));
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setStatusMessage(`Location error: ${error.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, followPosition]);

  return (
    <div className={`app-shell ${isGlobeView ? 'globe-mode' : ''}`}>
      <MapCanvas
        viewState={viewState}
        mapStyle={activeStyle}
        selectedPlace={selectedPlace}
        origin={origin}
        destination={destination}
        userLocation={userLocation}
        geoAccuracy={geoAccuracy}
        route={activeRoute}
        isGlobeView={isGlobeView}
        showBuildings={showBuildings}
        buildingScale={buildingScale}
        timeOfDay={timeOfDay}
        shadowIntensity={shadowIntensity}
        isMeasuring={isMeasuring}
        measurementPoints={measurementPoints}
        animationProgress={animationProgress}
        searchResults={searchResults}
        drawingMode={drawingMode}
        drawingShapes={drawingShapes}
        currentDrawingPoints={currentDrawingPoints}
        onViewStateChange={handleViewStateChange}
        onBuildingHover={handleBuildingHover}
        onMapClick={handleMapClick}
        onMapReady={setMapCanvas}
      />

      <div className={`panel-stack${panelsMinimized ? ' minimized' : ''}`}>
        {panelsMinimized ? (
          <button
            className="minimize-btn expand"
            aria-label="Expand panels"
            onClick={() => setPanelsMinimized(false)}
          >
            ▶
          </button>
        ) : (
          <>
            <button
              className="minimize-btn"
              aria-label="Minimize panels"
              onClick={() => setPanelsMinimized(true)}
            >
              ✕
            </button>
            <SearchPanel
              onSelectPlace={handleSelectPlace}
              onSetWaypoint={handleSetWaypoint}
              onResultsChange={setSearchResults}
            />
            <RoutePlanner
              origin={origin}
              destination={destination}
              profile={routeProfile}
              onSwap={handleSwap}
              onClear={handleClear}
              onRequestRoute={handleRouteRequest}
              loading={isRouting}
              routes={routes}
              activeRouteId={activeRoute?.id ?? null}
              onProfileChange={handleProfileChange}
              onSelectRoute={setActiveRouteId}
              shareUrl={shareUrl}
              onCopyShareLink={handleCopyShareLink}
              shareLinkCopied={shareLinkCopied}
            />
            <ControlPanel
              styles={MAP_STYLES}
              activeStyleId={activeStyle.id}
              isGlobeView={isGlobeView}
              showBuildings={showBuildings}
              buildingScale={buildingScale}
              timeOfDay={timeOfDay}
              shadowIntensity={shadowIntensity}
              onStyleChange={handleStyleChange}
              onLocateMe={handleLocateMe}
              onToggleGlobe={toggleGlobeView}
              onToggleBuildings={toggleBuildings}
              onBuildingScaleChange={handleBuildingScaleChange}
              onTimeOfDayChange={handleTimeOfDayChange}
              onShadowIntensityChange={handleShadowIntensityChange}
              onCameraPreset={setCameraPreset}
              tourStops={TOUR_STOPS}
              onSelectTourStop={handleTourSelect}
            />
            <MeasurementTool
              isActive={isMeasuring}
              points={measurementPoints}
              totalDistance={measurementDistance}
              onToggle={() => setIsMeasuring((prev) => !prev)}
              onClear={() => {
                setMeasurementPoints([]);
                setMeasurementDistance(0);
              }}
            />
            <GeoLocationControl
              isTracking={isTracking}
              isFollowing={followPosition}
              accuracy={geoAccuracy}
              onToggleTracking={() => setIsTracking((prev) => !prev)}
              onToggleFollowing={() => setFollowPosition((prev) => !prev)}
            />
            <ExportControls
              hasRoute={!!activeRoute}
              onScreenshot={handleScreenshot}
              onExport={handleExportRoute}
              onPrint={handlePrintDirections}
            />
            <DrawingTools
              mode={drawingMode}
              shapes={drawingShapes}
              currentColor={drawingColor}
              onModeChange={handleDrawingModeChange}
              onColorChange={setDrawingColor}
              onClearAll={handleClearAllShapes}
              onDeleteShape={handleDeleteShape}
              onExportShapes={handleExportShapes}
            />
            <OfflineControls
              isOfflineMode={isOfflineMode}
              cacheSize={cacheSize}
              maxCacheSize={MAX_CACHE_SIZE}
              cacheProgress={cacheProgress}
              onToggleOffline={handleToggleOffline}
              onDownloadArea={handleDownloadArea}
              onClearCache={handleClearCache}
            />
            <LandmarkControls
              showLandmarks={showLandmarks}
              landmarkScale={landmarkScale}
              visibleLandmarks={visibleLandmarks}
              onToggle={() => setShowLandmarks((prev) => !prev)}
              onScaleChange={setLandmarkScale}
              onFlyToLandmark={handleFlyToLandmark}
            />
            {activeRoute && (
              <RouteAnimation
                isAnimating={isAnimating}
                progress={animationProgress}
                speed={animationSpeed}
                onToggle={() => setIsAnimating((prev) => !prev)}
                onSpeedChange={setAnimationSpeed}
                onProgressChange={setAnimationProgress}
                isFollowing={followCamera}
                onToggleFollow={() => setFollowCamera((prev) => !prev)}
              />
            )}
            {!isGlobeView && (
              <section className="glass-panel" aria-live="polite">
                <p className="status-banner">{infoBanner}</p>
              </section>
            )}
          </>
        )}
      </div>

      <FloatingControls
        onZoomIn={() => zoomDelta(0.8)}
        onZoomOut={() => zoomDelta(-0.8)}
        onResetView={handleResetView}
      />

      {showBuildings && (
        <Minimap
          center={{ lat: viewState.lat, lng: viewState.lng }}
          bearing={viewState.bearing}
          zoom={viewState.zoom}
          show3D={showBuildings}
          bounds={viewState.bounds}
          onPanTo={handleMinimapPan}
        />
      )}

      <BuildingInfoPopup
        building={hoveredBuilding?.building ?? null}
        position={hoveredBuilding?.position ?? { x: 0, y: 0 }}
      />
    </div>
  );
};

export default App;
