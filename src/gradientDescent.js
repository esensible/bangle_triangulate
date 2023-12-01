
const CONVERGENCE_THRESHOLD = 1e-8;
const LEARNING_RATE = 1e-12;

export function estimate(observations, initial) {
    // Assuming make_j_prime is defined and returns a function
    var jPrime = make_j_prime(observations);

    // Initialize location
    var prevLat = initial[0];
    var prevLon = initial[1];

    var iterations = 0;

    // Gradient Descent Loop
    while (iterations < 100) {
        // Calculate the gradient
        var grad = jPrime(prevLat, prevLon);
        var gradLat = grad[0];
        var gradLon = grad[1];

        // Update the location
        var lat = prevLat + LEARNING_RATE * gradLat;
        var lon = prevLon + LEARNING_RATE * gradLon;

        // Check for convergence
        if (Math.abs(prevLat - lat) < CONVERGENCE_THRESHOLD &&
            Math.abs(prevLon - lon) < CONVERGENCE_THRESHOLD) {
            break;
        }

        // Update the previous objective function value
        prevLat = lat;
        prevLon = lon;
        iterations++;
    }

    return [prevLat, prevLon];
}

function bearing(lat_i, lon_i, lat, lon) {
    var dl = lon - lon_i;
    var x = Math.cos(lat_i) * Math.sin(lat) - Math.sin(lat_i) * Math.cos(lat) * Math.cos(dl);
    var y = Math.cos(lat) * Math.sin(dl);
    var bearing = Math.atan2(y, x);
    return bearing;
}

// gradient of bearing function with respect to lat and lon
function bearing_prime(lat_i, lon_i, lat, lon) {
    var y = Math.cos(lat) * Math.sin(lon - lon_i);
    var x = Math.cos(lat_i) * Math.sin(lat) - Math.sin(lat_i) * Math.cos(lat) * Math.cos(lon - lon_i);

    var y_prime_lat = -1.0 * Math.sin(lat) * Math.sin(lon - lon_i);
    var x_prime_lat = Math.cos(lat_i) * Math.cos(lat) - Math.sin(lat_i) * -1.0 * Math.sin(lat) * Math.cos(lon - lon_i);

    var y_prime_lon = Math.cos(lat) * Math.cos(lon - lon_i);
    var x_prime_lon = Math.sin(lat_i) * Math.cos(lat) * Math.sin(lon - lon_i);

    var denominator = (x * x + y * y);
    var lat_prime = x * y_prime_lat / denominator - y * x_prime_lat / denominator;
    var lon_prime = x * y_prime_lon / denominator - y * x_prime_lon / denominator;

    return [lat_prime, lon_prime];
}

// objective function for a single observation
function j_i(lat_i, lon_i, theta_i, lat, lon) {
    return -1.0 * Math.cos(theta_i - bearing(lat_i, lon_i, lat, lon));
}

// objective function over all observations
function make_j(observations) {
    return function j(lat, lon) {
        var sum = 0;
        for (var i = 0; i < observations.length; i++) {
            var obs = observations[i];
            sum += j_i(obs[0], obs[1], obs[2], lat, lon);
        }
        return sum;
    };
}

// gradient of objective function for a single observation
function j_prime_i(lat_i, lon_i, theta_i, lat, lon) {
    var tmp = Math.sin(theta_i - bearing(lat_i, lon_i, lat, lon));
    var dj = bearing_prime(lat_i, lon_i, lat, lon);
    return [
        tmp * dj[0],
        tmp * dj[1] 
    ];
}

// gradient of objective function over all observations
function make_j_prime(observations) {
    return function j_prime(lat, lon) {
        var sum_dj_dlat = 0;
        var sum_dj_dlon = 0;
        for (var i = 0; i < observations.length; i++) {
            var obs = observations[i];
            var result = j_prime_i(obs[0], obs[1], obs[2], lat, lon);
            sum_dj_dlat += result[0];
            sum_dj_dlon += result[1];
        }
        return [sum_dj_dlat, sum_dj_dlon];
    };
}
