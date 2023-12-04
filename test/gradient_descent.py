from math import sin
from bearing_funcs import bearing, bearing_prime

CONVERGENCE_THRESHOLD = 1e-9
LEARNING_RATE = 1e-12


def objective_prime_i(lat_i, lon_i, theta_i, lat, lon):
    # d cos(x) / dx = -sin(x)
    # -ve cancels the negative in the objective function
    tmp = sin(theta_i - bearing(lat_i, lon_i, lat, lon))
    dj_dlat, dj_dlon = bearing_prime(lat_i, lon_i, lat, lon)
    return (
       tmp * dj_dlat,
       tmp * dj_dlon
    )

def make_objective_prime(observations):
    def _impl(lat, lon):
        tmp = (
            objective_prime_i(lat_i, lon_i, theta_i, lat, lon) 
            for lat_i, lon_i, theta_i in observations
        )
        return map(sum, zip(*tmp))
    return _impl

def estimate(observations, initial):
    # Create the objective function and its gradient
    j_prime = make_objective_prime(observations)

    # Initialize location
    prev_lat, prev_lon = [initial[0]], [initial[1]]
    

    iterations = 0

    # Gradient Descent Loop
    # while iterations <  100:
    while True:
        # Calculate the gradient
        grad_lat, grad_lon = j_prime(prev_lat[-1], prev_lon[-1])

        # grad_lat = max(-10.0, min(10.0, grad_lat))
        # grad_lon = max(-10.0, min(10.0, grad_lon))

        # print(grad_lat, grad_lon)

        # Update the location
        lat = prev_lat[-1] + LEARNING_RATE * grad_lat
        lon = prev_lon[-1] + LEARNING_RATE * grad_lon

        # Check for convergence: change in objective function is below threshold
        if abs(prev_lat[-1] - lat) < CONVERGENCE_THRESHOLD and abs(prev_lon[-1] - lon) < CONVERGENCE_THRESHOLD:
            break

        # Update the previous objective function value
        prev_lat.append(lat)
        prev_lon.append(lon)
        iterations += 1
    print(iterations)
        # print(prev_lat, prev_lon)

    prev_lat.append(lat)
    prev_lon.append(lon)

    return prev_lat, prev_lon