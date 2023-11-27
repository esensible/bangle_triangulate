// testbench.js
import { normIntersect } from './norm.js';
import { trigIntersect } from './trig.js';
import fs from 'fs';
import process from 'process';

function loadFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runTestbench(data) {
    const headings = Object.keys(data);

    for (let i = 0; i < headings.length; i++) {
        for (let j = i + 1; j < headings.length; j++) {
            const heading1 = parseFloat(headings[i]);
            const heading2 = parseFloat(headings[j]);

            // Assuming each heading array has an object where r = 50
            const point1 = data[headings[i]].find(p => p.r === 50);
            const point2 = data[headings[j]].find(p => p.r === 50);

            if ((Math.PI - Math.abs(heading1 - heading2)) < (5 * Math.PI / 180.0))  continue;
            
            if (point1 && point2) {

                

                const normResult = normIntersect(
                    point1.lat, point1.lon, heading1,
                    point2.lat, point2.lon, heading2
                );

                const trigResult = trigIntersect(
                    point1.lat, point1.lon, heading1,
                    point2.lat, point2.lon, heading2
                );

                console.log(`${trigResult.lat - normResult.lat}, ${trigResult.lon - normResult.lon}`);
                // console.log(`${point1.lat}, ${point1.lon}, ${heading1}, ${point2.lat}, ${point2.lon}, ${heading2}, ${result.lat}, ${result.lon}`);
                // console.log(`(${Math.fround(heading1 * 180 / Math.PI)}, 50), (${Math.fround(heading2 * 180 / Math.PI)}, 50):`, result.lat * 180 / Math.PI, result.lon * 180 / Math.PI);
            }
        }
    }
}

// Get the filename from the command line arguments
const filePath = process.argv[2];
const data = loadFile(filePath);

runTestbench(data);
