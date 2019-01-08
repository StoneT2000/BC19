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

//implement half-A* later using this. Half-A* means using way points from which to go from waypoint A to waypoint B, relToPos suffices to travel from A to B. 
//relToPos gives relative dx dy that this unit should take that reaches the closest to target p2x,p2y within fuel constraints, passability etc.
function relToPos(p1x, p1y, p2x, p2y, self) {
  let vals = rel(p1x, p1y, p2x, p2y);
  let deltas = unitMoveDeltas[self.me.unit];
  let fuelCosts = unitMoveFuelCosts[self.me.unit];
  
  let closestDist = qmath.dist(p2x,p2y,p1x, p1y);
  let bestDelta = [0,0];
  for (let i = 0; i < deltas.length; i++) {

    let nx = p1x+deltas[i][0];
    let ny = p1y+deltas[i][1]
    //self.log(`bot: ${self.me.id} checks ${nx},${ny}`);
    if (self.fuel + self.me.fuel >= fuelCosts[i]){
      //enough fuel to move that far?
      
      //passable?
      let pass = search.emptyPos(nx, ny, self.getVisibleRobotMap(), self.getPassableMap());
      if (pass === true){
        let distLeft = qmath.dist(p2x,p2y,nx, ny);
        //self.log(`bot: ${self.me.id} checks ${nx},${ny}, distLeft: ${distLeft}`);
        if (distLeft < closestDist) {
          closestDist = distLeft;
          bestDelta = deltas[i];
        }
      }
    }
  }
  return {dx:bestDelta[0], dy:bestDelta[1]};
}

export default {rel, relToPos, unitMoveDeltas};