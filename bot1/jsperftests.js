var sqs = [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196]

function dist(p1x, p1y, p2x, p2y) {
    return sqs[Math.abs(p2x - p1x)] + sqs[Math.abs(p2y-p1y)];
}
for (let i = 0; i <= 14; i++) {
  for (let j = 0 ; j <=14; j++){
    let result = dist(0,0,i,j);
  }
}

////
function dist(p1x, p1y, p2x, p2y) {
    return (p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y);
}
for (let i = 0; i <= 14; i++) {
  for (let j = 0 ; j <=14; j++){
    let result = dist(0,0,i,j);
  }
}