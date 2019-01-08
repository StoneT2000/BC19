import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import qmath from '../math.js'
function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  let str = "";
  
  
  self.log(`Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  
  let adjacentPos = search.circle(self.me.x, self.me.y, 1);
  for (let i = 1; i < adjacentPos.length; i++) {
    let checkPos = adjacentPos[i];
    //prioritize building direction in future?

    if(canBuild(checkPos[0], checkPos[1], robotsMapInVision, passableMap)){
      if (self.status === 'buildPilgrim') {
        self.log("Building a pilgrim at " + (checkPos[0]) + ", " + (checkPos[1]));
        return {action: self.buildUnit(SPECS.PILGRIM, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'', response:'built'}
      }
      else if (self.status === 'buildCrusader') {
        self.log("Building a crusader at " + (checkPos[0]) + ", " + (checkPos[1]));
        return {action: self.buildUnit(SPECS.CRUSADER, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'', response:'built'}
      }

    }
  }
    

  return {action: '', status: '', response:''};
}

//returns true if unit can build on that location
function canBuild(xpos, ypos, robotMap, passableMap) {
  //can be reduce to an or function
  if (xpos < robotMap[0].length && ypos < robotMap.length && xpos >= 0 && ypos >= 0) {
    if (robotMap[ypos][xpos] === 0) {
      if (passableMap[ypos][xpos] === true){
        return true;
      }
    }
  }
  return false;
}

function enoughResourcesToBuild(self, unitType) {
  
}

export default {mind}