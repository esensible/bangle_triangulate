# BangleJS 2 Triangulator

This is just me messing about with a new toy.

To triangulate a point X

1. Wait for the LED indicating first GPS reading
1. Point your watch at a point, X
1. Push the button, wait 3s
1. Move to another point
1. Point your watch at the point, X
1. Push the button, wait 3s
   * You should now see the distance between you and that point
1. Repeat for more points to get better measurements

Notes:
* Obviously this is all in metric, since we're not apes.
* Wrapping is a thing we ignore. Don't make measurements pointing north.
* It's not that great.