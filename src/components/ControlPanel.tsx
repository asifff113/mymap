import type { MapStyleOption } from '../types';

interface ControlPanelProps {
  styles: MapStyleOption[];
  activeStyleId: string;
  isThreeD: boolean;
  onStyleChange: (styleId: string) => void;
  onLocateMe: () => void;
  onToggleThreeD: () => void;
}

const ControlPanel = ({
  styles,
  activeStyleId,
  isThreeD,
  onStyleChange,
  onLocateMe,
  onToggleThreeD
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
      <button type="button" className="ghost-btn" onClick={onToggleThreeD}>
        {isThreeD ? 'Exit 3D' : '3D tilt'}
      </button>
    </div>
  </section>
);

export default ControlPanel;
