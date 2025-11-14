interface RouteAnimationProps {
  isAnimating: boolean;
  progress: number;
  speed: number;
  onToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onProgressChange: (progress: number) => void;
  isFollowing: boolean;
  onToggleFollow: () => void;
}

const RouteAnimation = ({
  isAnimating,
  progress,
  speed,
  onToggle,
  onSpeedChange,
  onProgressChange,
  isFollowing,
  onToggleFollow
}: RouteAnimationProps) => {
  const speeds = [
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 5, label: '5x' }
  ];

  return (
    <div className="route-animation-controls">
      <div className="animation-header">
        <span className="control-label">Route Animation</span>
        <button
          type="button"
          className="ghost-btn"
          onClick={onToggle}
          style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}
        >
          {isAnimating ? '⏸️ Pause' : '▶️ Play'}
        </button>
      </div>

      <div className="animation-progress">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={(e) => onProgressChange(Number(e.target.value))}
          className="progress-slider"
        />
        <span className="progress-label">{Math.round(progress)}%</span>
      </div>

      <div className="animation-options">
        <div className="speed-selector">
          <span className="muted-subcopy">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`speed-btn ${speed === s.value ? 'active' : ''}`}
              onClick={() => onSpeedChange(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        
        <button
          type="button"
          className={`ghost-btn ${isFollowing ? 'active' : ''}`}
          onClick={onToggleFollow}
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.55rem', marginTop: '0.5rem' }}
        >
          📹 {isFollowing ? 'Following' : 'Follow camera'}
        </button>
      </div>
    </div>
  );
};

export default RouteAnimation;
