import type { LatLng } from '../types';

interface MeasurementToolProps {
  isActive: boolean;
  points: LatLng[];
  totalDistance: number;
  onToggle: () => void;
  onClear: () => void;
}

const formatDistance = (meters: number): string => {
  if (meters > 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

const MeasurementTool = ({
  isActive,
  points,
  totalDistance,
  onToggle,
  onClear
}: MeasurementToolProps) => (
  <div className="measurement-tool">
    <button
      type="button"
      className={`ghost-btn ${isActive ? 'active' : ''}`}
      onClick={onToggle}
      title="Measure distance (M key)"
    >
      📏 {isActive ? 'Measuring...' : 'Measure'}
    </button>
    {points.length > 0 && (
      <div className="measurement-info">
        <span className="badge">{points.length} point{points.length > 1 ? 's' : ''}</span>
        {totalDistance > 0 && (
          <span className="badge">{formatDistance(totalDistance)}</span>
        )}
        <button
          type="button"
          className="ghost-btn"
          onClick={onClear}
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
        >
          Clear
        </button>
      </div>
    )}
    {isActive && (
      <p className="muted-subcopy" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
        Click on the map to add points. Press Escape to stop.
      </p>
    )}
  </div>
);

export default MeasurementTool;
