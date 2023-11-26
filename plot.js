const fs = require('fs');
const readline = require('readline');
const { program } = require('commander');
const plot = require('nodeplotlib');
const { parse } = require('path');

const TRUE_NORTH_OFFSET = 8.07;

program.option('-f, --file <type>', 'CSV file');
program.parse(process.argv);

const options = program.opts();
if (!options.file) {
    console.error('Please specify a CSV file with -f or --file');
    process.exit(1);
}

async function readFile(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream });
    const dataArray = [];

    for await (const line of rl) {
        let v = JSON.parse(line);
        // v.heading -= 2 * TRUE_NORTH_OFFSET * Math.PI / 180;
        dataArray.push(v);
    }

    return dataArray;
}

// Function to plot vectors
async function plotVectors(filePath) {
    const parsedData = await readFile(filePath);
    
    let traceData = [];
    
    for (let i = 0; i < parsedData.length; i++) {
        for (let j = i + 1; j < parsedData.length; j++) {
            let intersection = findIntersection(parsedData[i].lat, parsedData[i].lon, parsedData[i].heading, parsedData[j].lat, parsedData[j].lon, parsedData[j].heading);
            traceData.push({
                x: [parsedData[i].lon, intersection.lon, parsedData[j].lon],
                y: [parsedData[i].lat, intersection.lat, parsedData[j].lat],
                type: 'scatter',
                mode: 'lines',
                name: `${i} v ${j}`
            });

            let intersection1 = findIntersection1(parsedData[i].lat, parsedData[i].lon, parsedData[i].heading, parsedData[j].lat, parsedData[j].lon, parsedData[j].heading);
            console.log(parsedData[i].lat, parsedData[i].lon, parsedData[i].heading, parsedData[j].lat, parsedData[j].lon, parsedData[j].heading, intersection);
            if (intersection1) {
                traceData.push({
                    x: [parsedData[i].lon, intersection1.lon, parsedData[j].lon],
                    y: [parsedData[i].lat, intersection1.lat, parsedData[j].lat],
                    type: 'scatter',
                    mode: 'lines',
                    name: `* ${i} v ${j}`
                });
            }
        }
    }

    // console.log(traceData);
    plot.plot(traceData, {
        title: 'Vectors between Points'
    });
}

plotVectors(options.file).catch(console.error);


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
    const lat = point.lat;
    const lon = point.lon;
    const north = { x: -Math.sin(lat), y: Math.cos(lat), z: 0 };
    const east = { x: -Math.sin(lon) * Math.cos(lat), y: -Math.cos(lon) * Math.cos(lat), z: Math.sin(lat) };
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
  
  // See for explaination: https://www.movable-type.co.uk/scripts/latlong-vectors.html#triangulation
  function findIntersection(lat1, lon1, bearing1, lat2, lon2, bearing2) {
    const p1 = { lat: lat1, lon: lon1 };
    const p2 = { lat: lat2, lon: lon2 };
  
    const point1 = toCartesian(lat1, lon1);
    const point2 = toCartesian(lat2, lon2);
  
    const vector1 = greatCircleBearingVector(p1, bearing1);
    const vector2 = greatCircleBearingVector(p2, bearing2);
  
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


function findIntersection1(lat1, lon1, bearing1, lat2, lon2, bearing2) {
    // see www.edwilliams.org/avform.htm#Intersection
    
    const phi1 = lat1, lambda1 = lon1;
    const phi2 = lat2, lambda2 = lon2;
    const theta13 = bearing1, theta23 = bearing2;
    const deltaPhi = phi2 - phi1, deltaLambda = lambda2 - lambda1;
  
    // angular distance p1-p2
    const sigma12 = 2 * Math.asin(Math.sqrt(Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2)
        + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2)));
    if (Math.abs(sigma12) < Number.EPSILON) {
        console.log("sigma12 is 0");
        return {lat: phi1, lon: lambda1}
    }

    // initial/final bearings between points
    const cosThetaa = (Math.sin(phi2) - Math.sin(phi1)*Math.cos(sigma12)) / (Math.sin(sigma12)*Math.cos(phi1));
    const cosThetab = (Math.sin(phi1) - Math.sin(phi2)*Math.cos(sigma12)) / (Math.sin(sigma12)*Math.cos(phi2));
    const thetaa = Math.acos(Math.min(Math.max(cosThetaa, -1), 1)); // protect against rounding errors
    const thetab = Math.acos(Math.min(Math.max(cosThetab, -1), 1)); // protect against rounding errors

    const theta12 = Math.sin(lambda2-lambda1)>0 ? thetaa : 2*Math.PI-thetaa;
    const theta21 = Math.sin(lambda2-lambda1)>0 ? 2*Math.PI-thetab : thetab;
  
    const alpha1 = theta13 - theta12; // angle 2-1-3
    const alpha2 = theta21 - theta23; // angle 1-2-3
  
    if (Math.sin(alpha1) == 0 && Math.sin(alpha2) == 0) {
      console.log("infinite intersections");
      return null;
    }
    if (Math.sin(alpha1) * Math.sin(alpha2) < 0) {
      console.log("ambiguous intersection (antipodal/360°)");
      return null;
    }
  
    const cosAlpha3 = -Math.cos(alpha1)*Math.cos(alpha2) + Math.sin(alpha1)*Math.sin(alpha2)*Math.cos(sigma12);
  
    const sigma13 = Math.atan2(Math.sin(sigma12)*Math.sin(alpha1)*Math.sin(alpha2), Math.cos(alpha2) + Math.cos(alpha1)*cosAlpha3);
    const phi3 = Math.asin(Math.min(Math.max(Math.sin(phi1)*Math.cos(sigma13) + Math.cos(phi1)*Math.sin(sigma13)*Math.cos(theta13), -1), 1));
    const deltaLambda13 = Math.atan2(Math.sin(theta13)*Math.sin(sigma13)*Math.cos(phi1), Math.cos(sigma13) - Math.sin(phi1)*Math.sin(phi3));
    const lambda3 = lambda1 + deltaLambda13;

    return {lat: phi3, lon: lambda3}
  }
  