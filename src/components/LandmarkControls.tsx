import type { Landmark } from '../lib/landmarks';

interface LandmarkControlsProps {
  showLandmarks: boolean;
  landmarkScale: number;
  visibleLandmarks: Landmark[];
  onToggle: () => void;
  onScaleChange: (scale: number) => void;
  onFlyToLandmark: (landmark: Landmark) => void;
}

const LandmarkControls = ({
  showLandmarks,
  landmarkScale,
  visibleLandmarks,
  onToggle,
  onScaleChange,
  onFlyToLandmark
}: LandmarkControlsProps) => (
  <div className="landmark-controls">
    <div className="control-header">
      <h3 className="control-label">3D Landmarks</h3>
      <button
        type="button"
        className={`toggle-btn ${showLandmarks ? 'active' : ''}`}
        onClick={onToggle}
        title={showLandmarks ? 'Hide landmarks' : 'Show landmarks'}
      >
        {showLandmarks ? '🏛️ On' : '🏛️ Off'}
      </button>
    </div>

    {showLandmarks && (
      <>
        <div className="landmark-scale-control">
          <label className="control-sublabel">
            Model Scale: {landmarkScale.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={landmarkScale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="slider"
          />
        </div>

        {visibleLandmarks.length > 0 && (
          <div className="landmarks-list">
            <div className="control-sublabel">
              Nearby ({visibleLandmarks.length})
            </div>
            <div className="landmarks-items">
              {visibleLandmarks.map((landmark) => (
                <button
                  key={landmark.id}
                  type="button"
                  className="landmark-item"
                  onClick={() => onFlyToLandmark(landmark)}
                  title={`Fly to ${landmark.name}`}
                >
                  <span className="landmark-name">{landmark.name}</span>
                  <span className="landmark-height">{landmark.height}m</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleLandmarks.length === 0 && (
          <div className="landmark-hint">
            <small>No landmarks in current view. Try zooming out or exploring major cities.</small>
          </div>
        )}
      </>
    )}
  </div>
);

export default LandmarkControls;
