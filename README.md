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
1. Magnetic bearings are converted to true bearings by adding the local declination (`DECLINATION` in `src/main.js`)
1. After two or more measurements, the point is estimated by closed-form least squares in a local east/north plane:
   the point minimising the sum of squared perpendicular distances to all the bearing rays (a 2x2 linear system)
   * With two measurements this is just the intersection of the two rays
   * Random aiming error averages down with more measurements, so take several from a wide spread of directions

# To build

1. npm install
1. npm run build
1. Get dist/bundle.js onto your BangleJS device
1. `node test/estimate.test.mjs` runs the unit tests

# Notes on calibration

https://github.com/kriswiner/MPU6050/wiki/Simple-and-Effective-Magnetometer-Calibration

The tilt compensation actually implemented in `calcBearing` follows the formulation used by the
Bangle.js 2 `magnav` app (NXP AN4248 style), because it encodes the real axis relationship between
the Bangle.js 2 accelerometer and magnetometer. The derivation below is the general idea.

For a roll angle $\left(\phi\right)$ the rotation matrix is given by

$$
R_{roll}(\phi) = \left(\begin{matrix}
1 & 0 & 0 \\
0 & cos \phi & -sin \phi \\
0 & sin \phi & cos \phi
\end{matrix}\right)
$$

Similarly for pitch angle $\left(\theta\right)$, the rotation matrix is given by

$$
R_{pitch}(\theta) = 
\left(\begin{matrix}
cos \theta & 0 & sin \theta \\
0 & 1 & 0 \\
-sin \theta & 0 & cos \theta
\end{matrix}\right)
$$

Applying roll $\left(\phi\right)$, then pitch $\left(\theta\right)$ to the gravitational vector gives us:

$$
\left(\begin{matrix}
g_x \\
g_y \\
g_z
\end{matrix}\right) = 
 \left(\begin{matrix}
cos \theta & 0 & sin \theta \\
0 & 1 & 0 \\
-sin \theta & 0 & cos \theta
\end{matrix}\right)
 \left(\begin{matrix}
1 & 0 & 0 \\
0 & cos \phi & -sin \phi \\
0 & sin \phi & cos \phi
\end{matrix}\right)
 \left(\begin{matrix}
0 \\
0 \\
-1
\end{matrix}\right) 

$$

$$
\left(\begin{matrix}
g_x \\
g_y \\
g_z
\end{matrix}\right) = 
\left(\begin{matrix}
cos \theta & sin \theta sin \phi & sin \theta cos \phi \\
0 & cos \phi & -sin \phi \\
-sin \theta & cos \theta sin \phi & cos \theta cos \phi
\end{matrix}\right) 
\left(\begin{matrix}
0 \\
0 \\
-1
\end{matrix}\right) 
$$

Solving results in the following identities
$$
sin \phi = g_y \\
cos \phi = \sqrt{1 - g_y^2} \\
sin \theta = \frac{-g_x}{cos \phi} \\
cos \theta = \frac{-g_z}{cos \phi}
$$

The inverse matrices for Roll $\left(\phi\right)$ and Pitch $\left(\theta\right)$ are

$$
R^{-1}_{roll}(\phi) = 
\left(\begin{matrix}
   1 & 0 & 0 \\
   0 & cos \phi & sin \phi \\
   0 & -sin \phi & cos \phi
\end{matrix}\right)
$$

$$
R^{-1}_{pitch}(\theta) = 
\left(\begin{matrix}
   cos \theta & 0 & -sin \theta \\
   0 & 1 & 0 \\
   sin \theta & 0 & cos \theta
\end{matrix}\right)
$$

We apply the inverse pitch and roll matrices (ie reverse order) to derotate magnetometer readings

$$
\left(\begin{matrix}
m_x' \\
m_y' \\
m_z'
\end{matrix}\right) =

\left(\begin{matrix}
   1 & 0 & 0 \\
   0 & cos \phi & sin \phi \\
   0 & -sin \phi & cos \phi
\end{matrix}\right)

\left(\begin{matrix}
cos \theta & 0 & -sin \theta \\
0 & 1 & 0 \\
sin \theta & 0 & cos \theta
\end{matrix}\right)


\left(\begin{matrix}
m_x \\
m_y \\
m_z
\end{matrix}\right) 
$$

$$
\left(\begin{matrix}
m_x' \\
m_y' \\
m_z'
\end{matrix}\right) =
\left(\begin{matrix}
   cos\theta & 0 & -sin\theta \\
   sin\phi sin\theta & cos\phi & sin\phi cos\theta \\
   cos\phi sin\theta & -sin\phi & cos\phi cos\theta
\end{matrix}\right) 
\left(\begin{matrix}
m_x \\
m_y \\
m_z
\end{matrix}\right) 
$$

which gives
$$
m_x' = m_x cos\theta- m_z sin\theta \\
m_y' = m_x sin\phi sin\theta + m_y cos\phi + m_z sin\phi cos\theta \\
m_z' = m_x cos\phi sin\theta -m_y sin\phi + m_z cos\phi cos\theta
$$

