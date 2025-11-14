import type { PlaceResult, RouteProfile, RouteSummary } from '../types';

interface RoutePlannerProps {
  origin: PlaceResult | null;
  destination: PlaceResult | null;
  profile: RouteProfile;
  onSwap: () => void;
  onClear: () => void;
  onRequestRoute: () => void;
  loading: boolean;
  routes: RouteSummary[];
  activeRouteId: string | null;
  onProfileChange: (profile: RouteProfile) => void;
  onSelectRoute: (routeId: string) => void;
  shareUrl: string;
  onCopyShareLink: () => void;
  shareLinkCopied: boolean;
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
  routes,
  activeRouteId,
  onProfileChange,
  onSelectRoute,
  shareUrl,
  onCopyShareLink,
  shareLinkCopied
}: RoutePlannerProps) => {
  const canRoute = Boolean(origin && destination) && !loading;
  const profileLabel =
    profile === 'cycling' ? 'Bike' : profile === 'walking' ? 'Walk' : 'Drive';
  const profileOptions: Array<{ id: RouteProfile; label: string }> = [
    { id: 'driving', label: 'Drive' },
    { id: 'cycling', label: 'Bike' },
    { id: 'walking', label: 'Walk' }
  ];
  const activeRoute = routes.find((candidate) => candidate.id === activeRouteId) ?? routes[0];
  const steps = activeRoute?.steps ?? [];

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

      {routes.length > 0 && (
        <div className="route-option-grid">
          {routes.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={`route-option ${activeRoute?.id === option.id ? 'active' : ''}`}
              onClick={() => onSelectRoute(option.id)}
            >
              <div className="route-option-title">
                Route {index + 1} {option.isAlternate ? '(alt)' : ''}
              </div>
              <div className="route-option-meta">
                {formatDistance(option.distance)} · {formatDuration(option.duration)}
              </div>
            </button>
          ))}
        </div>
      )}

      {activeRoute && (
        <div className="route-meta" style={{ marginTop: '0.75rem' }}>
          <span className="badge">{formatDistance(activeRoute.distance)}</span>
          <span className="badge">{formatDuration(activeRoute.duration)}</span>
        </div>
      )}

      {steps.length > 0 && (
        <div className="route-steps-container">
          <p className="muted-subcopy">Next maneuvers</p>
          <ol className="route-steps">
            {steps.slice(0, 6).map((step, index) => (
              <li key={`${step.instruction}-${index}`}>
                <span className="step-instruction">{step.instruction}</span>
                <span className="step-meta">
                  {formatDistance(step.distance)} · {formatDuration(step.duration)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {shareUrl && (
        <button
          type="button"
          className="ghost-btn"
          style={{ marginTop: '0.5rem', width: '100%' }}
          onClick={onCopyShareLink}
        >
          {shareLinkCopied ? 'Link copied!' : 'Copy share link'}
        </button>
      )}
    </section>
  );
};

export default RoutePlanner;
