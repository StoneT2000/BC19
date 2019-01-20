import qmath from 'math.js'
import search from 'search.js';


//unitMoveFuelCosts corresponds directly with unitMoveDeltas in terms of unittype and cost for that move at that index
//unitMoveDeltas sorted by fuel cost
const unitMoveDeltas = {
  0:null,
  1:null,
  //pilgrim: max travel distance^2 = 4
  2:[[0,0],
     [0,-1], [1, 0], [0, 1], [-1, 0], 
     
     [1,-1], [1, 1], [-1, 1], [-1, -1],
     
     [0,-2], [2, 0], [0, 2], [-2, 0]
    ],
  //crusader: max travel distance^2 = 9
  3:[[0,0],
     [0,-1], [1, 0], [0, 1], [-1, 0], 
     
     [1,-1], [1, 1], [-1, 1], [-1, -1],
     
     [0,-2], [2, 0], [0, 2], [-2, 0],
     
     [1,-2], [1, 2], [-1, 2], [-1, -2],
     [2,-2], [2, 2], [-2, 2], [-2, -2],
     [0,-3], [3,0], [0,3], [-3,0]
    ],
  //prophet: max travel distance^2 = 4
  4:[[0,0],
     [0,-1], [1, 0], [0, 1], [-1, 0], 
     
     [1,-1], [1, 1], [-1, 1], [-1, -1],
     
     [0,-2], [2, 0], [0, 2], [-2, 0]
    ],
  //preacher: max travel distance^2 = 4
  5:[[0,0],
     [0,-1], [1, 0], [0, 1], [-1, 0], 
     
     [1,-1], [1, 1], [-1, 1], [-1, -1],
     
     [0,-2], [2, 0], [0, 2], [-2, 0]
    ],
  
}
const unitMoveFuelCosts = {
  0:null,
  1:null,
  //pilgrim: fuel costs per distance^2 = 1;
  2:[0,
     1,1,1,1,
     2,2,2,2,
     4,4,4,4],
  //crusader: fuel costs per distance^2 = 1;
  3:[0,
     1,1,1,1,
     2,2,2,2,
     4,4,4,4,
     5,5,5,5, 8,8,8,8, 9,9,9,9
    ],
  //prophet: fuel costs per distance^2 = 2;
  4:[0,
     2,2,2,2,
     4,4,4,4,
     8,8,8,8],
  //preacher: fuel costs per distance^2 = 3;
  5:[0,
     3,3,3,3,
     6,6,6,6,
     12,12,12,12],
}
//gives relative dx and dy from p1x,p1y
function rel(p1x, p1y, p2x, p2y) {
  return {dx: p2x-p1x, dy: p2y-p1y};
}
const unitAttackFuelCosts = {
  0:null,
  1:null,
  2:null,
  3:10,
  4:25,
  5:15,
}
/*
*
* Greedy algorithm that returns relative dx dy that this unit should take that reaches the closest to target p2x,p2y within fuel constraints, passability etc.
* @param {number} p1x - x
* @param {number} p1y - x
* @param {number} p2x - x
* @param {number} p2y - x
* @param {self} self - self
* @param {boolean} avoidFriends - whether or not avoid friendly units to avoid clumping
*/
function relToPos(p1x, p1y, p2x, p2y, self, avoidFriends = false, fast = true) {
  let vals = rel(p1x, p1y, p2x, p2y);
  let deltas = unitMoveDeltas[self.me.unit];
  if (fast === false) {
    deltas = unitMoveDeltas[self.me.unit].slice(0, 8);
  }
  let robotMap = self.getVisibleRobotMap();
  let closestDist = qmath.dist(p2x,p2y,p1x, p1y);
  let bestDelta = [0,0];
  for (let i = 0; i < deltas.length; i++) {

    let nx = p1x+deltas[i][0];
    let ny = p1y+deltas[i][1]
    let pass = self.canMove(deltas[i][0],deltas[i][1])
    if (pass === true){
      let validPlace = true;
      if (avoidFriends) {
        
        let checkPositions = search.circle(self, nx, ny, 2);
        for (let k = 1; k < checkPositions.length; k++) {
          let pos = checkPositions[k];
          //self.log(`Check for friends at ${pos}`)
          let robotThere = self.getRobot(robotMap[pos[1]][pos[0]]);
          if (robotThere !== null && robotThere.team === self.me.team && robotThere.id !== self.me.id) {
            validPlace = false;
          }
        }
      }
      //self.log(`${nx}, ${ny} is valid?:${validPlace}`);
      if (validPlace){
        let distLeft = qmath.dist(nx,ny,p2x,p2y);
        if (distLeft < closestDist) {
          closestDist = distLeft;
          bestDelta = deltas[i];
        }
      }
    }
  }
  return {dx:bestDelta[0], dy:bestDelta[1]};
}

//Log the structureBot into known structures if it hasn't been put there already
function logStructureBot(self, structureBot) {
  let teamNum = structureBot.team;
  let exists = false;
  for (let k = 0; k < self.knownStructures[teamNum]; k++) {
    let knownStructure = self.knownStructures[teamNum][k];
    if (structureBot.x === knownStructure.x && structureBot.y === knownStructure.y) {
      exist = true;
      break;
    }
  }
  //log structure
  if (exists === false) {
    self.knownStructures[structureBot.team].push({x:structureBot.x,y:structureBot.y,unit:structureBot.unit});
  }
}

/*
* Logs a structure of unit type unit at x,y of team: team. Stores it in self.knownStructures if it doesn't exist already
* 
*/
function logStructure(self, x, y, team, unit, push = true) {
  let exists = false;
  for (let k = 0; k < self.knownStructures[team].length; k++) {
    let knownStructure = self.knownStructures[team][k];
    //self.log(`${knownStructure.x}, ${knownStructure.y}`);
    if (x === knownStructure.x && y === knownStructure.y) {
      exists = true;
      break;
    }
  }
  //log structure
  if (exists === false) {
    if (push === true){
      self.knownStructures[team].push({x:x,y:y,unit:unit});
    }
    else {
      self.knownStructures[team].unshift({x:x,y:y,unit:unit});
    }
  }
}

//Checks within vision and updates itself whether or not a structure still exists
function updateKnownStructures(self) {
  let robotMap = self.getVisibleRobotMap();
  //self.log(`ORIG ENEMY CASTLE: ${self.knownStructures[1][0].x},${self.knownStructures[1][0].y}`);
  //self.log(`NEW ENEMY CASTLE: ${self.knownStructures[1][1].x},${self.knownStructures[1][1].y}`);
  
  for (let teamNum = 0; teamNum < 2; teamNum++){
    let newKnownStructures = [];
    for (let k = 0; k < self.knownStructures[teamNum].length; k++) {
      let knownStructure = self.knownStructures[teamNum][k];
      let id = robotMap[knownStructure.y][knownStructure.x];
      let orobot = self.getRobot(id);
      //self.log(`${teamNum}: Struct at ${knownStructure.x},${knownStructure.y} is ${orobot}`);
      if (orobot === null){
        //we dont know about the structure's whereabouts
        newKnownStructures.push(knownStructure);
      }
      else if (orobot.unit === knownStructure.unit) {
        //structure is still there
        newKnownStructures.push(knownStructure);
      }
      else if (teamNum !== self.me.team){
        //structure is def. gone
        //destroyed structure, send signal to castle about its death
        self.log(`Killed castle`);
        if (self.mapIsHorizontal){
          self.castleTalk(7 + knownStructure.x);
        }
        else {
          self.castleTalk(7 + knownStructure.y);
        }
        self.destroyedCastle = true;
      }
      

    }
    self.knownStructures[teamNum] = newKnownStructures;
  }
  for (let i = 0; i < self.knownStructures[1].length; i++) {
    //self.log(`Enemy structs: ${self.knownStructures[1][1].x}, ${self.knownStructures[1][1].y}`);
  }
  
}
function destroyedCastle(self) {
}

export default {rel, relToPos, unitMoveDeltas, logStructure, updateKnownStructures, destroyedCastle};