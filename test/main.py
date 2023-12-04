import argparse
import json
import numpy as np
import math

from plotting import plot_scene
from gradient_descent  import estimate


def intersect(lat1, lon1, bearing1, lat2, lon2, bearing2):
    phi1, lambda1 = lat1, lon1
    phi2, lambda2 = lat2, lon2
    theta13, theta23 = bearing1, bearing2
    deltaPhi = phi2 - phi1
    deltaLambda = lambda2 - lambda1

    # Angular distance p1-p2
    sigma12 = 2 * math.asin(math.sqrt(math.sin(deltaPhi / 2) ** 2
                                      + math.cos(phi1) * math.cos(phi2) * math.sin(deltaLambda / 2) ** 2))
    if abs(sigma12) < 1e-12:  # Number.EPSILON equivalent in Python
        return {'lat': lat1, 'lon': lon1}  # coincident points

    # Initial/final bearings between points
    cosThetaa = (math.sin(phi2) - math.sin(phi1) * math.cos(sigma12)) / (math.sin(sigma12) * math.cos(phi1))
    cosThetab = (math.sin(phi1) - math.sin(phi2) * math.cos(sigma12)) / (math.sin(sigma12) * math.cos(phi2))
    thetaa = math.acos(max(min(cosThetaa, 1), -1))  # protect against rounding errors
    thetab = math.acos(max(min(cosThetab, 1), -1))  # protect against rounding errors

    theta12 = thetaa if math.sin(lambda2 - lambda1) > 0 else 2 * math.pi - thetaa
    theta21 = 2 * math.pi - thetab if math.sin(lambda2 - lambda1) > 0 else thetab

    alpha1 = theta13 - theta12  # angle 2-1-3
    alpha2 = theta21 - theta23  # angle 1-2-3

    if math.sin(alpha1) == 0 and math.sin(alpha2) == 0:
        # Infinite intersections
        return {'lat': None, 'lon': None}
    if math.sin(alpha1) * math.sin(alpha2) < 0:
        # Ambiguous intersection (antipodal/360°)
        return {'lat': None, 'lon': None}

    cosAlpha3 = -math.cos(alpha1) * math.cos(alpha2) + math.sin(alpha1) * math.sin(alpha2) * math.cos(sigma12)
    sigma13 = math.atan2(math.sin(sigma12) * math.sin(alpha1) * math.sin(alpha2), math.cos(alpha2) + math.cos(alpha1) * cosAlpha3)
    phi3 = math.asin(max(min(math.sin(phi1) * math.cos(sigma13) + math.cos(phi1) * math.sin(sigma13) * math.cos(theta13), 1), -1))
    deltaLambda13 = math.atan2(math.sin(theta13) * math.sin(sigma13) * math.cos(phi1), math.cos(sigma13) - math.sin(phi1) * math.sin(phi3))
    lambda3 = lambda1 + deltaLambda13

    return phi3, lambda3
        
def read_ndjson_file(filename):
    try:
        with open(filename, 'r') as file:
            for line in file:
                yield json.loads(line)
    except FileNotFoundError:
        print(f"Error: The file '{filename}' was not found.")
        exit(1)
    except json.JSONDecodeError:
        print(f"Error: One or more lines in the file '{filename}' are not valid JSON.")
        exit(1)

def main():
    parser = argparse.ArgumentParser(description="Read and deserialize a JSON file.")
    parser.add_argument("filename", help="The JSON file to be read")
    
    args = parser.parse_args()

    json_data = read_ndjson_file(args.filename)
    observations = [(o['lat'], o['lon'], o['heading']) for o in json_data]
    # initial = [np.mean([o[0] for o in observations]), np.mean([o[1] for o in observations])]
    # print(initial)
    initial = intersect(*observations[0], *observations[-1])
    # print(initial)
    # initial = (-0.6033214053088205, 2.4149070729628566)
    # actual = np.radians([-34.944105, 138.6142589])

    estimates = list(zip(*estimate(observations, initial)))
    
    plot_scene(observations, estimate=estimates[-1], estimates=estimates[:-1])

if __name__ == "__main__":
    main()
