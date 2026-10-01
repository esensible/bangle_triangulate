import { updateLocation, updateBearing, startCapture, stopCapture, triangulate } from './mainProc.js';
import { updateDisplay } from './display.js';
import { calcBearing, nmeaToDegrees } from './geoUtils.js';

const CAPTURE_TIME = 3000;
// Magnetic declination at the point of use, degrees, east positive (Adelaide ~ 8 E).
// true bearing = magnetic bearing + declination
const DECLINATION = 8.07 * Math.PI / 180;

var LEDTimeout = null;

Bangle.setGPSPower(2);
Bangle.setCompassPower(1);

Bangle.on('kill', () => {
  Bangle.setGPSPower(0);
  Bangle.setCompassPower(0);
});

Bangle.on('GPS-raw', function (nmea) {
  if (nmea.startsWith("$GNRMC")) {
    var data = nmea.split(",");

    if (data[2] === 'A') {
      // NMEA lat/lon fields are ddmm.mmmm / dddmm.mmmm, not decimal degrees
      var lat = nmeaToDegrees(data[3]);
      var ns = data[4];
      var lon = nmeaToDegrees(data[5]);
      var ew = data[6];

      // Adjust latitude and longitude based on N/S and E/W indicators
      lat = ns === 'S' ? -lat : lat;
      lon = ew === 'W' ? -lon : lon;
      lat = lat * Math.PI / 180;
      lon = lon * Math.PI / 180;

      let state = updateLocation(lat, lon);
      updateDisplay(state);
    }
  }
});

var xExtremes = null;
var yExtremes = null;
var zExtremes = null;

Bangle.on('mag', function (mag) {

  var acc = Bangle.getAccel();

  xExtremes = xExtremes === null ? [mag.x, mag.x] : [Math.min(xExtremes[0], mag.x), Math.max(xExtremes[1], mag.x)];
  yExtremes = yExtremes === null ? [mag.y, mag.y] : [Math.min(yExtremes[0], mag.y), Math.max(yExtremes[1], mag.y)];
  zExtremes = zExtremes === null ? [mag.z, mag.z] : [Math.min(zExtremes[0], mag.z), Math.max(zExtremes[1], mag.z)];

  var mX = mag.x - ((xExtremes[0] + xExtremes[1]) / 2);
  var mY = mag.y - ((yExtremes[0] + yExtremes[1]) / 2);
  var mZ = mag.z - ((zExtremes[0] + zExtremes[1]) / 2);

  // tilt-compensated magnetic bearing, converted to true
  let bearing = calcBearing(acc.x, acc.y, acc.z, mX, mY, mZ) + DECLINATION;
  if (bearing >= 2 * Math.PI) bearing -= 2 * Math.PI;

  let state = updateBearing(bearing);
  updateDisplay(state);
});


function captureTimeout() {
  stopCapture();
  let state = triangulate();
  updateDisplay(state);
  writeToFile("gps.json", JSON.stringify(state));
}

setWatch(function () {
  startCapture();
  setTimeout(captureTimeout, CAPTURE_TIME);
}, BTN, { repeat: true, edge: "rising" });


function writeToFile(filename, data) {
  // Open the file for writing
  var file = require("Storage").open(filename, "a");

  // Write data to the file
  file.write(data);
  file.write('\n');
}
