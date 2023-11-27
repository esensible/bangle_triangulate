
// See for explaination: https://www.movable-type.co.uk/scripts/latlong-vectors.html#triangulation
export function normIntersect(lat1, lon1, bearing1, lat2, lon2, bearing2) {
    const point1 = toCartesian(lat1, lon1);
    const point2 = toCartesian(lat2, lon2);

    const vector1 = greatCircleBearingVector(point1, bearing1);
    const vector2 = greatCircleBearingVector(point2, bearing2);

    const greatCircle1 = crossProduct(point1, vector1);
    const greatCircle2 = crossProduct(point2, vector2);

    const intersection1 = crossProduct(greatCircle1, greatCircle2);
    const intersection2 = { x: -intersection1.x, y: -intersection1.y, z: -intersection1.z }; // Antipodal point

    // Convert back to spherical coordinates
    const latA = Math.atan2(intersection1.z, Math.sqrt(intersection1.x * intersection1.x + intersection1.y * intersection1.y));
    const lonA = Math.atan2(intersection1.y, intersection1.x);
    const latB = Math.atan2(intersection2.z, Math.sqrt(intersection2.x * intersection2.x + intersection2.y * intersection2.y));
    const lonB = Math.atan2(intersection2.y, intersection2.x);

    // Determine which intersection is closer to the first point
    const distA = distanceBetweenPoints(point1, intersection1);
    const distB = distanceBetweenPoints(point1, intersection2);

    if (distA < distB) {
        return { lat: latA, lon: lonA };
    } else {
        return { lat: latB, lon: lonB };
    }
}


function toCartesian(lat, lon) {
    const x = Math.cos(lat) * Math.cos(lon);
    const y = Math.cos(lat) * Math.sin(lon);
    const z = Math.sin(lat);
    return { x, y, z };
}

function crossProduct(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}


function greatCircleBearingVector(point, bearing) {
    const NORTH = { x: 0, y: 0, z: 1 };
    const east = crossProduct(NORTH, point);
    const north = crossProduct(point, east);
    return {
        x: Math.cos(bearing) * north.x + Math.sin(bearing) * east.x,
        y: Math.cos(bearing) * north.y + Math.sin(bearing) * east.y,
        z: Math.cos(bearing) * north.z + Math.sin(bearing) * east.z
    };
}

function distanceBetweenPoints(point1, point2) {
    const dotProduct = point1.x * point2.x + point1.y * point2.y + point1.z * point2.z;
    const angle = Math.acos(dotProduct);
    return angle; // in radians
}
