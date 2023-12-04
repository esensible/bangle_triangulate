import { distance, calculateBearing } from './geoUtils';

export function updateDisplay(state) {

    location = state.location;
    bearing = state.bearing;
    triangulated = state.triangulated;

    g.clear();

    if (bearing !== null) {
        const dotRadius = state.capture ? 10: (location !== null ? 5 : 3);

        // point north
        g.setColor(1, 0, 0);
        drawDotAtEdge(0.0 - bearing, dotRadius);
        g.setColor(0, 0, 0);

    }

    if (location !== null && bearing !== null && triangulated !== null) {
        var earthRadius = 6371e3;
        let fromPoint = distance(location[0], location[1], triangulated[0], triangulated[1], earthRadius);
        // console.log("distance: ", fromPoint);
      
        // Update the display
        g.setFont("6x8", 4);
        g.drawString(fromPoint.toFixed(2), 20, 40);
        g.drawString("" + state.measurements.length, 20, 80);
      
        if (bearing !== null) {
            let relativeBearing = calculateBearing(location[0], location[1], triangulated[0], triangulated[1]) - bearing;
            drawDotAtEdge(relativeBearing);
        }
    }
  
    g.flip();
}


function drawDotAtEdge(angle, dotRadius) {
    const screenWidth = g.getWidth();
    const screenHeight = g.getHeight();
    dotRadius = dotRadius || 3;
  
    adjustedAngle = (angle + 2 * Math.PI) % (2 * Math.PI);

    // Calculate x, y coordinates based on the quadrant
    let x, y;
    if (adjustedAngle <= Math.PI / 4 || adjustedAngle > 7 * Math.PI / 4) {
        // Top edge
        x = screenWidth / 2 + (screenWidth / 2 - dotRadius) * Math.tan(adjustedAngle);
        y = dotRadius;
    } else if (adjustedAngle > Math.PI / 4 && adjustedAngle <= 3 * Math.PI / 4) {
        // Right edge
        x = screenWidth - dotRadius;
        y = screenHeight / 2 - (screenWidth / 2 - dotRadius) * Math.tan(Math.PI / 2 - adjustedAngle);
    } else if (adjustedAngle > 3 * Math.PI / 4 && adjustedAngle <= 5 * Math.PI / 4) {
        // Bottom edge
        x = screenWidth / 2 - (screenWidth / 2 - dotRadius) * Math.tan(adjustedAngle - Math.PI);
        y = screenHeight - dotRadius;
    } else {
        // Left edge
        x = dotRadius;
        y = screenHeight / 2 + (screenWidth / 2 - dotRadius) * Math.tan(3 * Math.PI / 2 - adjustedAngle);
    }
  
    g.fillCircle(x, y, dotRadius);
 }
