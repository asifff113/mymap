import { useCallback, useEffect, useMemo, useState } from 'react';
import MapCanvas from './components/MapCanvas';
import SearchPanel from './components/SearchPanel';
import RoutePlanner from './components/RoutePlanner';
import ControlPanel from './components/ControlPanel';
import FloatingControls from './components/FloatingControls';
import { requestRoute } from './lib/osrm';
import type {
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

const App = () => {
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [activeStyle, setActiveStyle] = useState<MapStyleOption>(MAP_STYLES[0]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('driving');
  const [isRouting, setIsRouting] = useState(false);
  const [isGlobeView, setIsGlobeView] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleViewStateChange = useCallback((next: ViewState) => {
    setViewState(next);
  }, []);

  const flyToPlace = (place: PlaceResult) => {
    setViewState((state) => ({
      ...state,
      lat: place.lat,
      lng: place.lng,
      zoom: Math.max(state.zoom, 11)
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
    setRoute(null);
    setStatusMessage(null);
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setRoute(null);
  };

  const handleClear = () => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
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
        setViewState((state) => ({ ...state, ...coords, zoom: 13 }));
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
        zoom: next ? 2.7 : state.zoom
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
        zoom: next ? Math.max(state.zoom, 15) : state.zoom
      }));
      return next;
    });
    setStatusMessage((prev) =>
      prev && prev.includes('buildings')
        ? prev
        : '3D buildings are experimental – zoom closer to city centers for taller extrusions.'
    );
  };

  const buildRoute = useCallback(
    async (profileOverride?: RouteProfile) => {
      if (!(origin && destination)) {
        return;
      }

      const targetProfile = profileOverride ?? routeProfile;
      setIsRouting(true);
      setStatusMessage(null);

      try {
        const nextRoute = await requestRoute(origin, destination, targetProfile);
        setRoute(nextRoute);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'We could not compute a route right now.';
        setStatusMessage(reason);
        setRoute(null);
      } finally {
        setIsRouting(false);
      }
    },
    [destination, origin, routeProfile]
  );

  const handleRouteRequest = () => {
    void buildRoute();
  };

  const handleProfileChange = (profile: RouteProfile) => {
    setRouteProfile(profile);
    if (origin && destination) {
      void buildRoute(profile);
    }
  };

  const infoBanner = useMemo(() => {
    if (statusMessage) {
      return statusMessage;
    }
    if (route) {
      const profileLabel =
        routeProfile === 'cycling' ? 'Cycling' : routeProfile === 'walking' ? 'Walking' : 'Driving';
      return `${profileLabel} route ready – the highlighted path follows your selections.`;
    }
    if (isGlobeView) {
      return 'Globe mode is on – spin the earth then zoom closer for standard detail.';
    }
    return 'Pick an origin and destination using the search results to build a route.';
  }, [route, statusMessage, isGlobeView, routeProfile]);

  useEffect(() => {
    if (origin && destination && !route && !isRouting) {
      void buildRoute();
    }
  }, [origin, destination, route, isRouting, buildRoute]);

  const [panelsMinimized, setPanelsMinimized] = useState(false);

  const zoomDelta = (delta: number) => {
    setViewState((state) => ({
      ...state,
      zoom: Math.min(18, Math.max(1.25, state.zoom + delta))
    }));
  };

  const handleResetView = () => {
    setViewState((state) => ({
      ...state,
      pitch: isGlobeView ? Math.max(state.pitch, 45) : 0,
      bearing: 0
    }));
  };

  return (
    <div className={`app-shell ${isGlobeView ? 'globe-mode' : ''}`}>
      <MapCanvas
        viewState={viewState}
        mapStyle={activeStyle}
        selectedPlace={selectedPlace}
        origin={origin}
        destination={destination}
        userLocation={userLocation}
        route={route}
        isGlobeView={isGlobeView}
        showBuildings={showBuildings}
        onViewStateChange={handleViewStateChange}
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
            <SearchPanel onSelectPlace={handleSelectPlace} onSetWaypoint={handleSetWaypoint} />
            <RoutePlanner
              origin={origin}
              destination={destination}
              profile={routeProfile}
              onSwap={handleSwap}
              onClear={handleClear}
              onRequestRoute={handleRouteRequest}
              loading={isRouting}
              route={route}
              onProfileChange={handleProfileChange}
            />
            <ControlPanel
              styles={MAP_STYLES}
              activeStyleId={activeStyle.id}
              isGlobeView={isGlobeView}
              showBuildings={showBuildings}
              onStyleChange={handleStyleChange}
              onLocateMe={handleLocateMe}
              onToggleGlobe={toggleGlobeView}
              onToggleBuildings={toggleBuildings}
            />
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
    </div>
  );
};

export default App;
