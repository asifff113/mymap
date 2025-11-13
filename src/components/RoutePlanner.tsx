import type { PlaceResult, RouteProfile, RouteSummary } from '../types';

interface RoutePlannerProps {
  origin: PlaceResult | null;
  destination: PlaceResult | null;
  profile: RouteProfile;
  onSwap: () => void;
  onClear: () => void;
  onRequestRoute: () => void;
  loading: boolean;
  route: RouteSummary | null;
  onProfileChange: (profile: RouteProfile) => void;
}

const getLabel = (place: PlaceResult | null) => place?.name ?? 'Not set';

const formatDistance = (meters: number): string => {
  if (meters > 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

const RoutePlanner = ({
  origin,
  destination,
  profile,
  onSwap,
  onClear,
  onRequestRoute,
  loading,
  route,
  onProfileChange
}: RoutePlannerProps) => {
  const canRoute = Boolean(origin && destination) && !loading;
  const profileLabel =
    profile === 'cycling' ? 'Bike' : profile === 'walking' ? 'Walk' : 'Drive';
  const profileOptions: Array<{ id: RouteProfile; label: string }> = [
    { id: 'driving', label: 'Drive' },
    { id: 'cycling', label: 'Bike' },
    { id: 'walking', label: 'Walk' }
  ];

  return (
    <section className="glass-panel" aria-label="Route planner">
      <h2 className="panel-title">Directions</h2>
      <div className="status-banner">
        <p><strong>Origin:</strong> {getLabel(origin)}</p>
        <p><strong>Destination:</strong> {getLabel(destination)}</p>
        <p><strong>Mode:</strong> {profileLabel}</p>
      </div>

      <div className="mode-toggle" aria-label="Travel mode options">
        {profileOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`pill-btn ${profile === option.id ? 'active' : ''}`}
            aria-pressed={profile === option.id}
            onClick={() => onProfileChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="action-row" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="ghost-btn" onClick={onSwap} disabled={!(origin && destination)}>
          Swap
        </button>
        <button type="button" className="ghost-btn" onClick={onClear} disabled={!(origin || destination)}>
          Clear
        </button>
        <button type="button" className="primary-btn" onClick={onRequestRoute} disabled={!canRoute}>
          {loading ? 'Building…' : 'Get directions'}
        </button>
      </div>

      {route && (
        <div className="route-meta" style={{ marginTop: '0.75rem' }}>
          <span className="badge">{formatDistance(route.distance)}</span>
          <span className="badge">{formatDuration(route.duration)}</span>
        </div>
      )}
    </section>
  );
};

export default RoutePlanner;
