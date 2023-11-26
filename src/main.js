import { findIntersection } from './trig.js';

const TRUE_NORTH_OFFSET = 8.07;

var gpsLocations = [];
var compassHeadings = [];

var measurements = [];
var triangulated = null;

var capture = false;

var bearing = 0;



Bangle.setGPSPower(1);
Bangle.setCompassPower(1);


// Bangle.on('kill', function () {
//   // Turn off the compass and GPS
//   Bangle.setCompassPower(0);
//   Bangle.setGPSPower(0);

//   console.log("App terminated. Sensors turned off.");
// });


Bangle.on('GPS-raw', function (nmea) {
  if (nmea.startsWith("$GNRMC")) {
    var data = nmea.split(",");

    if (data[2] === 'A') {
      LED1.write(true);
      if (!capture) {
        setTimeout(function () { LED1.write(false); }, 500);
      }

      var lat = parseFloat(data[3]) / 100;
      var ns = data[4];
      var lon = parseFloat(data[5]) / 100;
      var ew = data[6];

      // Adjust latitude and longitude based on N/S and E/W indicators
      lat = ns === 'S' ? -lat : lat;
      lon = ew === 'W' ? -lon : lon;
      lat = lat * Math.PI / 180;
      lon = lon * Math.PI / 180;

      if (triangulated) {
        updateDisplay(lat, lon, triangulated.lat, triangulated.lon);
      }

      if (capture) {
        gpsLocations.push({ lat, lon });
      }
    }
  }
});

function updateDisplay(myLat, myLon, triLat, triLon) {
  var earthRadius = 6371e3;
  let fromPoint = distance(myLat, myLon, triLat, triLon, earthRadius);
  console.log("distance: ", fromPoint);

  // Update the display
  g.clear();
  g.setFont("6x8", 2);
  g.drawString(fromPoint.toFixed(2), 20, 40);
  g.drawString("" + measurements.length, 20, 60);

  let relativeBearing = calculateBearing(triLat, triLon, myLat, myLon) - bearing;
  drawDotAtEdge(relativeBearing);

  g.flip();

  if (capture) {
    LED1.write(true);
  }
}


function distance(lat1, lon1, lat2, lon2, r) {
  const dlon = lon2 - lon1;
  const dlat = lat2 - lat1;

  const a = Math.pow(Math.sin(dlat / 2.0), 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.pow(Math.sin(dlon / 2.0), 2);

  const c = 2.0 * Math.asin(Math.sqrt(a));
  return r * c;
}


Bangle.on('mag', function (mag) {
  bearing = (parseFloat(mag.heading) - TRUE_NORTH_OFFSET) * Math.PI / 180;
  if (capture && mag.heading !== undefined) {
    compassHeadings.push(bearing);
  }
});


function startSensors() {
  capture = true;
  gpsLocations = [];
  compassHeadings = [];
  LED1.write(true);
}

function stopSensors() {
  LED1.write(false);
  capture = false;
  updateTriangulation();
}


function updateTriangulation() {
  var medianHeading = calculateMedian(compassHeadings);
  var medianLat = calculateMedian(gpsLocations.map(loc => loc.lat));
  var medianLon = calculateMedian(gpsLocations.map(loc => loc.lon));
  console.log("Median Heading: ", medianHeading);
  console.log("Median Location: Lat=", medianLat, " Lon=", medianLon);

  writeToFile("gps.json", JSON.stringify({ lat: medianLat, lon: medianLon, heading: medianHeading }));

  measurements.push({ lat: medianLat, lon: medianLon, heading: medianHeading });
  triangulated = pairwiseTriangulation(measurements);
  if (triangulated) {
    console.log("Triangulated: Lat=", triangulated.lat, " Lon=", triangulated.lon);
  }
}

setWatch(function () {
  console.log("Button pressed. Recording data...");
  startSensors();

  setTimeout(stopSensors, 3000);
}, BTN, { repeat: true, edge: "rising" });





function calculateMedian(array) {
  array.sort(function (a, b) { return a - b; });
  var middle = Math.floor(array.length / 2);
  if (array.length % 2) {
    return array[middle];
  } else {
    return (array[middle - 1] + array[middle]) / 2.0;
  }
}









function pairwiseTriangulation(measurements) {
  let lats = [];
  let lons = [];

  if (measurements.length <= 1) {
    return null;
  }

  for (let i = 0; i < measurements.length; i++) {
    for (let j = i + 1; j < measurements.length; j++) {
      let intersection = findIntersection(
        measurements[i].lat, measurements[i].lon, measurements[i].heading,
        measurements[j].lat, measurements[j].lon, measurements[j].heading
      );

      if (intersection) {
        lats.push(intersection.lat);
        lons.push(intersection.lon);
      }
    }
  }

  return { lat: calculateMedian(lats), lon: calculateMedian(lons) };
}


function writeToFile(filename, data) {
  // Open the file for writing
  var file = require("Storage").open(filename, "a");

  // Write data to the file
  file.write(data);

  // Optional: Console log for confirmation
  console.log("Data written to file: " + filename);
}

function drawDotAtEdge(angle) {
  const screenWidth = g.getWidth();
  const screenHeight = g.getHeight();
  const dotRadius = 3;

  // Adjust angle to start from the top of the screen
  let adjustedAngle = (angle - Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);

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

  // Draw the dot
  g.fillCircle(x, y, dotRadius);
}


function calculateBearing(lat1, lon1, lat2, lon2) {
  let dl = lon2 - lon1;
  let x = Math.cos(lat2) * Math.sin(dl);
  let y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dl);
  let bearingRad = Math.atan2(x, y);

  // Normalize bearing to the range 0 to 2 * Math.PI
  bearingRad = (bearingRad + 2.0 * Math.PI) % (2.0 * Math.PI);
  return bearingRad;
}