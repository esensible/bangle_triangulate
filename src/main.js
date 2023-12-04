import { updateLocation, updateBearing, startCapture, stopCapture, triangulate } from './mainProc.js';
import { updateDisplay } from './display.js';
import { calcBearing } from './geoUtils.js';

const CAPTURE_TIME = 3000;
const TRUE_NORTH_OFFSET = 8.07;
const capture = false;

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
      var lat = parseFloat(data[3]) / 100;
      var ns = data[4];
      var lon = parseFloat(data[5]) / 100;
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

  // let heading = (parseFloat(mag.heading) - TRUE_NORTH_OFFSET) * Math.PI / 180;

  var acc = Bangle.getAccel();

  xExtremes = xExtremes === null ? [mag.x, mag.x] : [Math.min(xExtremes[0], mag.x), Math.max(xExtremes[1], mag.x)];
  yExtremes = yExtremes === null ? [mag.y, mag.y] : [Math.min(yExtremes[0], mag.y), Math.max(yExtremes[1], mag.y)];
  zExtremes = zExtremes === null ? [mag.z, mag.z] : [Math.min(zExtremes[0], mag.z), Math.max(zExtremes[1], mag.z)];

  mX = mag.x - ((xExtremes[0] + xExtremes[1]) / 2);
  mY = mag.y - ((yExtremes[0] + yExtremes[1]) / 2);
  mZ = mag.z - ((zExtremes[0] + zExtremes[1]) / 2);

  let bearing = calcBearing(acc.x, acc.y, acc.z, mX, mY, mZ);
  // console.log(heading, bearing, acc.x, acc.y, acc.z, mX, mY, mZ);

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
