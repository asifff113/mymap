interface OfflineControlsProps {
  isOfflineMode: boolean;
  cacheSize: number;
  maxCacheSize: number;
  cacheProgress: number | null;
  onToggleOffline: () => void;
  onDownloadArea: () => void;
  onClearCache: () => void;
}

const OfflineControls = ({
  isOfflineMode,
  cacheSize,
  maxCacheSize,
  cacheProgress,
  onToggleOffline,
  onDownloadArea,
  onClearCache
}: OfflineControlsProps) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="offline-controls">
      <div className="control-header">
        <h3 className="control-label">Offline Maps</h3>
        <button
          type="button"
          className={`toggle-btn ${isOfflineMode ? 'active' : ''}`}
          onClick={onToggleOffline}
          title={isOfflineMode ? 'Disable offline mode' : 'Enable offline mode'}
        >
          {isOfflineMode ? '📡 Online' : '✈️ Offline'}
        </button>
      </div>

      <div className="cache-info">
        <div className="cache-stats">
          <span className="cache-label">Cache:</span>
          <span className="cache-value">
            {formatBytes(cacheSize)} / {formatBytes(maxCacheSize)}
          </span>
        </div>
        <div className="cache-bar">
          <div
            className="cache-bar-fill"
            style={{ width: `${(cacheSize / maxCacheSize) * 100}%` }}
          />
        </div>
      </div>

      {cacheProgress !== null && (
        <div className="download-progress">
          <div className="progress-label">Downloading tiles...</div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${cacheProgress}%` }} />
          </div>
          <div className="progress-text">{Math.round(cacheProgress)}%</div>
        </div>
      )}

      <div className="offline-actions">
        <button
          type="button"
          className="ghost-btn"
          onClick={onDownloadArea}
          disabled={cacheProgress !== null}
          title="Download tiles for current map view"
          style={{ width: '100%' }}
        >
          📥 Download Area
        </button>
        
        {cacheSize > 0 && (
          <button
            type="button"
            className="ghost-btn danger"
            onClick={onClearCache}
            disabled={cacheProgress !== null}
            title="Clear all cached tiles"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            🗑️ Clear Cache
          </button>
        )}
      </div>

      <div className="offline-hint">
        <small>
          Download map tiles for offline use. Offline mode works when internet is unavailable.
        </small>
      </div>
    </div>
  );
};

export default OfflineControls;
