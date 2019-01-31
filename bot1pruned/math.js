function dist(p1x, p1y, p2x, p2y) {
    return (p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y);
}
function distDelta(dx,dy) {
  return dx * dx + dy * dy;
}
function unitDist(p1x,p1y,p2x,p2y) {
  return Math.abs(p2x-p1x) + Math.abs(p2y-p1y);
}
export default {dist, distDelta, unitDist}