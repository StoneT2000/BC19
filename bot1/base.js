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
//implement a waypoint map later using this
/*
*
* Greedy algorithm that returns relative dx dy that this unit should take that reaches the closest to target p2x,p2y within fuel constraints, passability etc.
* @param {number} p1x - x
* @param {number} p1y - x
* @param {number} p2x - x
* @param {number} p2y - x
* @param {self} self - self
*/
function relToPos(p1x, p1y, p2x, p2y, self) {
  let vals = rel(p1x, p1y, p2x, p2y);
  let deltas = unitMoveDeltas[self.me.unit];
  //let fuelCosts = unitMoveFuelCosts[self.me.unit];
  
  let closestDist = qmath.dist(p2x,p2y,p1x, p1y);
  let bestDelta = [0,0];
  //self.log(`bot: ${self.me.id} checks ${p1x},${p1y}, d(${0}, ${0}) distLeft: ${closestDist}`);
  for (let i = 0; i < deltas.length; i++) {

    let nx = p1x+deltas[i][0];
    let ny = p1y+deltas[i][1]
    let pass = self.canMove(deltas[i][0],deltas[i][1])
    if (pass === true){
      let distLeft = qmath.dist(nx,ny,p2x,p2y);
      //self.log(`bot: ${self.me.id} checks ${nx},${ny}, d(${deltas[i][0]}, ${deltas[i][1]}) distLeft: ${distLeft}`);
      if (distLeft < closestDist) {
        closestDist = distLeft;
        bestDelta = deltas[i];
      }
    }
  }
  return {dx:bestDelta[0], dy:bestDelta[1]};
}

//Log the structureBot into known structures if it hasn't been put there already
function logStructure(self, structureBot) {
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
    self.knownStructures.push({x:structureBot.x,y:structureBot.y,unit:structureBot.unit});
  }
}

//Checks within vision and updates itself whether or not a structure still exists
function updateKnownStructures(self) {
  
}


export default {rel, relToPos, unitMoveDeltas};