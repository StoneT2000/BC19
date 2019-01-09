function dist(p1x, p1y, p2x, p2y) {
  //if 4 arguments given, process them as x,y positions
  if (p2x && p2y){
    let vals = {dx: p2x-p1x, dy: p2y-p1y};
    return vals.dx * vals.dx + vals.dy * vals.dy;
  }
  //if 2 arguemnts given, process them as dx, dy
  else {
    return p1x * p1x + p1y * p1y;
  }
}
export default {dist}