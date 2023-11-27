
export function trigIntersect(lat1, lon1, bearing1, lat2, lon2, bearing2) {
    // see www.edwilliams.org/avform.htm#Intersection

    const phi1 = lat1, lambda1 = lon1;
    const phi2 = lat2, lambda2 = lon2;
    const theta13 = bearing1, theta23 = bearing2;
    const deltaPhi = phi2 - phi1, deltaLambda = lambda2 - lambda1;

    // angular distance p1-p2
    const sigma12 = 2 * Math.asin(Math.sqrt(Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2)
        + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)));
    if (Math.abs(sigma12) < Number.EPSILON) return {lat: p1.lat, lon: p1.lon}; // coincident points

    // initial/final bearings between points
    const cosThetaa = (Math.sin(phi2) - Math.sin(phi1) * Math.cos(sigma12)) / (Math.sin(sigma12) * Math.cos(phi1));
    const cosThetab = (Math.sin(phi1) - Math.sin(phi2) * Math.cos(sigma12)) / (Math.sin(sigma12) * Math.cos(phi2));
    const thetaa = Math.acos(Math.min(Math.max(cosThetaa, -1), 1)); // protect against rounding errors
    const thetab = Math.acos(Math.min(Math.max(cosThetab, -1), 1)); // protect against rounding errors

    const theta12 = Math.sin(lambda2 - lambda1) > 0 ? thetaa : 2 * Math.PI - thetaa;
    const theta21 = Math.sin(lambda2 - lambda1) > 0 ? 2 * Math.PI - thetab : thetab;
 
    const alpha1 = theta13 - theta12; // angle 2-1-3
    const alpha2 = theta21 - theta23; // angle 1-2-3

    if (Math.sin(alpha1) == 0 && Math.sin(alpha2) == 0) {
        // console.log("infinite intersections");
        return {lat: null, lon: null};
    }
    if (Math.sin(alpha1) * Math.sin(alpha2) < 0) {
        // console.log("ambiguous intersection (antipodal/360°)");
        return {lat: null, lon: null};
    }

    const cosAlpha3 = -Math.cos(alpha1) * Math.cos(alpha2) + Math.sin(alpha1) * Math.sin(alpha2) * Math.cos(sigma12);

    const sigma13 = Math.atan2(Math.sin(sigma12) * Math.sin(alpha1) * Math.sin(alpha2), Math.cos(alpha2) + Math.cos(alpha1) * cosAlpha3);

    const phi3 = Math.asin(Math.min(Math.max(Math.sin(phi1) * Math.cos(sigma13) + Math.cos(phi1) * Math.sin(sigma13) * Math.cos(theta13), -1), 1));

    const deltaLambda13 = Math.atan2(Math.sin(theta13) * Math.sin(sigma13) * Math.cos(phi1), Math.cos(sigma13) - Math.sin(phi1) * Math.sin(phi3));
    const lambda3 = lambda1 + deltaLambda13;
  

    return { lat: phi3, lon: lambda3 }
}