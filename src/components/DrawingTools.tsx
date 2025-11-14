import type { DrawingMode, DrawingShape } from '../types';

interface DrawingToolsProps {
  mode: DrawingMode;
  shapes: DrawingShape[];
  currentColor: string;
  onModeChange: (mode: DrawingMode) => void;
  onColorChange: (color: string) => void;
  onClearAll: () => void;
  onDeleteShape: (id: string) => void;
  onExportShapes: () => void;
}

const COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' }
];

const DrawingTools = ({
  mode,
  shapes,
  currentColor,
  onModeChange,
  onColorChange,
  onClearAll,
  onDeleteShape,
  onExportShapes
}: DrawingToolsProps) => (
  <div className="drawing-tools">
    <div className="control-header">
      <h3 className="control-label">Drawing Tools</h3>
      {mode !== 'none' && (
        <span className="mode-badge">{mode} mode</span>
      )}
    </div>

    <div className="drawing-mode-grid">
      <button
        type="button"
        className={`drawing-mode-btn ${mode === 'polygon' ? 'active' : ''}`}
        onClick={() => onModeChange(mode === 'polygon' ? 'none' : 'polygon')}
        title="Draw polygon"
      >
        <span className="mode-icon">⬟</span>
        <span className="mode-label">Polygon</span>
      </button>

      <button
        type="button"
        className={`drawing-mode-btn ${mode === 'line' ? 'active' : ''}`}
        onClick={() => onModeChange(mode === 'line' ? 'none' : 'line')}
        title="Draw line"
      >
        <span className="mode-icon">╱</span>
        <span className="mode-label">Line</span>
      </button>

      <button
        type="button"
        className={`drawing-mode-btn ${mode === 'circle' ? 'active' : ''}`}
        onClick={() => onModeChange(mode === 'circle' ? 'none' : 'circle')}
        title="Draw circle"
      >
        <span className="mode-icon">◯</span>
        <span className="mode-label">Circle</span>
      </button>

      <button
        type="button"
        className="drawing-mode-btn"
        onClick={() => onModeChange('none')}
        disabled={mode === 'none'}
        title="Cancel drawing"
      >
        <span className="mode-icon">✕</span>
        <span className="mode-label">Cancel</span>
      </button>
    </div>

    <div className="color-picker">
      <label className="control-sublabel">Color:</label>
      <div className="color-swatches">
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`color-swatch ${currentColor === value ? 'active' : ''}`}
            style={{ backgroundColor: value }}
            onClick={() => onColorChange(value)}
            title={label}
            aria-label={label}
          />
        ))}
      </div>
    </div>

    {shapes.length > 0 && (
      <>
        <div className="shapes-list">
          <div className="shapes-header">
            <span className="control-sublabel">Shapes ({shapes.length})</span>
            <button
              type="button"
              className="text-btn danger"
              onClick={onClearAll}
              title="Delete all shapes"
            >
              Clear All
            </button>
          </div>
          <div className="shapes-items">
            {shapes.map((shape) => (
              <div key={shape.id} className="shape-item">
                <div className="shape-info">
                  <span
                    className="shape-color-indicator"
                    style={{ backgroundColor: shape.properties.color }}
                  />
                  <span className="shape-type">{shape.type}</span>
                  <span className="shape-points">
                    {shape.coordinates.length} pts
                  </span>
                </div>
                <button
                  type="button"
                  className="shape-delete-btn"
                  onClick={() => onDeleteShape(shape.id)}
                  title="Delete shape"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ghost-btn"
          onClick={onExportShapes}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          💾 Export Shapes
        </button>
      </>
    )}

    {mode !== 'none' && (
      <div className="drawing-hint">
        <small>
          {mode === 'polygon' && 'Click to add points. Double-click or press Enter to finish.'}
          {mode === 'line' && 'Click to add points. Double-click or press Enter to finish.'}
          {mode === 'circle' && 'Click center, then click to set radius.'}
        </small>
      </div>
    )}
  </div>
);

export default DrawingTools;
