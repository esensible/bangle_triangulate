from math import sin, cos, atan2

def bearing(lat_i, lon_i, lat, lon):
    dl = lon - lon_i
    x = cos(lat_i) * sin(lat) - sin(lat_i) * cos(lat) * cos(dl)
    y = cos(lat) * sin(dl)
    bearing = atan2(y, x)
    return bearing

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

def make_objective(observations):
    def objective(x):
        lat, lon = x

        return -1.0 * sum(
            cos(theta_i - bearing(lat_i, lon_i, lat, lon)) 
            for lat_i, lon_i, theta_i in observations
        )
    return objective
