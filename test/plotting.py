import plotly.graph_objects as go
import numpy as np

from bearing_funcs import make_objective


def plot_scene(observations, estimate=None, actual=None, estimates=None):

    objective = make_objective(observations)

    # sum first element of observations
    lats = [o[0] for o in observations]
    lat_range = max(lats) - min(lats)
    lons = [o[1] for o in observations]
    lon_range = max(lons) - min(lons)


    grid_size = 400
    scale = 0.5
    lat = np.linspace(np.degrees(min(lats) - scale * lat_range), np.degrees(max(lats) + scale * lat_range), grid_size)
    lon = np.linspace(np.degrees(min(lons) - scale * lon_range), np.degrees(max(lons) + scale * lon_range), grid_size)
    lat_grid, lon_grid = np.meshgrid(lat, lon)

    z = np.zeros((grid_size, grid_size))
    c = np.zeros((grid_size, grid_size))

    for i in range(grid_size):
        for j in range(grid_size):
            z[i, j] = objective([np.radians(lat_grid[i, j]), np.radians(lon_grid[i, j])])

    plots = []
    plots.append(go.Surface(x=lon_grid, y=lat_grid, z=z, surfacecolor=z))

    for lat_i, lon_i, theta_i in observations:
        # draw a veritcal line at each observation
        plots.append(go.Scatter3d(
            x=[np.degrees(lon_i), np.degrees(lon_i)], 
            y=[np.degrees(lat_i), np.degrees(lat_i)], 
            z=[-0.75 * len(observations) - 0.5, 0.75 * len(observations) + 0.5], 
            line = dict(width=4, color='black'),
            mode='lines'
        ))

    if actual is not None:
        lat_deg = np.degrees(actual[0])
        lon_deg = np.degrees(actual[1])
        plots.append(go.Scatter3d(
            x=[lon_deg, lon_deg],
            y=[lat_deg, lat_deg],
            z=[-0.75 * len(observations) - 1.5, 0.75 * len(observations) + 1.5], 
            line = dict(width=4, color='red'),
            mode='lines+markers'
        ))

    if estimate:
        lat_deg = np.degrees(estimate[0])
        lon_deg = np.degrees(estimate[1])
        plots.append(go.Scatter3d(
            x=[lon_deg, lon_deg],
            y=[lat_deg, lat_deg],
            z=[-0.75 * len(observations) - 1.5, 0.75 * len(observations) + 1.5], 
            line = dict(width=1, color='red'),
            mode='lines'
        ))

    if estimates:
        zz = list(objective([lat, lon]) for lat, lon in estimates)

        plots.append(go.Scatter3d(
            x=[np.degrees(lon) for _, lon in estimates], 
            y=[np.degrees(lat) for lat, _ in estimates],
            z=zz, 
            line = dict(width=3, color='black'),
            mode='lines+markers'
        ))


    fig = go.Figure(data=plots)
    fig.show()