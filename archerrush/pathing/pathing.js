var ndarray = require('ndarray');
var createPlanner = require('l1-path-finder');

function initializePlanner(self) {
  let gameMap = self.map;
  let w = self.map[0].length
  let h = self.map.length;
  let mapArr = Int8Array(w * h);
  
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      //x:j, y:i
      let indexInMap = x + i * w;
      if (gameMap[i][j] === false){
        mapArr[indexInMap] = 1;
      }
    }
  }
  
  let gMap = ndarray(mapArr, [w, h]);
  let planner = createPlanner(gMap)
  self.planner = planner;
}


export default {initializePlanner};
//module.exports = {initializePlanner}