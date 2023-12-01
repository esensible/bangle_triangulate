import numpy as np
from geopy.distance import geodesic, distance
from geopy.point import Point
from math import cos, sin, atan2, pi, log10
# from sympy import cos, sin, atan2, pi, symbols, diff
# lat_i, lon_i, lat, lon = symbols(['lat_i', 'lon_i', 'lat', 'lon'])



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

DEFAULT_LOCATION = (40.7128, -74.0060)
DEFAULT_POINTS =     points = [
        (100, 0),
        # (100, 90),
        (120, 70),
        (150, 45),
        # (500, 120),
        # (120, 180),
        # (130, 270),
    ]

def make_observations(lat=DEFAULT_LOCATION[0], lon=DEFAULT_LOCATION[1], points=DEFAULT_POINTS):
    # All parameters in degrees

    location = Point(lat, lon)

    pp = [[(b + 180) % 360, geodesic(meters=m).destination(location, bearing=b)] for m, b in points]
    # sequence of gaussian noise samples, with variance of 2
    noise = np.random.normal(0, 1, len(pp))

    return [(float(np.radians(p.latitude)), float(np.radians(p.longitude)), float(np.radians(b + n))) for (b, p), n in zip(pp, noise)]






from scipy import optimize
from bearing_funcs import make_objective
from gradient_descent import estimate

location = Point(*DEFAULT_LOCATION)
observations = make_observations()
objective_function = make_objective(observations)
result = optimize.minimize(objective_function, x0=[np.radians(location.latitude), np.radians(location.longitude)], method='CG')
print(result.x * 180.0 / pi, distance(location, Point(np.degrees(result.x[0]), np.degrees(result.x[1]))).meters)

# print(pt1.latitude, pt1.longitude, pt2.latitude, pt2.longitude, pt3.latitude, pt3.longitude)
# result = newton(
#     observations, 
#     (np.radians(location.latitude), np.radians(location.longitude))
# )
# print(result[0] * 180.0 / pi, distance(location, Point(np.degrees(result[0]), np.degrees(result[1]))).meters)

    


lats, lons = estimate(
    observations, 
    [np.mean([o[0] for o in observations]), np.mean([o[1] for o in observations])]
    # (np.radians(location.latitude+0.002), np.radians(location.longitude + 0.001))
)
print(distance(location, Point(np.degrees(lats[-1]), np.degrees(lons[-1]))).meters)

from plotting import plot_scene
plot_scene(observations, estimate=(lats[-1], lons[-1]), estimates=list(zip(lats, lons)))
