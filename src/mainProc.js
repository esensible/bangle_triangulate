// This implementation is really just to test the display function

import { median, meanBearing } from './geoUtils.js';
import { intersect } from './norm.js';
import { estimate } from './gradientDescent';

var state = {
    location: null,
    bearing: null,
    triangulated: null,
    capture: false,
    measurements: [],
};


var bearings = [];
var lats = [];
var lons = [];


export function updateLocation(lat, lon) {
    state.location = [lat, lon];

    if (state.capture) {
        lats.push(lat);
        lons.push(lon);
    }

    return state;
}

export function triangulate() {
    var bearing = meanBearing(bearings);
    var lat = median(lats);
    var lon = median(lons);
  
    state.measurements.push([lat, lon, bearing]);
    if (state.measurements.length < 2) {
      return state;
    } else if (state.measurements.length == 2) {
      state.triangulated = intersect(
        state.measurements[0][0], state.measurements[0][1], state.measurements[0][2],
        state.measurements[1][0], state.measurements[1][1], state.measurements[1][2]
      )
    } else {
      state.triangulated = estimate(state.measurements, state.triangulated);
    }

    return state;
}

export function updateBearing(bearing) {
    state.bearing = bearing;

    if (state.capture) {
        bearings.push(state.bearing);
    }
    
    return state;
}

export function startCapture() {
    if (state.location === null || state.bearing === null) {
        return;
    }

    // start with the most recent value so we for sure have at least 1 value
    bearings = [state.bearing];
    lats = [state.location[0]];
    lons = [state.location[1]];

    state.capture = true;
}

export function stopCapture() {
    state.capture = false;
}
