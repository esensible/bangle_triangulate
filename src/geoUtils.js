export function calculateBearing(lat1, lon1, lat2, lon2) {
    let dl = lon2 - lon1;
    let x = Math.cos(lat2) * Math.sin(dl);
    let y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dl);
    let bearingRad = Math.atan2(x, y);
  
    // Normalize bearing to the range 0 to 2 * Math.PI
    bearingRad = (bearingRad + 2.0 * Math.PI) % (2.0 * Math.PI);
    return bearingRad;
}


export function distance(lat1, lon1, lat2, lon2, r) {
    const dlon = lon2 - lon1;
    const dlat = lat2 - lat1;

    const a = Math.pow(Math.sin(dlat / 2.0), 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.pow(Math.sin(dlon / 2.0), 2);

    const c = 2.0 * Math.asin(Math.sqrt(a));
    return r * c;
}


export function median(array) {
  array.sort(function (a, b) { return a - b; });
  var middle = Math.floor(array.length / 2);
  if (array.length % 2) {
    return array[middle];
  } else {
    return (array[middle - 1] + array[middle]) / 2.0;
  }
}


export function meanBearing(bearings) {
  var sumX = 0;
  var sumY = 0;

  bearings.forEach(function(bearing) {
      sumX += Math.cos(bearing);
      sumY += Math.sin(bearing);
  });

  var meanX = sumX / bearings.length;
  var meanY = sumY / bearings.length;

  var meanBearing = Math.atan2(meanY, meanX);

  // Ensure the result is between 0 and 2π
  if (meanBearing < 0) {
      meanBearing += 2 * Math.PI;
  }

  return meanBearing;
}


// Convert an NMEA ddmm.mmmm / dddmm.mmmm field to decimal degrees.
export function nmeaToDegrees(field) {
  var v = parseFloat(field);
  var deg = Math.floor(v / 100);
  return deg + (v - deg * 100) / 60;
}


// Tilt-compensated magnetic heading, radians clockwise from magnetic north in [0, 2pi).
//
// gX,gY,gZ: accelerometer reading in g (Bangle.getAccel(): z is about -1 when face up)
// mX,mY,mZ: hard-iron corrected magnetometer reading
//
// This is the formulation used by the Bangle.js 2 "magnav" app (NXP AN4248 style),
// which encodes the actual axis relationship between the Bangle.js 2 accelerometer
// and magnetometer.  When the watch is level it reduces to atan2(-mX, mY), which
// is exactly the firmware's own mag.heading.
export function calcBearing(gX, gY, gZ, mX, mY, mZ) {
  var phi = Math.atan2(-gX, -gZ);
  var cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
  var theta = Math.atan2(-gY, -gX * sinPhi - gZ * cosPhi);
  var cosTheta = Math.cos(theta), sinTheta = Math.sin(theta);

  var xh = mY * cosTheta + mX * sinPhi * sinTheta + mZ * cosPhi * sinTheta;
  var yh = mZ * sinPhi - mX * cosPhi;

  var heading = Math.atan2(yh, xh);
  return heading < 0 ? heading + 2.0 * Math.PI : heading;
}
