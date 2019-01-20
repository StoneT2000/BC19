import {BCAbstractRobot, SPECS} from 'battlecode';
import qmath from 'math.js'

//bfsDeltas[i] gives all the relative deltas from a current position that is within radius^2 i and is sorted by closeness
const bfsDeltas = {
  0: [[0,0]],
  1: [[0,0], [0,-1], [1, 0], [0, 1], [-1, 0]],
  2: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  3: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  4: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -2], [2, 0], [0, 2], [-2, 0]],
}

//Search in a circle
function circle(self, xpos, ypos, radius) {
  let positions = [];
  let deltas = bfsDeltas[radius];
  let deltaLength = deltas.length;
  for (let k = 0; k < deltaLength; k++) {
   
    let nx = xpos + deltas[k][0];
    let ny = ypos + deltas[k][1];
    //self.log(`circle xy: ${xpos}, ${ypos}; NEW: ${nx}, ${ny}`);
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
//perform BFS on a 2d array, starting fromm arr[i][j]. 
//Comparator is a function and if it returns true, we stop the bfs
//Returns false and we continue

//comparator2 checks if a new added position is valid or not
function bfs(self, i, j, comparator, comparator2) {
  let visited = [];
  let priorityQueue = [{pos:{x:i,y:j},dist:0}];
  let myMap = self.map;
  
  let initialTime = new Date();
  
  while (priorityQueue.length > 0) {
    let currentTime = new Date();
    //self.log(`Time: ${(currentTime - initialTime)}`);
    let check = priorityQueue.shift();
    
    //e.g if that check position is a fuel place
    if (comparator(self, check.pos.x, check.pos.y) === true){
      return [check.pos.x, check.pos.y];
    }
    else {
      visited.push(check);
      let neighbors = getNeighbors(check.pos.x, check.pos.y);
      for (let k = 0; k < neighbors.length; k++) {
        
        let nx = neighbors[k][0];
        let ny = neighbors[k][1];
        let neighbor = {pos:{x:nx,y:ny},dist:qmath.dist(i,j,nx,ny)}
        
        //check if neighbor position is valid . eg if its passable terrain
        if (inArr(nx,ny,myMap) && comparator2(self, nx, ny) === true) {
          //check if previously unvisited
          let visitedThis = false;
          //maybe run from length to 0, may be faster
          for (let p = 0; p < visited.length; p++) {
            if (visited[p].pos.x === nx && visited[p].pos.y === ny){
              visitedThis = true;
              break;
            }
          }
          //if previously unvisted, add to queue, then sort entire queue
          if (visitedThis === false) {
            priorityQueue.push(neighbor);
          }
        }
      }
      
      //re sort queue by least distance
      /*
      priorityQueue.sort(function(a,b){
        return a.dist - b.dist;
      });
      */
    }
  }
}
function getNeighbors(i,j) {
  return [[i+1,j],[i,j+1],[i-1,j],[i,j-1]];
}

//Finds nearest friendly structure (Castle or Church).
function findNearestStructure(self) {
  let visibleRobots = self.getVisibleRobots();
  let shortestDist = 10000000;
  let bestTarget = null;
  
  //First we search through known locations in case these structures aren't visible
  for (let i = 0; i < self.knownStructures[self.me.team].length; i++) {
    let friendlyStructure = self.knownStructures[self.me.team][i];
    let distToStruct = qmath.dist(self.me.x, self.me.y, friendlyStructure.x, friendlyStructure.y);
    if (distToStruct < shortestDist) {
      shortestDist = distToStruct;
      bestTarget = friendlyStructure;
      //self.log(`Pilgrim-${self.me.id} found past struct: ${bestTarget}`);
    }
  }
  
  
  
  //Now we search through the robots that are visible by this robot.
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
  //self.log(`${bestTarget.x},${bestTarget.y}`)
  return bestTarget;
}


//Finds the nearest enemy unit, optionally searches for nearest unit type unit
//returns null if no nearby enemies
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

//returns an object with different unit types as keys, containing an array of units within radius, bounded by vision,
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

//determine if map is horizontally symmetrical by checking line by line for equal passable tiles
function horizontalSymmetry(gameMap){
  
  //We check the first line of squares and compare with the last line of squares
  //Then we check the next line and so forth
  for (let i = 0; i < 4/*gameMap.length/2*/; i++) {
    for (let j = 0; j < gameMap[i].length; j++) {
      if (gameMap[i][j] !== gameMap[gameMap.length - i - 1][j]) {
        return false;
      }
    }
  }
  return true;
}
export default {circle, bfsDeltas, emptyPos, bfs, canPass, fuelDeposit, karboniteDeposit, findNearestStructure, horizontalSymmetry, inArr, unitsInRadius};