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
  g.flip();

  let relativeBearing = calculateBearing(myLat, myLon, triLat, triLon) - bearing;
  drawDotAtEdge(relativeBearing);
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


function toCartesian(lat, lon) {
  const x = Math.cos(lat) * Math.cos(lon);
  const y = Math.cos(lat) * Math.sin(lon);
  const z = Math.sin(lat);
  return { x, y, z };
}

function crossProduct(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function greatCircleBearingVector(point, bearing) {
  const lat = point.lat;
  const lon = point.lon;
  const north = { x: -Math.sin(lat), y: Math.cos(lat), z: 0 };
  const east = { x: -Math.sin(lon) * Math.cos(lat), y: -Math.cos(lon) * Math.cos(lat), z: Math.sin(lat) };
  return {
    x: Math.cos(bearing) * north.x + Math.sin(bearing) * east.x,
    y: Math.cos(bearing) * north.y + Math.sin(bearing) * east.y,
    z: Math.cos(bearing) * north.z + Math.sin(bearing) * east.z
  };
}

function distanceBetweenPoints(point1, point2) {
  const dotProduct = point1.x * point2.x + point1.y * point2.y + point1.z * point2.z;
  const angle = Math.acos(dotProduct);
  return angle; // in radians
}

function findIntersection(lat1, lon1, bearing1, lat2, lon2, bearing2) {
  const p1 = { lat: lat1, lon: lon1 };
  const p2 = { lat: lat2, lon: lon2 };

  const point1 = toCartesian(lat1, lon1);
  const point2 = toCartesian(lat2, lon2);

  const vector1 = greatCircleBearingVector(p1, bearing1);
  const vector2 = greatCircleBearingVector(p2, bearing2);

  const greatCircle1 = crossProduct(point1, vector1);
  const greatCircle2 = crossProduct(point2, vector2);

  const intersection1 = crossProduct(greatCircle1, greatCircle2);
  const intersection2 = { x: -intersection1.x, y: -intersection1.y, z: -intersection1.z }; // Antipodal point

  // Convert back to spherical coordinates
  const latA = Math.atan2(intersection1.z, Math.sqrt(intersection1.x * intersection1.x + intersection1.y * intersection1.y));
  const lonA = Math.atan2(intersection1.y, intersection1.x);
  const latB = Math.atan2(intersection2.z, Math.sqrt(intersection2.x * intersection2.x + intersection2.y * intersection2.y));
  const lonB = Math.atan2(intersection2.y, intersection2.x);

  // Determine which intersection is closer to the first point
  const distA = distanceBetweenPoints(point1, intersection1);
  const distB = distanceBetweenPoints(point1, intersection2);

  if (distA < distB) {
    return { lat: latA, lon: lonA };
  } else {
    return { lat: latB, lon: lonB };
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

function drawDotAtEdge(angle, dotRadius = 3) {
  const screenWidth = g.getWidth();
  const screenHeight = g.getHeight();
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;

  // Adjust the angle to match the screen's orientation (top of the screen is 0 radians)
  let screenAngle = angle - Math.PI / 2;

  // Calculate the slope of the line
  let slope = Math.tan(screenAngle);

  // Calculate potential intersection points with screen edges
  let edgeX, edgeY;

  if (screenAngle >= -Math.PI / 2 && screenAngle <= Math.PI / 2) {
    // Intersecting with right or left edge
    edgeX = (screenAngle > 0) ? screenWidth - dotRadius : dotRadius;
    edgeY = centerY - (centerX - edgeX) * slope;
  } else {
    // Intersecting with top or bottom edge
    edgeY = (screenAngle > Math.PI / 2 || screenAngle < -Math.PI / 2) ? dotRadius : screenHeight - dotRadius;
    edgeX = centerX + (centerY - edgeY) / slope;
  }

  // Draw the dot
  g.fillCircle(edgeX, edgeY, dotRadius);
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