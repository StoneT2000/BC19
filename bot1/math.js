function dist(p1x, p1y, p2x, p2y) {
  let vals = {dx: p2x-p1x, dy: p2y-p1y};
  return vals.dx * vals.dx + vals.dy * vals.dy;
}
export default {dist}