import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, Marker, NavigationControl, ScaleControl, GeoJSONSource } from 'maplibre-gl';
import type { MapStyleOption, PlaceResult, RouteSummary, ViewState, LatLng } from '../types';

interface MapCanvasProps {
  viewState: ViewState;
  mapStyle: MapStyleOption;
  selectedPlace: PlaceResult | null;
  origin: PlaceResult | null;
  destination: PlaceResult | null;
  userLocation: LatLng | null;
  route: RouteSummary | null;
  onViewStateChange: (view: ViewState) => void;
}

const ROUTE_SOURCE_ID = 'route-source';
const ROUTE_LAYER_ID = 'route-line';

const MapCanvas = ({
  viewState,
  mapStyle,
  selectedPlace,
  origin,
  destination,
  userLocation,
  route,
  onViewStateChange
}: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const activeStyleUrl = useRef<string | null>(null);
  const initialView = useRef<ViewState>(viewState);
  const initialStyle = useRef<string>(mapStyle.url);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle.current,
      center: [initialView.current.lng, initialView.current.lat],
      zoom: initialView.current.zoom,
      pitch: initialView.current.pitch,
      bearing: initialView.current.bearing,
      attributionControl: true
    });

    mapRef.current = map;
    activeStyleUrl.current = mapStyle.url;
    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
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
      const bounds = coordinates.reduce((acc, coord) => acc.extend(coord as [number, number]), new maplibregl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number]));
      map.fitBounds(bounds, { padding: 60, duration: 1200 });
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

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Interactive world map" />;
};

export default MapCanvas;
