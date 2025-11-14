interface HeatmapControlsProps {
  activeLayer: 'none' | 'traffic' | 'weather' | 'population';
  heatmapIntensity: number;
  onLayerChange: (layer: 'none' | 'traffic' | 'weather' | 'population') => void;
  onIntensityChange: (intensity: number) => void;
}

const HeatmapControls = ({
  activeLayer,
  heatmapIntensity,
  onLayerChange,
  onIntensityChange
}: HeatmapControlsProps) => (
  <div className="heatmap-controls">
    <div className="control-header">
      <h3 className="control-label">Heatmap Layers</h3>
      {activeLayer !== 'none' && (
        <span className="mode-badge">{activeLayer}</span>
      )}
    </div>

    <div className="heatmap-layers">
      <button
        type="button"
        className={`heatmap-layer-btn ${activeLayer === 'traffic' ? 'active' : ''}`}
        onClick={() => onLayerChange(activeLayer === 'traffic' ? 'none' : 'traffic')}
        title="Traffic congestion heatmap"
      >
        <span className="layer-icon">🚗</span>
        <span className="layer-label">Traffic</span>
      </button>

      <button
        type="button"
        className={`heatmap-layer-btn ${activeLayer === 'weather' ? 'active' : ''}`}
        onClick={() => onLayerChange(activeLayer === 'weather' ? 'none' : 'weather')}
        title="Temperature heatmap"
      >
        <span className="layer-icon">🌡️</span>
        <span className="layer-label">Weather</span>
      </button>

      <button
        type="button"
        className={`heatmap-layer-btn ${activeLayer === 'population' ? 'active' : ''}`}
        onClick={() => onLayerChange(activeLayer === 'population' ? 'none' : 'population')}
        title="Population density heatmap"
      >
        <span className="layer-icon">👥</span>
        <span className="layer-label">Population</span>
      </button>

      <button
        type="button"
        className="heatmap-layer-btn"
        onClick={() => onLayerChange('none')}
        disabled={activeLayer === 'none'}
        title="Clear heatmap"
      >
        <span className="layer-icon">✕</span>
        <span className="layer-label">Clear</span>
      </button>
    </div>

    {activeLayer !== 'none' && (
      <div className="heatmap-intensity-control">
        <label className="control-sublabel">
          Intensity: {Math.round(heatmapIntensity * 100)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={heatmapIntensity}
          onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
          className="slider"
        />
      </div>
    )}

    <div className="heatmap-legend">
      <div className="control-sublabel">Legend</div>
      <div className="legend-gradient">
        <span className="legend-label">Low</span>
        <div className="legend-bar" />
        <span className="legend-label">High</span>
      </div>
    </div>

    <div className="heatmap-hint">
      <small>
        {activeLayer === 'traffic' && 'Shows real-time traffic congestion levels'}
        {activeLayer === 'weather' && 'Shows temperature distribution across regions'}
        {activeLayer === 'population' && 'Shows population density by area'}
        {activeLayer === 'none' && 'Select a heatmap layer to visualize data'}
      </small>
    </div>
  </div>
);

export default HeatmapControls;
