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

# Notes on calibration

https://github.com/kriswiner/MPU6050/wiki/Simple-and-Effective-Magnetometer-Calibration

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

