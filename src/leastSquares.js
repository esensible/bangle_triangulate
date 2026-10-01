// Closed-form least-squares triangulation.
//
// Each observation is a ray from an observer position along a measured bearing.
// We work in a local east/north tangent plane (metres) and find the point that
// minimises the sum of squared perpendicular distances to all rays.  That is a
// 2x2 linear system, so there is no step size, no iteration and no convergence
// threshold - the issues that made the previous gradient descent a no-op.
//
// For two observations this is the ordinary intersection of the two rays.

const EARTH_RADIUS = 6371e3;

// observations: array of [lat, lon, bearing] (radians, bearing clockwise from true north)
// returns [lat, lon] in radians, or null if the rays are (near) parallel
export function estimate(observations) {
    if (observations.length < 2) return null;

    // tangent plane origin: first observer; scale longitude by cos of mean latitude
    var lat0 = observations[0][0];
    var lon0 = observations[0][1];
    var sumLat = 0;
    for (var k = 0; k < observations.length; k++) sumLat += observations[k][0];
    var cosLat = Math.cos(sumLat / observations.length);

    var A = 0, B = 0, C = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < observations.length; i++) {
        var obs = observations[i];
        var px = (obs[1] - lon0) * EARTH_RADIUS * cosLat; // east
        var py = (obs[0] - lat0) * EARTH_RADIUS;          // north
        // ray direction is (sin b, cos b); its unit normal is (cos b, -sin b)
        var nx = Math.cos(obs[2]);
        var ny = -Math.sin(obs[2]);
        var d = nx * px + ny * py;
        A += nx * nx; B += nx * ny; C += ny * ny;
        b1 += nx * d; b2 += ny * d;
    }

    var det = A * C - B * B;
    if (Math.abs(det) < 1e-9) return null;

    var x = (C * b1 - B * b2) / det;
    var y = (A * b2 - B * b1) / det;

    return [lat0 + y / EARTH_RADIUS, lon0 + x / (EARTH_RADIUS * cosLat)];
}
