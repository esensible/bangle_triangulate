// node test/estimate.test.mjs
import { estimate } from '../src/leastSquares.js';
import { calcBearing, calculateBearing, distance, nmeaToDegrees } from '../src/geoUtils.js';
import assert from 'assert';

const D = Math.PI / 180, R = 6371e3;
const lat0 = -34.944105 * D, lon0 = 138.6142589 * D;
const off = (dN, dE) => [lat0 + dN / R, lon0 + dE / (R * Math.cos(lat0))];

// NMEA: firmware example 5139.11397 N -> 51 deg 39.11397'
assert(Math.abs(nmeaToDegrees('5139.11397') - (51 + 39.11397 / 60)) < 1e-9);
assert(Math.abs(nmeaToDegrees('00116.07202') - (1 + 16.07202 / 60)) < 1e-9);

// two exact rays intersect at the target
{
  const p = [off(-200, -200), off(-200, 200)];
  const obs = p.map(q => [q[0], q[1], calculateBearing(q[0], q[1], lat0, lon0)]);
  const e = estimate(obs);
  assert(distance(e[0], e[1], lat0, lon0, R) < 0.05, 'exact intersection');
}
// parallel rays -> null
assert.strictEqual(estimate([[lat0, lon0, 0], [lat0, lon0 + 1e-4, 0]]), null);

// mixed ranges (50..500 m) with GPS and compass noise: the range-weighted fit must beat
// the unweighted one, and its weights must favour the right stations
{
  let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const randn = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const errW = [], errU = [];
  for (let t = 0; t < 400; t++) {
    const obs = []; const base = rnd() * 360;
    for (let i = 0; i < 6; i++) {
      const az = (base + (i / 5) * 150) * D, r = 50 + rnd() * 450;
      const p = off(-r * Math.cos(az), -r * Math.sin(az));
      const q = [p[0] + randn() * 5 / R, p[1] + randn() * 5 / (R * Math.cos(lat0))];
      obs.push([q[0], q[1], calculateBearing(p[0], p[1], lat0, lon0) + randn() * 5 * D]);
    }
    const w = estimate(obs), u = estimate(obs, 0);
    errW.push(distance(w[0], w[1], lat0, lon0, R)); errU.push(distance(u[0], u[1], lat0, lon0, R));
  }
  errW.sort((a, b) => a - b); errU.sort((a, b) => a - b);
  assert(errW[200] < errU[200] * 0.85, `weighted median ${errW[200].toFixed(1)} m vs unweighted ${errU[200].toFixed(1)} m`);
}

// noisy observations: using all N must beat using the first two
{
  let seed = 1; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const randn = () => Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  let better = 0, trials = 200;
  for (let t = 0; t < trials; t++) {
    const obs = [];
    for (let i = 0; i < 8; i++) {
      const az = (i / 7) * 120 * D + rnd(), r = 160 + 80 * rnd();
      const q = off(-r * Math.cos(az), -r * Math.sin(az));
      obs.push([q[0], q[1], calculateBearing(q[0], q[1], lat0, lon0) + randn() * 8 * D]);
    }
    const e2 = estimate(obs.slice(0, 2)), e8 = estimate(obs);
    if (distance(e8[0], e8[1], lat0, lon0, R) < distance(e2[0], e2[1], lat0, lon0, R)) better++;
  }
  assert(better > trials * 0.75, `8 obs better than 2 in only ${better}/${trials}`);
}

// tilt compensation: level case equals the firmware heading atan2(-mx, my); bearing is stable
// under tilt for the axis relationship the formula encodes (mag y opposite to accel y)
{
  const rotX = (v, a) => ({ x: v.x, y: Math.cos(a) * v.y - Math.sin(a) * v.z, z: Math.sin(a) * v.y + Math.cos(a) * v.z });
  const rotY = (v, a) => ({ x: Math.cos(a) * v.x + Math.sin(a) * v.z, y: v.y, z: -Math.sin(a) * v.x + Math.cos(a) * v.z });
  const rotZ = (v, a) => ({ x: Math.cos(a) * v.x - Math.sin(a) * v.y, y: Math.sin(a) * v.x + Math.cos(a) * v.y, z: v.z });
  const inc = 66 * D; // Adelaide: field points up
  for (let h = 0; h < 360; h += 30) {
    const m0 = rotZ({ x: 0, y: Math.cos(inc), z: Math.sin(inc) }, h * D);
    const level = calcBearing(0, 0, -1, m0.x, m0.y, m0.z) / D;
    let fw = Math.atan2(-m0.x, m0.y) / D; if (fw < 0) fw += 360;
    assert(Math.abs(((level - fw + 540) % 360) - 180) < 1e-6, 'level heading matches firmware');
    for (const [p, r] of [[20, 0], [0, 20], [20, -20], [-15, 10]]) {
      const Rot = v => rotY(rotX(v, p * D), r * D);
      const g = Rot({ x: 0, y: 0, z: -1 }), m = Rot(m0);
      const b = calcBearing(g.x, -g.y, g.z, m.x, m.y, m.z) / D;
      assert(Math.abs(((b - level + 540) % 360) - 180) < 1e-6, `tilt (${p},${r}) at heading ${h}: ${b} vs ${level}`);
    }
  }
}
console.log('all tests passed');
