# BangleJS 2 Triangulator

This is just me messing about with a new toy.

## How to use is

To triangulate a point X

1. Initial, small LED should point north
   * Rotate the watch about all axis in order to calibrate Hard Iron magnetic offset
1. After some time, the LED will increase from 3 to 8 pixels, indicating GPS lock
1. Point the watch at the thing to be triangulated, push the button
   * LED will increase in size from 8 to 10 pixels, indicating measurement
1. Move to another point, repeat measurement process
1. You should see,
   * Another LED appears indicating direction to triangulated point
   * Distance to triangulated point is displayed
1. Move to another point, repeat measurement process
1. Triangulations will be much slower from this point because of the iterative optimization

Notes:
* Obviously this is all in metric, since we're not apes.
* It's not that great.

Best results with
* Measurements taken > 50m away
* Initial 2 measurements from 90deg (30 to 150 is fine, close to 0 or 180 is bad)

## How it works

1. Compass measurements are first stabalized using tilt, roll calculated from accelerometer
1. Pressing the button initiates capture of locations and (stablized) compass bearings
1. After 3 seconds, the (circularized) mean bearing and median location is calculated
1. After two such measurements, a simple intersection of the great circle planes is used to triangulate
1. Subsequent measurements use numerical methods to solve the maximum likelihood estimator (MLE) under the assumption of bearings having a von Mises distribution e.g. ~ cos(theta_i - theta)
   * The objective function is super non-linear so I have a very small learning rate i.e. 1e-10

# To build

1. npm install
1. npm run build
1. Get dist/triangulate.app.js onto your BangleJS device

