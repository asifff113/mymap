import type { MapStyleOption } from '../types';

interface ControlPanelProps {
  styles: MapStyleOption[];
  activeStyleId: string;
  isGlobeView: boolean;
  showBuildings: boolean;
  onStyleChange: (styleId: string) => void;
  onLocateMe: () => void;
  onToggleGlobe: () => void;
  onToggleBuildings: () => void;
}

const ControlPanel = ({
  styles,
  activeStyleId,
  isGlobeView,
  showBuildings,
  onStyleChange,
  onLocateMe,
  onToggleGlobe,
  onToggleBuildings
}: ControlPanelProps) => (
  <section className="glass-panel" aria-label="Map controls">
    <h2 className="panel-title">Map controls</h2>
    <div className="toggle-grid">
      {styles.map((style) => (
        <button
          key={style.id}
          type="button"
          className={`toggle-btn ${style.id === activeStyleId ? 'active' : ''}`}
          onClick={() => onStyleChange(style.id)}
        >
          {style.label}
        </button>
      ))}
    </div>

    <div className="action-row" style={{ marginTop: '0.8rem' }}>
      <button type="button" className="ghost-btn" onClick={onLocateMe}>
        Locate me
      </button>
      <button type="button" className="ghost-btn" onClick={onToggleGlobe}>
        {isGlobeView ? 'Flat map' : 'Earth globe'}
      </button>
    </div>

    <div className="action-row" style={{ marginTop: '0.4rem' }}>
      <button
        type="button"
        className={`ghost-btn ${showBuildings ? 'active' : ''}`}
        onClick={onToggleBuildings}
      >
        {showBuildings ? 'Hide 3D buildings' : '3D buildings'}
      </button>
    </div>
  </section>
);

export default ControlPanel;
