// testbench.js
import { findIntersection } from './norm.js';
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

            if (point1 && point2) {
                const result = findIntersection(
                    point1.lat, point1.lon, heading1,
                    point2.lat, point2.lon, heading2
                );

                console.log(`${heading1 * 180 / Math.PI - heading2 * 180 / Math.PI}:`, result.lat * 180 / Math.PI, result.lon * 180 / Math.PI);
            }
        }
    }
}

// Get the filename from the command line arguments
const filePath = process.argv[2];
const data = loadFile(filePath);

runTestbench(data);
