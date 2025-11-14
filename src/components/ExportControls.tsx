interface ExportControlsProps {
  hasRoute: boolean;
  onScreenshot: () => void;
  onExport: (format: 'gpx' | 'geojson') => void;
  onPrint: () => void;
}

const ExportControls = ({ hasRoute, onScreenshot, onExport, onPrint }: ExportControlsProps) => (
  <div className="export-controls">
    <h3 className="control-label">Export & Share</h3>
    
    <div className="export-grid">
      <button
        type="button"
        className="export-btn"
        onClick={onScreenshot}
        title="Download map as PNG"
      >
        <span className="export-btn-icon">📸</span>
        <span className="export-btn-label">Screenshot</span>
      </button>

      <button
        type="button"
        className="export-btn"
        onClick={() => onExport('gpx')}
        disabled={!hasRoute}
        title="Export route as GPX for GPS devices"
      >
        <span className="export-btn-icon">🗺️</span>
        <span className="export-btn-label">GPX</span>
      </button>

      <button
        type="button"
        className="export-btn"
        onClick={() => onExport('geojson')}
        disabled={!hasRoute}
        title="Export route as GeoJSON"
      >
        <span className="export-btn-icon">📄</span>
        <span className="export-btn-label">GeoJSON</span>
      </button>

      <button
        type="button"
        className="export-btn"
        onClick={onPrint}
        disabled={!hasRoute}
        title="Print turn-by-turn directions"
      >
        <span className="export-btn-icon">🖨️</span>
        <span className="export-btn-label">Print</span>
      </button>
    </div>
  </div>
);

export default ExportControls;
