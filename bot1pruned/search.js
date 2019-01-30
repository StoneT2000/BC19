import {BCAbstractRobot, SPECS} from 'battlecode';
import qmath from 'math.js'

const bfsDeltas = {
  0: [[0,0]],
  1: [[0,0], [0,-1], [1, 0], [0, 1], [-1, 0]],
  2: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  3: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  4: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -2], [2, 0], [0, 2], [-2, 0]],
}

function circle(self, xpos, ypos, radius) {
  let positions = [];
  let deltas = bfsDeltas[radius];
  let deltaLength = deltas.length;
  for (let k = 0; k < deltaLength; k++) {
   
    let nx = xpos + deltas[k][0];
    let ny = ypos + deltas[k][1];
    if (inArr(nx,ny, self.map)){
      positions.push([nx,ny]);
    }
  }
  return positions;
}

function emptyPos(xpos, ypos, robotMap, passableMap, inVision = true) {
  if (inArr(xpos,ypos, robotMap)) {
    if (inVision === false){
      if (robotMap[ypos][xpos] <= 0) {
        if (passableMap[ypos][xpos] === true){
          return true;
        }
      }
    }
    else {
      if (robotMap[ypos][xpos] === 0) {
        if (passableMap[ypos][xpos] === true){
          return true;
        }
      }
    }
  }
  return false;
}

function canPass(self,x,y) {
  
  let passableMap = self.getPassableMap();
  if (inArr(x,y, passableMap)) {
    return passableMap[y][x];
  }
  return false;
}
function fuelDeposit(self,x,y) {
  let fuelMap = self.getFuelMap();
  return fuelMap[y][x];
}
function karboniteDeposit(self,x,y) {
  let karboniteMap = self.getKarboniteMap();
  return karboniteMap[y][x];
}
function inArr(x,y,arr) {
  if (x < 0 || y < 0 || x >= arr[0].length || y >= arr.length){
    return false;
  }
  return true;
}

function findNearestStructure(self) {
  let visibleRobots = self.getVisibleRobots();
  let shortestDist = 10000000;
  let bestTarget = null;
  
  for (let i = 0; i < self.knownStructures[self.me.team].length; i++) {
    let friendlyStructure = self.knownStructures[self.me.team][i];
    let distToStruct = qmath.dist(self.me.x, self.me.y, friendlyStructure.x, friendlyStructure.y);
    if (distToStruct < shortestDist) {
      shortestDist = distToStruct;
      bestTarget = friendlyStructure;
    }
  }
  for (let i = 0; i < visibleRobots.length; i++) {
    let thatRobot = visibleRobots[i];
    if (thatRobot.unit === SPECS.CHURCH || thatRobot.unit === SPECS.CASTLE) {
      if (thatRobot.team === self.me.team){
        let distToStruct = qmath.dist(self.me.x, self.me.y, thatRobot.x, thatRobot.y);
        if (distToStruct < shortestDist) {
          shortestDist = distToStruct;
          bestTarget = {x:thatRobot.x, y:thatRobot.y, unit: thatRobot.unit};
        }
      }
    }
  }
  if (bestTarget === null) {
    return false;
  }
  return bestTarget;
}
function findNearestStructureHere(self, x, y, unitsInVisionFiltered) {
  let visibleRobots;
  if (unitsInVisionFiltered) {
    visibleRobots = unitsInVisionFiltered;
  }
  else {
    visibleRobots = self.getVisibleRobots();
  }
  let shortestDist = 10000000;
  let bestTarget = null;
  
  for (let i = 0; i < self.knownStructures[self.me.team].length; i++) {
    let friendlyStructure = self.knownStructures[self.me.team][i];
    let distToStruct = qmath.dist(x, y, friendlyStructure.x, friendlyStructure.y);
    if (distToStruct < shortestDist) {
      shortestDist = distToStruct;
      bestTarget = friendlyStructure;
    }
  }

  for (let i = 0; i < visibleRobots.length; i++) {
    let thatRobot = visibleRobots[i];
    if (thatRobot.unit === SPECS.CHURCH || thatRobot.unit === SPECS.CASTLE) {
      if (thatRobot.team === self.me.team){
        let distToStruct = qmath.dist(x,y, thatRobot.x, thatRobot.y);
        if (distToStruct < shortestDist) {
          shortestDist = distToStruct;
          bestTarget = {x:thatRobot.x, y:thatRobot.y, unit: thatRobot.unit};
        }
      }
    }
  }
  if (bestTarget === null) {
    return false;
  }
  return bestTarget;
}

function findNearestEnemy(self, unit) {
  let leastDistToTarget = 99999999;
  let isEnemy = false;
  let enemyBot = null;
  let robotsInVision = self.getVisibleRobots();
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];

    if (obot.team !== self.me.team) {
      let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToThisTarget < leastDistToTarget) {
        leastDistToTarget = distToThisTarget;
        isEnemy = true;
        enemyBot = obot;
      }

    }
    else {
    }
  }
  return enemyBot;
}

function unitsInRadius(self, radius, team = self.me.team, nx = self.me.x, ny = self.me.y) {
  let robotsInVision = self.getVisibleRobots();
  let unitsInVincinity = {0:[],1:[],2:[],3:[],4:[],5:[]};
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      if (obot.team === team){
        let distToUnit = qmath.dist(nx, ny, obot.x, obot.y);
        if (distToUnit <= radius) {
          unitsInVincinity[obot.unit].push(obot);
        }
      }
    }
  return unitsInVincinity;
}

function horizontalSymmetry(gameMap){
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < gameMap[i].length; j++) {
      if (gameMap[i][j] !== gameMap[gameMap.length - i - 1][j]) {
        return false;
      }
    }
  }
  return true;
}
export default {circle, bfsDeltas, emptyPos, canPass, fuelDeposit, karboniteDeposit, findNearestStructure, horizontalSymmetry, inArr, unitsInRadius, findNearestStructureHere};