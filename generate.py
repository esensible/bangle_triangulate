import json
import numpy as np
from geopy.distance import geodesic
from geopy.point import Point

# Function to generate positions 50m from a given point along specified headings
def generate_positions(lat, lon, distances, headings):
    initial_point = Point(lat, lon)
    positions = {}

    for heading in headings:
        pos = []
        for distance in distances:
            # Calculate the destination point given distance and bearing
            destination = geodesic(meters=distance).destination(initial_point, heading)
            pos.append({"r": float(distance), "lat": float(np.radians(destination.latitude)), "lon": float(np.radians(destination.longitude))})
        # flip the heading back towards the 'triangulated' point
        positions[float(np.radians((heading + 180) % 360 ))] = pos

    return positions

lat, lon = 40.7128, -74.0060  # New York City

positions = generate_positions(lat, lon, np.arange(10, 100, 10), np.arange(0, 360, 10))

json_output = json.dumps(positions, indent=4)
print(json_output)
