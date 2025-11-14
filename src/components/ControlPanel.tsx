import ThemeToggle from './ThemeToggle';
import type { MapStyleOption } from '../types';

interface ControlPanelProps {
  styles: MapStyleOption[];
  activeStyleId: string;
  isGlobeView: boolean;
  showBuildings: boolean;
  buildingScale: number;
  timeOfDay: 'auto' | 'day' | 'night';
  shadowIntensity: number;
  onStyleChange: (styleId: string) => void;
  onLocateMe: () => void;
  onToggleGlobe: () => void;
  onToggleBuildings: () => void;
  onBuildingScaleChange: (value: number) => void;
  onTimeOfDayChange: (mode: 'auto' | 'day' | 'night') => void;
  onShadowIntensityChange: (value: number) => void;
  onCameraPreset: (preset: 'topDown' | 'overview' | 'street') => void;
  tourStops: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  onSelectTourStop: (stopId: string) => void;
}

const ControlPanel = ({
  styles,
  activeStyleId,
  isGlobeView,
  showBuildings,
  buildingScale,
  timeOfDay,
  shadowIntensity,
  onStyleChange,
  onLocateMe,
  onToggleGlobe,
  onToggleBuildings,
  onBuildingScaleChange,
  onTimeOfDayChange,
  onShadowIntensityChange,
  onCameraPreset,
  tourStops,
  onSelectTourStop
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
      <ThemeToggle />
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

    {showBuildings && (
      <>
        <div className="control-slider">
          <label htmlFor="building-scale">Height boost</label>
          <input
            id="building-scale"
            type="range"
            min={1}
            max={2}
            step={0.05}
            value={buildingScale}
            onChange={(event) => onBuildingScaleChange(Number(event.target.value))}
          />
          <span>{Math.round((buildingScale - 1) * 100)}%</span>
        </div>

        <div className="control-slider">
          <label htmlFor="shadow-intensity">Shadow intensity</label>
          <input
            id="shadow-intensity"
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={shadowIntensity}
            onChange={(event) => onShadowIntensityChange(Number(event.target.value))}
          />
          <span>{Math.round(shadowIntensity * 100)}%</span>
        </div>

        <div className="control-group" style={{ marginTop: '0.6rem' }}>
          <label className="control-label">Day/Night</label>
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-btn ${timeOfDay === 'auto' ? 'active' : ''}`}
              onClick={() => onTimeOfDayChange('auto')}
            >
              Auto
            </button>
            <button
              type="button"
              className={`mode-btn ${timeOfDay === 'day' ? 'active' : ''}`}
              onClick={() => onTimeOfDayChange('day')}
            >
              ☀️ Day
            </button>
            <button
              type="button"
              className={`mode-btn ${timeOfDay === 'night' ? 'active' : ''}`}
              onClick={() => onTimeOfDayChange('night')}
            >
              🌙 Night
            </button>
          </div>
        </div>

        <div className="control-group" style={{ marginTop: '0.6rem' }}>
          <label className="control-label">Camera Presets</label>
          <div className="mode-toggle">
            <button
              type="button"
              className="mode-btn"
              onClick={() => onCameraPreset('topDown')}
            >
              ⬇️ Top
            </button>
            <button
              type="button"
              className="mode-btn"
              onClick={() => onCameraPreset('overview')}
            >
              📐 45°
            </button>
            <button
              type="button"
              className="mode-btn"
              onClick={() => onCameraPreset('street')}
            >
              👁️ Street
            </button>
          </div>
        </div>
      </>
    )}

    <div className="control-group" style={{ marginTop: '0.75rem' }}>
      <label className="control-label">Guided tours</label>
      <p className="muted-subcopy">Fly to curated scenes with a single tap.</p>
      <div className="tour-grid">
        {tourStops.map((stop) => (
          <button
            key={stop.id}
            type="button"
            className="tour-btn"
            onClick={() => onSelectTourStop(stop.id)}
          >
            <span>{stop.label}</span>
            <small>{stop.description}</small>
          </button>
        ))}
      </div>
    </div>
  </section>
);

export default ControlPanel;
