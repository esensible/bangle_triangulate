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


export function calcBearing(gX, gY, gZ, mX, mY, mZ) {
  
  // Calculate pitch and roll from the accelerometer data
  const pitch = Math.atan2(gY, Math.sqrt(gX * gX + gZ * gZ));
  const roll = Math.atan2(gX, Math.sqrt(gY * gY + gZ * gZ));

  // Tilt compensation for magnetometer
  const MxPrime = mX * Math.cos(roll) + mZ * Math.sin(roll);
  const MzPrime = -mX * Math.sin(roll) + mZ * Math.cos(roll);
  const MyDoublePrime = mY * Math.cos(pitch) - MzPrime * Math.sin(pitch);

  // Calculate the heading
  const heading = Math.atan2(MyDoublePrime, MxPrime) - Math.PI / 2.0;

  return heading < 0 ? heading + 2.0 * Math.PI : heading;
}
