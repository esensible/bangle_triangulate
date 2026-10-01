// Closed-form, range-weighted least-squares triangulation.
//
// Each observation is a ray from an observer position along a measured bearing.
// We work in a local east/north tangent plane (metres) and find the point that
// minimises the weighted sum of squared perpendicular distances to all rays.
// That is a 2x2 linear system: no step size, no iteration count, no convergence
// threshold - the issues that made the previous gradient descent a no-op.
//
// Error model.  The perpendicular miss of ray i at the target is
//     range_i * (bearing error_i)  +  (observer position error)
// so its variance is  range_i^2 * SIGMA_BEARING^2 + SIGMA_POSITION^2.
// Dividing by that variance weights each ray by how trustworthy it is: a near
// station's bearing is dominated by GPS error (5 m at 50 m is almost 6 degrees),
// a distant station's by compass/aiming error.  Equivalently the angular error of
// a station is  sqrt(SIGMA_BEARING^2 + (SIGMA_POSITION / range)^2),  which is why
// near measurements are observed to be angularly worse than distant ones.
//
// Range is not known until the target is estimated, so we solve unweighted first
// and then re-solve with weights from the previous estimate a few times (IRLS).
// Getting the two sigmas wrong by a factor of 3 costs only a few percent.

const EARTH_RADIUS = 6371e3;
const SIGMA_BEARING = 5 * Math.PI / 180; // compass + aiming error, radians
const SIGMA_POSITION = 5;                // GPS error of a 3 s median, metres
const REWEIGHT_PASSES = 3;

// observations: array of [lat, lon, bearing] (radians, bearing clockwise from true north)
// passes: number of reweighting passes (0 = plain unweighted least squares)
// returns [lat, lon] in radians, or null if the rays are (near) parallel
export function estimate(observations, passes) {
    if (observations.length < 2) return null;
    if (passes === undefined) passes = REWEIGHT_PASSES;

    var lat0 = observations[0][0];
    var lon0 = observations[0][1];
    var sumLat = 0;
    for (var k = 0; k < observations.length; k++) sumLat += observations[k][0];
    var cosLat = Math.cos(sumLat / observations.length);

    // observer positions in the tangent plane (east, north) metres
    var px = [], py = [];
    for (var i = 0; i < observations.length; i++) {
        px.push((observations[i][1] - lon0) * EARTH_RADIUS * cosLat);
        py.push((observations[i][0] - lat0) * EARTH_RADIUS);
    }

    var weights = null;
    var x = 0, y = 0;
    for (var pass = 0; pass <= passes; pass++) {
        var A = 0, B = 0, C = 0, b1 = 0, b2 = 0;
        for (var j = 0; j < observations.length; j++) {
            // ray direction is (sin b, cos b); its unit normal is (cos b, -sin b)
            var nx = Math.cos(observations[j][2]);
            var ny = -Math.sin(observations[j][2]);
            var d = nx * px[j] + ny * py[j];
            var w = weights === null ? 1 : weights[j];
            A += w * nx * nx; B += w * nx * ny; C += w * ny * ny;
            b1 += w * nx * d; b2 += w * ny * d;
        }
        var det = A * C - B * B;
        if (Math.abs(det) < 1e-9) return pass === 0 ? null : toLatLon(x, y, lat0, lon0, cosLat);

        x = (C * b1 - B * b2) / det;
        y = (A * b2 - B * b1) / det;

        // weights for the next pass from the ranges implied by this estimate
        weights = [];
        for (var m = 0; m < observations.length; m++) {
            var dx = x - px[m], dy = y - py[m];
            var range2 = Math.max(dx * dx + dy * dy, 1);
            weights.push(1 / (range2 * SIGMA_BEARING * SIGMA_BEARING + SIGMA_POSITION * SIGMA_POSITION));
        }
    }

    return toLatLon(x, y, lat0, lon0, cosLat);
}

function toLatLon(x, y, lat0, lon0, cosLat) {
    return [lat0 + y / EARTH_RADIUS, lon0 + x / (EARTH_RADIUS * cosLat)];
}
