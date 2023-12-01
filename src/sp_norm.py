import numpy as np
from geopy.distance import geodesic, distance
from geopy.point import Point
from math import cos, sin, atan2, pi, log10
# from sympy import cos, sin, atan2, pi, symbols, diff
# lat_i, lon_i, lat, lon = symbols(['lat_i', 'lon_i', 'lat', 'lon'])


CONVERGENCE_THRESHOLD = 1e-8
LEARNING_RATE = 1e-10

def bearing(lat_i, lon_i, lat, lon):
    dl = lon - lon_i
    x = cos(lat_i) * sin(lat) - sin(lat_i) * cos(lat) * cos(dl)
    y = cos(lat) * sin(dl)
    bearing = atan2(y, x)
    return bearing
    # return (bearing + 2.0 * pi) % (2.0 * pi)

def make_objective(observations):
    def objective(x):
        lat, lon = x

        return -1.0 * sum(
            cos(theta_i - bearing(lat_i, lon_i, lat, lon)) 
            for lat_i, lon_i, theta_i in observations
        )
    return objective

def bearing_prime(lat_i, lon_i, lat, lon):
    y = cos(lat) * sin(lon - lon_i)
    x = cos(lat_i) * sin(lat) - sin(lat_i) * cos(lat) * cos(lon - lon_i)

    y_prime_lat = -1.0 * sin(lat) * sin(lon - lon_i)
    x_prime_lat = cos(lat_i) * cos(lat) - sin(lat_i) * -1.0 * sin(lat) * cos(lon - lon_i)

    y_prime_lon = cos(lat) * cos(lon - lon_i)
    x_prime_lon = sin(lat_i) * cos(lat)  * sin(lon - lon_i)

    denominator = (x**2 + y**2)
    lat = x * y_prime_lat / denominator - y * x_prime_lat / denominator 
    lon = x * y_prime_lon / denominator - y * x_prime_lon / denominator

    return lat, lon

# def bearing_prime(lat_i, lon_i, lat, lon):
#     x1 = cos(lat_i)
#     x5 = sin(lat_i)

#     x0 = cos(lat)
#     x2 = sin(lat)
#     x3 = lon - lon_i
#     x4 = cos(x3)
#     x6 = x4 * x5
#     x7 = sin(x3)
#     x8 = x0**2 * x7**2
#     x9 = -x0 * x6 + x1 * x2
#     x10 = 1/(x8 + x9**2)
#     x11 = x10 * x7

#     return (
#         -x0 * x11 * (x0 * x1 + x2 * x6) - x11 * x2 * x9, 
#         x0 * x10 * x4 * x9 - x10 * x5 * x8
#     )


def j_i(lat_i, lon_i, theta_i, lat, lon):
    return -1.0 * cos(theta_i - bearing(lat_i, lon_i, lat, lon))

def make_j(observations):
    def j(lat, lon):
        return sum(
            j_i(lat_i, lon_i, theta_i, lat, lon)
            for lat_i, lon_i, theta_i in observations
        )
    return j

def j_prime_i(lat_i, lon_i, theta_i, lat, lon):
    # d cos(x) / dx = -sin(x)
    # -ve cancels the negative in the objective function
    tmp = sin(theta_i - bearing(lat_i, lon_i, lat, lon))
    dj_dlat, dj_dlon = bearing_prime(lat_i, lon_i, lat, lon)
    return (
       tmp * dj_dlat,
       tmp * dj_dlon
    )

def make_j_prime(observations):
    def j_prime(lat, lon):
        tmp = (
            j_prime_i(lat_i, lon_i, theta_i, lat, lon) 
            for lat_i, lon_i, theta_i in observations
        )
        return map(sum, zip(*tmp))
    return j_prime

def estimate(observations, learning_rate, initial):
    # Create the objective function and its gradient
    j_prime = make_j_prime(observations)

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

        print(grad_lat, grad_lon)

        # Update the location
        lat = prev_lat[-1] + learning_rate * grad_lat
        lon = prev_lon[-1] + learning_rate * grad_lon

        # Check for convergence: change in objective function is below threshold
        if abs(prev_lat[-1] - lat) < CONVERGENCE_THRESHOLD and abs(prev_lon[-1] - lon) < CONVERGENCE_THRESHOLD:
            break

        # Update the previous objective function value
        prev_lat.append(lat)
        prev_lon.append(lon)
        iterations += 1
        # print(prev_lat, prev_lon)

    prev_lat.append(lat)
    prev_lon.append(lon)

    return prev_lat, prev_lon


def Hinv_i(lat_i, lon_i, theta_i, lat, lon):
    x4 = cos(lat_i)
    x7 = sin(lat_i)
    x25 = 3*lat_i
    x30 = 3*lon_i

    x0 = cos(lat)
    x1 = lon - lon_i
    x2 = sin(x1)
    x3 = sin(lat)
    x5 = x3*x4
    x6 = cos(x1)
    x8 = x0*x7
    x9 = x5 - x6*x8
    x10 = theta_i - atan2(x0*x2, x9)
    x11 = cos(x10)
    x12 = x2*x4
    x13 = sin(x10)
    x14 = x2**2
    x15 = x0*x4
    x16 = x3*x7
    x17 = x0**2*x14
    x18 = x17 + x9**2
    x19 = x18**(-2)
    x20 = 1.0*x19
    x21 = x5*x6 - x8
    x22 = 2*lat
    x23 = lat_i + x22
    x24 = -lon + lon_i
    x26 = x22 - x25
    x27 = -lat_i + x22
    x28 = x22 + x25
    x29 = 3*lon
    x31 = -x29 + x30
    x32 = x29 - x30
    x34 = 2*x15*x6 + 2*x16

    d_lat_lat = -x12*x20*(-x11*x12 + 2*x13*(-x0*x14*x3 + x9*(x15 + x16*x6)))
    d_lat_lon = x19*(-1.0*x11*x15*x2*x21 - 0.0078125*x13*(-16*cos(x23) + 16*cos(x26) + 16*cos(x27) - 16*cos(x28) - 26*cos(lat_i + x1) - 26*cos(lat_i + x24) - 6*cos(lat_i + x31) - 6*cos(lat_i + x32) + 11*cos(x1 + x23) + 2*cos(x1 + x25) + 9*cos(x1 + x26) + 11*cos(x1 + x27) + 9*cos(x1 + x28) + 11*cos(x23 + x24) - 3*cos(x23 + x31) - 3*cos(x23 + x32) + 2*cos(x24 + x25) + 9*cos(x24 + x26) + 11*cos(x24 + x27) + 9*cos(x24 + x28) - 2*cos(x25 + x31) - 2*cos(x25 + x32) - cos(x26 + x31) - cos(x26 + x32) - 3*cos(x27 + x31) - 3*cos(x27 + x32) - cos(x28 + x31) - cos(x28 + x32)))
    d_lon_lon = x0*x20*(x0*x11*x21**2 + x12*x13*(x0*x34*x6*x9 - x17*x34*x7 + x18*x3))

    return (d_lat_lat, d_lat_lon, d_lon_lon)

def make_H_inv(observations):
    def impl(lat, lon):
        tmp = (
            Hinv_i(lat_i, lon_i, theta_i, lat, lon) 
            for lat_i, lon_i, theta_i in observations
        )
        h = list(map(sum, zip(*tmp)))

        det = h[0] * h[2] - h[1] * h[1]
        # print(1.0/det)
        return (
            h[2] / det,
            -h[1] / det,
            h[0] / det
        )
    return impl

def grad_i(lat_i, lon_i, theta_i, lat, lon):
    x0 = cos(lat_i)
    x1 = lon - lon_i
    x2 = sin(x1)
    x3 = cos(lat)
    x4 = x0*sin(lat)
    x5 = cos(x1)
    x6 = x3*sin(lat_i)
    x7 = x4 - x5*x6
    x8 = 1.0*sin(theta_i - atan2(x2*x3, x7))/(x2**2*x3**2 + x7**2)

    return (
        x0*x2*x8,
        -x3*x8*(x4*x5 - x6),
    )

def make_grad(observations):
    def impl(lat, lon):
        tmp = (
            grad_i(lat_i, lon_i, theta_i, lat, lon) 
            for lat_i, lon_i, theta_i in observations
        )
        return map(sum, zip(*tmp))
    return impl



def newton(observations, initial):
    h_inv = make_H_inv(observations)
    grad = make_grad(observations)

    prev_lat, prev_lon = initial

    while True:
        # print(np.degrees(prev_lat), np.degrees(prev_lon))

        h_inv_lat_lat, h_inv_lat_lon, h_inv_lon_lon = h_inv(prev_lat, prev_lon)
        grad_lat, grad_lon = grad(prev_lat, prev_lon)

        lat = prev_lat + (h_inv_lat_lat * grad_lat + h_inv_lat_lon * grad_lon)
        lon = prev_lon + (h_inv_lat_lon * grad_lat + h_inv_lon_lon * grad_lon)

        if abs(prev_lat - lat) < CONVERGENCE_THRESHOLD and abs(prev_lon - lon) < CONVERGENCE_THRESHOLD:
            break

        prev_lat = lat
        prev_lon = lon

    return lat, lon

location = Point(40.7128, -74.0060)

points = [
    (100, 0),
    # (100, 90),
    (120, 70),
    (50, 45),
    # (500, 120),
    # (120, 180),
    # (130, 270),
]

pp = [[(b + 180) % 360, geodesic(meters=m).destination(location, bearing=b)] for m, b in points]
# sequence of gaussian noise samples, with variance of 2
noise = np.random.normal(0, 1, len(pp))
observations = [(float(np.radians(p.latitude)), float(np.radians(p.longitude)), float(np.radians(b + n))) for (b, p), n in zip(pp, noise)]


from scipy import optimize

objective_function = make_objective(observations)
result = optimize.minimize(objective_function, x0=[np.radians(location.latitude), np.radians(location.longitude)], method='CG')
print(result.x * 180.0 / pi, distance(location, Point(np.degrees(result.x[0]), np.degrees(result.x[1]))).meters)

# print(pt1.latitude, pt1.longitude, pt2.latitude, pt2.longitude, pt3.latitude, pt3.longitude)
result = newton(
    observations, 
    (np.radians(location.latitude), np.radians(location.longitude))
)
print(result[0] * 180.0 / pi, distance(location, Point(np.degrees(result[0]), np.degrees(result[1]))).meters)


lats, lons = estimate(
    observations, 
    LEARNING_RATE, 
    (np.radians(location.latitude+0.002), np.radians(location.longitude + 0.001))
)
print(distance(location, Point(np.degrees(lats[-1]), np.degrees(lons[-1]))).meters)
lats = np.degrees(lats)
lons = np.degrees(lons)

# print(result[0] * 180.0 / pi, result[1] * 180.0 / pi)

# j_prime = make_j_prime(observations)

# print(np.degrees(0.7105793890229554), np.degrees(-1.2916570928771836), list(j_prime(0.7105793890229554, -1.2916570928771836)))
# print('\n'.join(f"{idx}: {d}" for idx, d in enumerate(
#     ll[0]
#     for ll in [
#         list(j_prime(40.7128 * pi / 180.0, (prev_lon / 2000.0 + -74.0060) * pi / 180.0)) 
#         for prev_lon in range(-200, 200, 1)
#     ]
# )))

import plotly.graph_objects as go

from math import log10

jj = make_j(observations)
j_prime = make_j_prime(observations)

# lat = []
# lon = []
# z = []
# c = []
# for x in [-74.0060 + float(i) / 100000.0 for i in range(-200000, 200000, 1000)]:
#     for y in [40.7128 + float(i) / 100000.0 for i in range(-200000, 200000, 1000)]:
#         lon.append(x)
#         lat.append(y)
#         z.append(j(np.radians(y), np.radians(x)))
#         c.append(max(-100, min(100, list(j_prime(np.radians(y), np.radians(x)))[1])))
#         # c.append(list(j_prime(np.radians(y), np.radians(x)))[1])

# scatter = []
# scatter.append(go.Scatter3d(x=lon, y=lat, z=z, 
#                         marker=dict(color=c), 
#                         mode='markers'))


grid_size = 400  # Based on your loop range and step size
lat = np.linspace(40.7128 - 0.005, 40.7128 + 0.005, grid_size)
lon = np.linspace(-74.0060 - 0.005, -74.0060 + 0.005, grid_size)
lat_grid, lon_grid = np.meshgrid(lat, lon)

z = np.zeros((grid_size, grid_size))
c = np.zeros((grid_size, grid_size))

for i in range(grid_size):
    for j in range(grid_size):
        z[i, j] = objective_function([np.radians(lat_grid[i, j]), np.radians(lon_grid[i, j])])
        # c[i, j] = max(-100, min(100, list(j_prime(np.radians(lat_grid[i, j]), np.radians(lon_grid[i, j])))[1]))
        c[i, j] = list(j_prime(np.radians(lat_grid[i, j]), np.radians(lon_grid[i, j])))[1]

scatter = []
scatter.append(go.Surface(x=lon_grid, y=lat_grid, z=z, surfacecolor=c))

for lat_i, lon_i, theta_i in observations:
    # draw a veritcal line at each observation
    scatter.append(go.Scatter3d(
        x=[np.degrees(lon_i), np.degrees(lon_i)], 
        y=[np.degrees(lat_i), np.degrees(lat_i)], 
        z=[-0.75 * len(observations) - 0.5, 0.75 * len(observations) + 0.5], 
        line = dict(width=4, color='black'),
        mode='lines'
    ))

scatter.append(go.Scatter3d(
    x=[-74.0060 , -74.0060], 
    y=[40.7128, 40.7128], 
    z=[-0.75 * len(observations) - 1.5, 0.75 * len(observations) + 1.5], 
    line = dict(width=4, color='red'),
    mode='lines'
))

zz = list(jj(np.radians(lat), np.radians(lon)) for lat, lon in zip(lats, lons))

scatter.append(go.Scatter3d(
    x=lons, 
    y=lats, 
    z=zz, 
    line = dict(width=3, color='black'),
    mode='lines+markers'
))


fig = go.Figure(data=scatter)
fig.show()

# The estimated parameters for the Von Mises distribution, based on the provided compass readings, are as follows:

# Mean Direction 
# �
# μ: Approximately 1.147 radians (or about 65.74 degrees).
# Concentration Parameter 
# �
# κ: Approximately 1704.81.
# Sample Mean Resultant Length 
# �
# R: Approximately 0.9997.
# These results indicate:

# The mean direction (
# �
# μ) represents the average bearing direction of the compass readings.
# The high value of the concentration parameter (
# �
# κ) suggests that the readings are very tightly clustered around the mean direction. This is further supported by the 
# �
# R value being very close to 1, indicating a high degree of concentration.
# The 
# �
# R value, being extremely close to 1, signifies that the angular data points are almost uniformly pointing in the direction of the mean, with very little dispersion.
# This fit of the Von Mises distribution suggests a high level of precision in the compass readings, with very little variation from the mean direction. ​