const route = async points => {
  const coordinates = points.map(point => `${point.longitude},${point.latitude}`).join(';');
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true`);
  if (!response.ok) throw new Error(`OSRM ${response.status}`);
  const data = await response.json();
  const result = data.routes?.[0];
  if (!result?.geometry?.coordinates?.length || !result.legs?.length) throw new Error('OSRM returned no usable geometry.');
  return result;
};

const start = { latitude: 39.9526, longitude: -75.1652 };
const stop = { latitude: 39.9589, longitude: -75.1839 };
const destination = { latitude: 39.9654, longitude: -75.1498 };
const initial = await route([start, stop, destination]);
const steps = initial.legs.flatMap(leg => leg.steps || []);
if (initial.legs.length !== 2 || steps.length < 3) throw new Error('Multi-stop route did not return two navigable legs.');

const geometry = initial.geometry.coordinates;
const checkpoints = [geometry[0], geometry[Math.floor(geometry.length * .45)], geometry[Math.floor(geometry.length * .8)], geometry.at(-1)];
const nearestIndexes = checkpoints.map(point => geometry.findIndex(candidate => candidate[0] === point[0] && candidate[1] === point[1]));
if (nearestIndexes.some((value, index) => index && value <= nearestIndexes[index - 1])) throw new Error('Route checkpoints did not advance along the returned geometry.');

const offRouteOrigin = { latitude: 39.9412, longitude: -75.1738 };
const recalculated = await route([offRouteOrigin, stop, destination]);
if (recalculated.geometry.coordinates[0][0] === geometry[0][0] && recalculated.geometry.coordinates[0][1] === geometry[0][1]) throw new Error('Off-route recalculation reused the old geometry.');

console.log(JSON.stringify({
  status: 'pass',
  provider: 'live-osrm',
  legs: initial.legs.length,
  turnSteps: steps.length,
  distanceKm: Number((initial.distance / 1000).toFixed(2)),
  durationMinutes: Math.ceil(initial.duration / 60),
  routeCheckpoints: checkpoints.length,
  rerouteDistanceKm: Number((recalculated.distance / 1000).toFixed(2)),
}));
