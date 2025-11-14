interface BuildingInfoPopupProps {
  building: {
    name?: string;
    height?: number;
    levels?: number;
    type?: string;
    address?: string;
  } | null;
  position: { x: number; y: number };
}

const BuildingInfoPopup = ({ building, position }: BuildingInfoPopupProps) => {
  if (!building) return null;

  return (
    <div
      className="building-info-popup"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="popup-header">
        <h3>{building.name || 'Building'}</h3>
      </div>
      <div className="popup-content">
        {building.height && (
          <div className="popup-row">
            <span className="popup-label">Height:</span>
            <span className="popup-value">{Math.round(building.height)}m</span>
          </div>
        )}
        {building.levels && (
          <div className="popup-row">
            <span className="popup-label">Floors:</span>
            <span className="popup-value">{building.levels}</span>
          </div>
        )}
        {building.type && (
          <div className="popup-row">
            <span className="popup-label">Type:</span>
            <span className="popup-value">{building.type}</span>
          </div>
        )}
        {building.address && (
          <div className="popup-row">
            <span className="popup-label">Address:</span>
            <span className="popup-value">{building.address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingInfoPopup;
