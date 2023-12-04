// This implementation is really just to test the display function
var state = {
    location: null,
    bearing: null,
    triangulated: null,
};

export function updateLocation(lat, lon) {
    // first location is our triangulated point
    if (state.triangulated === null) {
        state.triangulated = [lat, lon];
    }
    
    state.location = [lat, lon];

    return state;
}

export function triangulate() {
    state.triangulated = state.location;
}

export function updateBearing(bearing) {
    state.bearing = bearing;
    
    return state;
}

export function startCapture() { }

export function stopCapture() {
    return true;
}
