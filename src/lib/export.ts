import type { RouteSummary } from '../types';

export const exportAsGPX = (route: RouteSummary): void => {
  const coordinates = route.geometry.geometry.coordinates;
  
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MyMap" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Route Export</name>
    <desc>Distance: ${(route.distance / 1000).toFixed(2)} km, Duration: ${Math.round(route.duration / 60)} min</desc>
  </metadata>
  <trk>
    <name>Route</name>
    <trkseg>
`;

  coordinates.forEach((coord) => {
    const [lng, lat] = coord;
    gpxContent += `      <trkpt lat="${lat}" lon="${lng}"></trkpt>\n`;
  });

  gpxContent += `    </trkseg>
  </trk>
</gpx>`;

  downloadFile(gpxContent, 'route.gpx', 'application/gpx+xml');
};

export const exportAsGeoJSON = (route: RouteSummary): void => {
  const geoJSON = JSON.stringify(route.geometry, null, 2);
  downloadFile(geoJSON, 'route.geojson', 'application/json');
};

export const captureScreenshot = async (canvasElement: HTMLCanvasElement): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      canvasElement.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create screenshot'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `map-screenshot-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
};

export const printDirections = (route: RouteSummary): void => {
  if (!route.steps || route.steps.length === 0) {
    alert('No turn-by-turn directions available for this route.');
    return;
  }

  const formatDistance = (meters: number): string => {
    if (meters > 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  let printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Route Directions</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
    }
    h1 {
      color: #0f172a;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 10px;
    }
    .summary {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .summary strong {
      color: #0f172a;
    }
    .step {
      padding: 12px;
      margin: 10px 0;
      border-left: 3px solid #2563eb;
      background: #f8fafc;
    }
    .step-num {
      font-weight: bold;
      color: #2563eb;
    }
    .step-meta {
      color: #64748b;
      font-size: 0.9em;
      margin-top: 5px;
    }
    @media print {
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <h1>Route Directions</h1>
  <div class="summary">
    <p><strong>Total Distance:</strong> ${formatDistance(route.distance)}</p>
    <p><strong>Total Duration:</strong> ${formatDuration(route.duration)}</p>
    <p><strong>Number of Steps:</strong> ${route.steps.length}</p>
  </div>
  <h2>Turn-by-Turn Directions</h2>
`;

  route.steps.forEach((step, index) => {
    printContent += `
  <div class="step">
    <div><span class="step-num">${index + 1}.</span> ${step.instruction}</div>
    <div class="step-meta">${formatDistance(step.distance)} · ${formatDuration(step.duration)}</div>
  </div>
`;
  });

  printContent += `
  <button class="no-print" onclick="window.print()" style="
    margin-top: 20px;
    padding: 10px 20px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  ">Print Directions</button>
</body>
</html>
`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};
