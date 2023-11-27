import sys
import re
from geopy.distance import geodesic
import plotly.express as px

def parse_and_calculate_distance():
    # Define the reference point (latitude, longitude)
    reference_point = (40.7128, -74.0060)

    results = []

    # Read lines from stdin
    for line in sys.stdin:
        # Regex pattern to find tuples and lat-lon values
        pattern = r"\((\d+,\s?\d+)\),\s\((\d+,\s?\d+)\):\s([+-]?[0-9]+\.?[0-9]*\s[+-]?[0-9]+\.?[0-9]*)"
        
        # Find all matches
        matches = re.findall(pattern, line)

        # Process matches to get the desired format and calculate distances
        for match in matches:
            h1, h2, lat_lon = match
            lat_lon = tuple(map(float, lat_lon.split()))
            distance = geodesic(lat_lon, reference_point).meters

            # Print results
            # print(f"({h1}), ({h2}): {distance}")
            results.append(distance)
    return results

# Call the function to parse and calculate distance
# Note: This will wait for input from stdin, so it should be tested in an appropriate environment
distances = parse_and_calculate_distance()

fig = px.histogram(distances, nbins=30, labels={'value':'Distance (meters)'}, title='Distribution of Calculated Distances')
fig.show()
