interface GeoLocationControlProps {
  isTracking: boolean;
  isFollowing: boolean;
  accuracy: number | null;
  onToggleTracking: () => void;
  onToggleFollowing: () => void;
}

const GeoLocationControl = ({
  isTracking,
  isFollowing,
  accuracy,
  onToggleTracking,
  onToggleFollowing
}: GeoLocationControlProps) => (
  <div className="geolocation-controls">
    <div className="control-header">
      <span className="control-label">Live Location</span>
      <button
        type="button"
        className={`ghost-btn ${isTracking ? 'active' : ''}`}
        onClick={onToggleTracking}
        style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}
      >
        {isTracking ? '📍 Tracking' : '📍 Track me'}
      </button>
    </div>

    {isTracking && (
      <>
        {accuracy !== null && (
          <p className="muted-subcopy" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            Accuracy: ±{Math.round(accuracy)}m
          </p>
        )}
        <button
          type="button"
          className={`ghost-btn ${isFollowing ? 'active' : ''}`}
          onClick={onToggleFollowing}
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.55rem', width: '100%' }}
        >
          🎯 {isFollowing ? 'Following' : 'Follow position'}
        </button>
      </>
    )}
  </div>
);

export default GeoLocationControl;
