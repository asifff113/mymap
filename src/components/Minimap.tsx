import { useEffect, useRef } from 'react';

interface MinimapProps {
  center: { lat: number; lng: number };
  bearing: number;
  zoom: number;
  show3D: boolean;
}

const Minimap = ({ center, bearing, zoom, show3D }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simple map representation
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    // Draw camera indicator
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw viewing cone
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((bearing * Math.PI) / 180);

    ctx.fillStyle = show3D ? 'rgba(251, 191, 36, 0.3)' : 'rgba(37, 99, 235, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-15, 25);
    ctx.lineTo(15, 25);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = show3D ? '#fbbf24' : '#2563eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Draw center dot
    ctx.fillStyle = show3D ? '#fbbf24' : '#2563eb';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();

  }, [center, bearing, zoom, show3D]);

  return (
    <div className="minimap-container">
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        className="minimap-canvas"
      />
      <div className="minimap-info">
        <span>Z: {zoom.toFixed(1)}</span>
        <span>B: {Math.round(bearing)}°</span>
      </div>
    </div>
  );
};

export default Minimap;
