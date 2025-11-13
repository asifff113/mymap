interface FloatingControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

const FloatingControls = ({ onZoomIn, onZoomOut, onResetView }: FloatingControlsProps) => (
  <div className="floating-controls" role="group" aria-label="Quick map actions">
    <button type="button" onClick={onZoomIn} aria-label="Zoom in">
      +
    </button>
    <button type="button" onClick={onZoomOut} aria-label="Zoom out">
      −
    </button>
    <button type="button" onClick={onResetView} aria-label="Reset view">
      ⟳
    </button>
  </div>
);

export default FloatingControls;
