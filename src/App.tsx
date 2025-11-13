import { useCallback, useMemo, useState } from 'react';
import MapCanvas from './components/MapCanvas';
import SearchPanel from './components/SearchPanel';
import RoutePlanner from './components/RoutePlanner';
import ControlPanel from './components/ControlPanel';
import { requestRoute } from './lib/osrm';
import type { LatLng, MapStyleOption, PlaceResult, RouteSummary, ViewState, WaypointRole } from './types';

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
  const [isRouting, setIsRouting] = useState(false);
  const [isThreeD, setIsThreeD] = useState(false);
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

  const toggleThreeD = () => {
    setIsThreeD((prev) => {
      const next = !prev;
      setViewState((state) => ({
        ...state,
        pitch: next ? 55 : 0,
        bearing: next ? state.bearing || 25 : 0
      }));
      return next;
    });
  };

  const handleRouteRequest = async () => {
    if (!(origin && destination)) {
      return;
    }

    setIsRouting(true);
    setStatusMessage(null);

    try {
      const nextRoute = await requestRoute(origin, destination);
      setRoute(nextRoute);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'We could not compute a route right now.';
      setStatusMessage(reason);
      setRoute(null);
    } finally {
      setIsRouting(false);
    }
  };

  const infoBanner = useMemo(() => {
    if (statusMessage) {
      return statusMessage;
    }
    if (route) {
      return 'Route ready – the map highlights your path.';
    }
    return 'Pick an origin and destination using the search results to build a route.';
  }, [route, statusMessage]);

  return (
    <div className="app-shell">
      <MapCanvas
        viewState={viewState}
        mapStyle={activeStyle}
        selectedPlace={selectedPlace}
        origin={origin}
        destination={destination}
        userLocation={userLocation}
        route={route}
        onViewStateChange={handleViewStateChange}
      />

      <div className="panel-stack">
        <SearchPanel onSelectPlace={handleSelectPlace} onSetWaypoint={handleSetWaypoint} />
        <RoutePlanner
          origin={origin}
          destination={destination}
          onSwap={handleSwap}
          onClear={handleClear}
          onRequestRoute={handleRouteRequest}
          loading={isRouting}
          route={route}
        />
        <ControlPanel
          styles={MAP_STYLES}
          activeStyleId={activeStyle.id}
          isThreeD={isThreeD}
          onStyleChange={handleStyleChange}
          onLocateMe={handleLocateMe}
          onToggleThreeD={toggleThreeD}
        />
        <section className="glass-panel" aria-live="polite">
          <p className="status-banner">{infoBanner}</p>
        </section>
      </div>
    </div>
  );
};

export default App;
