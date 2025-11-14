import { useEffect, useRef, useState } from 'react';
import type { BoundingBox, LatLng } from '../types';

interface MinimapProps {
  center: { lat: number; lng: number };
  bearing: number;
  zoom: number;
  show3D: boolean;
  bounds?: BoundingBox;
  onPanTo: (coords: LatLng) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Minimap = ({ center, bearing, zoom, show3D, bounds, onPanTo }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const [hoverLabel, setHoverLabel] = useState('');

  const project = (lat: number, lng: number, width: number, height: number) => ({
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height
  });

  const drawMinimap = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= canvas.width; i += 20) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
    }
    for (let i = 0; i <= canvas.height; i += 20) {
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    if (bounds) {
      const [south, north, west, east] = bounds;
      const corners = [
        project(north, west, canvas.width, canvas.height),
        project(north, east, canvas.width, canvas.height),
        project(south, east, canvas.width, canvas.height),
        project(south, west, canvas.width, canvas.height)
      ];

      ctx.fillStyle = show3D ? 'rgba(251, 191, 36, 0.15)' : 'rgba(37, 99, 235, 0.15)';
      ctx.strokeStyle = show3D ? '#fbbf24' : '#60a5fa';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i += 1) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    const centerPoint = project(center.lat, center.lng, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerPoint.x, centerPoint.y);
    ctx.rotate((bearing * Math.PI) / 180);

    ctx.fillStyle = show3D ? 'rgba(251, 191, 36, 0.3)' : 'rgba(37, 99, 235, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, 22);
    ctx.lineTo(14, 22);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = show3D ? '#fbbf24' : '#2563eb';
    ctx.beginPath();
    ctx.arc(centerPoint.x, centerPoint.y, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  useEffect(() => {
    drawMinimap();
  }, [center, bearing, zoom, show3D, bounds]);

  const panToEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const lng = x * 360 - 180;
    const lat = 90 - y * 180;
    onPanTo({ lat: clamp(lat, -85, 85), lng: clamp(lng, -180, 180) });
    setHoverLabel(`${lat.toFixed(2)}, ${lng.toFixed(2)}`);
  };

  return (
    <div className="minimap-container">
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        className="minimap-canvas"
        onPointerDown={(event) => {
          event.preventDefault();
          isDraggingRef.current = true;
          panToEvent(event);
        }}
        onPointerMove={(event) => {
          if (isDraggingRef.current) {
            event.preventDefault();
            panToEvent(event);
          }
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
          setHoverLabel('');
        }}
        onPointerLeave={() => {
          isDraggingRef.current = false;
          setHoverLabel('');
        }}
      />
      <div className="minimap-info">
        <span>Z: {zoom.toFixed(1)}</span>
        <span>B: {Math.round(bearing)}°</span>
        {hoverLabel && <span>{hoverLabel}</span>}
      </div>
    </div>
  );
};

export default Minimap;
