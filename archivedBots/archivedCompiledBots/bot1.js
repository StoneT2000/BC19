'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":50,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":20,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":36,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.

        if (this.fuel < radius) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= radius;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit !== SPECS.CRUSADER && this.me.unit !== SPECS.PREACHER && this.me.unit !== SPECS.PROPHET) throw "Given unit cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot attack impassable terrain.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === 0) throw "Cannot attack empty tile.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('x' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

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
var qmath = {dist};

const bfsDeltas = {
  0: [[0,0]],
  1: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]
};

function circle(xpos, ypos, radius) {
  let positions = [];
  let deltas = bfsDeltas[radius];
  let deltaLength = deltas.length;
  for (let k = 0; k < deltaLength; k++) {
    positions.push([xpos + deltas[k][0], ypos + deltas[k][1]]);
  }
  return positions;
}

function emptyPos(xpos, ypos, robotMap, passableMap) {
  //can be reduce to an or function
  if (inArr(xpos,ypos, robotMap)) {
    if (robotMap[ypos][xpos] === 0) {
      if (passableMap[ypos][xpos] === true){
        return true;
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
  
  while (priorityQueue.length > 0) {
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
        let neighbor = {pos:{x:nx,y:ny},dist:qmath.dist(i,j,nx,ny)};
        
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
function findNearestStructure(self) {
  let visibleRobots = self.getVisibleRobots();
  let shortestDist = 10000000;
  let bestTarget = [];
  
  //search through known locations
  for (let i = 0; i < self.knownStructures[self.me.team].length; i++) {
    let friendlyStructureLoc = self.knownStructures[self.me.team][i];
    let distToStruct = qmath.dist(self.me.x, self.me.y, friendlyStructureLoc[0], friendlyStructureLoc[1]);
    if (distToStruct < shortestDist) {
      shortestDist = distToStruct;
      bestTarget = friendlyStructureLoc;
      //self.log(`Pilgrim-${self.me.id} found past struct: ${bestTarget}`);
    }
  }
  
  
  
  //if there are no visible robots, go to nearest known structure
  for (let i = 0; i < visibleRobots.length; i++) {
    let thatRobot = visibleRobots[i];
    if (thatRobot.unit === SPECS.CHURCH || thatRobot.unit === SPECS.CASTLE) {
      if (thatRobot.team === self.me.team){
        let distToStruct = qmath.dist(self.me.x, self.me.y, thatRobot.x, thatRobot.y);
        if (distToStruct < shortestDist) {
          shortestDist = distToStruct;
          bestTarget = [thatRobot.x, thatRobot.y];
        }
      }
    }
  }
  if (bestTarget.length === 0) {
    return false;
  }
  return bestTarget;
}
function horizontalSymmetry(gameMap){
  //determine if map is horizontally symmetrical by checking line by line for equal passable tiles
  for (let i = 0; i < 4/*gameMap.length/2*/; i++) {
    for (let j = 0; j < gameMap[i].length; j++) {
      if (gameMap[i][j] !== gameMap[gameMap.length - i - 1][j]) {
        return false;
      }
    }
  }
  return true;
}
var search = {circle, bfsDeltas, emptyPos, bfs, canPass, fuelDeposit, karboniteDeposit, findNearestStructure, horizontalSymmetry};

function dist$1(p1x, p1y, p2x, p2y) {
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
var qmath$1 = {dist: dist$1};

function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  
  
  self.log(`Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}`);
  
  
  if (self.me.turn === 1){
    //initialization for the castle
    
    //CALCULATING HOW MANY INITIAL CASTLES WE HAVE
    //we make the assumption that each castle makes a pilgrim first thing
    let offsetVal = 0;
    if (self.karbonite === 90) {
      offsetVal = 1;
    }
    else if (self.karbonite === 80) {
      offsetVal = 2;
    }
    self.log(`We have ${robotsInVision.length - offsetVal} castles`);
    self.castles = robotsInVision.length - offsetVal;
    
    let fuelMap = self.getFuelMap();
    let karboniteMap = self.getKarboniteMap();
    for (let i = 0; i < fuelMap.length; i++) {
      for (let j = 0; j < fuelMap[0].length; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
        }
      }
    }
    let numFuelSpots = self.fuelSpots.length;
    self.maxPilgrims = numFuelSpots/2;
    self.buildQueue.push(2,2,2);
    
    
  }
  
  
  
  //check for signals in castle talk
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    //self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
    processMessageCastle(self, msg);
  }
  
  
  
  //building code
  let adjacentPos = search.circle(self.me.x, self.me.y, 1);
  for (let i = 1; i < adjacentPos.length; i++) {
    let checkPos = adjacentPos[i];
    //prioritize building direction in future?

    if(canBuild(checkPos[0], checkPos[1], robotsMapInVision, passableMap)){
      if (self.status === 'build') {
        if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
          //build the first unit put into the build queue
          let unit = self.buildQueue.shift(); //remove that unit
          
          self.log(`Building a ${unit} at ${checkPos[0]}, ${checkPos[1]}`);
          if (unit === 2){
            self.buildQueue.push(3,3);
          }
          else if (self.pilgrims <= self.maxPilgrims){
            self.buildQueue.push(2);
          }
          
          
          return {action: self.buildUnit(unit, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'build', response:'built'};
        }
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
  let fuelCost = SPECS.UNITS[unitType].CONSTRUCTION_FUEL;
  let karbCost = SPECS.UNITS[unitType].CONSTRUCTION_KARBONITE;
  if (fuelCost <= self.fuel) {
    if (karbCost <= self.karbonite) {
      return true;
    }
  }
  return false;
}

function processMessageCastle(self, msg) {
  switch(msg) {
    case 1:
      self.churches += 1;
      break;
    case 2:
      self.pilgrims += 1;
      break;
    case 3:
      self.crusaders += 1;
      break;
    default:
      break;
  }
}


var castle = {mind};

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
  
};
//gives relative dx and dy from p1x,p1y
function rel(p1x, p1y, p2x, p2y) {
  return {dx: p2x-p1x, dy: p2y-p1y};
}

//implement half-A* later using this. Half-A* means using way points from which to go from waypoint A to waypoint B, relToPos suffices to travel from A to B. 
//relToPos gives relative dx dy that this unit should take that reaches the closest to target p2x,p2y within fuel constraints, passability etc.
function relToPos(p1x, p1y, p2x, p2y, self) {
  let deltas = unitMoveDeltas[self.me.unit];
  //let fuelCosts = unitMoveFuelCosts[self.me.unit];
  
  let closestDist = qmath.dist(p2x,p2y,p1x, p1y);
  let bestDelta = [0,0];
  for (let i = 0; i < deltas.length; i++) {

    let nx = p1x+deltas[i][0];
    let ny = p1y+deltas[i][1];
    let pass = self.canMove(deltas[i][0],deltas[i][1]);
    if (pass === true){
      let distLeft = qmath.dist(p2x,p2y,nx, ny);
      //self.log(`bot: ${self.me.id} checks ${nx},${ny}, distLeft: ${distLeft}`);
      if (distLeft < closestDist) {
        closestDist = distLeft;
        bestDelta = deltas[i];
      }
    }
  }
  return {dx:bestDelta[0], dy:bestDelta[1]};
}

var base = {rel, relToPos, unitMoveDeltas};

function mind$1(self) {
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)];
  //
  self.log(`Pilgrim (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let target = self.target;
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();
  //we can improve the speed here by using bfs
  
  
  //Initialization code for robot to at least store the structure robot is born in

  if (self.status === 'justBuilt') {
    //for pilgrims, search first
    self.status = 'searchForDeposit';
    let origCastleLoc = search.findNearestStructure(self);
    self.knownStructures[self.me.team].push(origCastleLoc);
    /*
    let castleId = robotMap[origCastleLoc[1]][origCastleLoc[0]];
    let castleSignal = self.getRobot(castleId).signal;
    self.log(`Signal from born castle-${castleId}: ${castleSignal}`)
    */
    self.castleTalk(self.me.unit);
    
    for (let i = 0; i < fuelMap.length; i++) {
      for (let j = 0; j < fuelMap[0].length; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
        }
      }
    }
    
    
    
  }
  //if robot is going to deposit but it is taken up, search for new deposit loc.
  if (self.status === 'goingToDeposit') {
    if (robotMap[target[1]][target[0]] !== self.me.id){
      self.status = 'searchForDeposit';
    }
  } 
  if (self.status === 'searchForDeposit') {
    //perform search for closest deposit
    let it = new Date();
    //let newTarget = search.bfs(self, self.me.x, self.me.y, search.fuelDeposit, search.canPass)
    //^^ bfs is slower????
    
    let newTarget;
    let cd = 9999990;
    
    for (let i = 0; i < self.fuelSpots.length; i++) {
      let nx = self.fuelSpots[i].x;
      let ny = self.fuelSpots[i].y;
      if (robotMap[ny][nx] <= 0){
        //self.log(`Robot at ${j},${i}:${robotMap[i][j]}`)
        let distToThere = qmath$1.dist(self.me.x,self.me.y,nx,ny);
        if (distToThere < cd) {
          cd = distToThere;
          newTarget = [nx,ny];
        }
      }
    }
    for (let i = 0; i < self.karboniteSpots.length; i++) {
      let nx = self.karboniteSpots[i].x;
      let ny = self.karboniteSpots[i].y;
      if (robotMap[ny][nx] <= 0){
        //self.log(`Robot at ${j},${i}:${robotMap[i][j]}`)
        let distToThere = qmath$1.dist(self.me.x,self.me.y,nx,ny);
        if (distToThere < cd) {
          cd = distToThere;
          newTarget = [nx,ny];
        }
      }
    }
    
    let ft = new Date();
    self.log(`took:${ft-it}ms`);
    
    let rels = base.relToPos(self.me.x, self.me.y, newTarget[0], newTarget[1], self);
    return {action:self.move(rels.dx,rels.dy), status:'goingToDeposit', target: newTarget};
    
  }
  

  
  
  //When pilgrim is returning to structure to deliver karbo or fuel...
  if (self.status === 'return') {
    
    
    
    if (self.me.x === target[0] && self.me.y === target[1]) {
      //shouldn't happen
      return {action:''};
    }
    else {
      let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let currRels = base.rel(self.me.x, self.me.y, target[0], target[1]);
      if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
        //if abs value of dx and dy are 1 or less, ship is next to church or castle, deliver all fuel
        self.log(`${currRels.dx}, ${currRels.dy}`);
        return {action:self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel), status:'searchForDeposit', target: [self.me.x,self.me.y]}
      }
      return {action:self.move(rels.dx,rels.dy), status:'return', target: target};  
    }
  }
  
  //let visibleRobots = self.getVisibleRobots();
  
  if ((self.me.fuel >= 100 || self.me.karbonite >= 20) && self.status !== 'return') {
    //send karbo
    let bestTarget = search.findNearestStructure(self);
    //if there are no visible robots, go to nearest known structure
    
    let rels = base.relToPos(self.me.x, self.me.y, bestTarget[0], bestTarget[1], self);
    let currRels = base.rel(self.me.x, self.me.y, bestTarget[0], bestTarget[1]);
    if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
      //if abs value of dx and dy are 1 or less, ship is next to church or castle, deliver all fuel
      self.log(`${currRels.dx}, ${currRels.dy}`);
      return {action:self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel), status:'searchForDeposit', target: [self.me.x,self.me.y]}
    }
    return {action:self.move(rels.dx,rels.dy), status:'return', target: bestTarget};
  }
  
  //forever mine
  if (fuelMap[self.me.y][self.me.x] === true) {
    return {action:self.mine(), status:'mine', target: [self.me.x,self.me.y]};
  }
  else if (karboniteMap[self.me.y][self.me.x] === true) {
    return {action:self.mine(), status:'mine', target: [self.me.x,self.me.y]};
  }
  
  let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
  return {action:self.move(rels.dx,rels.dy), status:self.status, target: target};  
  
  
  return {action: self.move(...choice), status: 'searchForDeposit', target: []};
  //return self.move(0,0);
}

var pilgrim = {mind: mind$1};

function mind$2(self){
  let target = self.target;
  let gameMap = self.map;
  
  self.log(`Crusader (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  if (self.status === 'justBuilt') {
    //broadcast your unit number for castles to add to their count of units
    self.castleTalk(self.me.unit);
    
    let exploreTarget = [gameMap[0].length - self.me.x - 1, gameMap.length - self.me.y - 1];
    if (search.horizontalSymmetry(gameMap)) {
      exploreTarget = [self.me.x, gameMap.length - self.me.y - 1];
    }
    else {
      exploreTarget = [gameMap[0].length - self.me.x - 1, self.me.y];
    }
    
    let rels = base.relToPos(self.me.x, self.me.y, exploreTarget[0], exploreTarget[1], self);
    return {action:self.move(rels.dx,rels.dy), status:'searchAndAttack', target: exploreTarget};
  }
  let robotsInVision = self.getVisibleRobots();
  if (self.status === 'searchAndAttack') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        //if bot sees enemy structures, log it, and send to castle
        if (obot.unit === SPECS.CASTLE || obot.unit === SPECS.CHURCH) ;
        
        
        let distToThisTarget = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget) {
          leastDistToTarget = distToThisTarget;
          target = [obot.x, obot.y];
          isEnemy = true;
          enemyBot = obot;
        }
        
      }
    }
    //enemy nearby, attack it?
    if (leastDistToTarget <= 16 && isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, target[0], target[1]);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        if (enemyBot.health <= 10) {
          //enemy bot killed
          //finish attack by returning attack move and then set target to nothing, forcing bot do something else whilst searching for enemies
          return {action:self.attack(rels.dx,rels.dy), status:'searchAndAttack', target:[]}; //[Math.floor(Math.random()*gameMap[0].length),Math.floor(Math.random()*gameMap.length)]
        }
        return {action:self.attack(rels.dx,rels.dy), status:'searchAndAttack', target: target};
      }
      else {
        return {action:'', status:'searchAndAttack', target: target};
      }
      //if (enemyBot.health)
      
      
    }
  }
  if (target.length > 0 && self.status === 'searchAndAttack'){
    let distToTarget = qmath$1.dist(self.me.x, self.me.y, target[0], target[1]);
    if (distToTarget <= 2){
      target = [Math.floor(Math.random()*gameMap[0].length),Math.floor(Math.random()*gameMap.length)];
    }
    let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
    if (self.canMove(rels.dx, rels.dy)){
      return {action:self.move(rels.dx,rels.dy), status:'searchAndAttack', target: target};
    }
    else {
      return {action:'', status:'searchAndAttack', target: target};
    }
  }
  
  self.log(`Randomly moving`);
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)];
  return {action: self.move(...choice), status: 'searchAndAttack', target: []};
  

  
}
var crusader = {mind: mind$2};

/* SYSTEM
* We run unit.mind(this) to get decisions
* That returns an object result where
* result.action = the action to be returned
* status = new status the bot should take. status = null means no change
* response = a response to what was given
*/

class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    this.status = 'justBuilt'; //current status of robot; just built means bot was just built has no prior status
    this.target = [0,0]; //current target destination for robot
    this.waypointMap = []; //stores waypoints
    this.waypointEdges = []; //stores edges connecting waypoints. an edge exists if there is a direct clear easy path from one way point to the other
    //note, this waypointMap and Edges is basically a connected graph. Also, for different units the way points are different because some units can move farther. using different waypoints will take advantage of the fact that units can jump over walls.
    //maybe just let castles calculate the waypoints, and then let it communicate the map to everyone)
    this.knownStructures = {0:[],1:[]}; //contains positions of all the known structures this robot knows. Keys are ids of structures seen
    //this.knownStructures[id].team = team the structure is on, .position = [x,y] position array;
    this.knownDeposits = {};
    this.churches = 0;
    this.pilgrims = 0;
    this.maxPilgrims = 0;
    this.buildQueue = []; //queue of what unit to build for castles and churches
    this.crusaders = 0;
    this.castles = 0;
    this.fuelSpots = [];
    this.karboniteSpots = [];
  };
  
  turn() {
    //this.log(`Turn ${this.me.turn}: ID: ${this.id} Unit Type: ${unitTypesStr[this.me.unit]}`);

    
    if (this.me.unit === SPECS.CASTLE) {
      let result = {action:''};
      this.status = 'build';
      result = castle.mind(this);
      this.status = result.status;
      /*
      if (this.pilgrims < maxPilgrims){
        this.status = 'buildPilgrim';
        
        if (result.response === 'built') {
        }
      }
      else if (this.crusaders < maxCrusader){
        this.status = 'buildCrusader';
        result = castle.mind(this);
      }
      */

      //return this.buildUnit(SPECS.PILGRIM,1,1);
      return result.action;
    }
    else if (this.me.unit === SPECS.CRUSADER) {
      let result = crusader.mind(this);
      this.status = result.status;
      this.target = result.target;
      return result.action;
    } 
    else if (this.me.unit === SPECS.PILGRIM) {
      let result = pilgrim.mind(this);
      this.status = result.status;
      this.target = result.target;
      return result.action;
    } 
  }
  
  //other helper functions

  /* 
  * Returns whether or not a bot can move dx dy
  * @param {number} dx - move dx in x direction
  * @param {number} dy - move dy in y direction
  */
  canMove(dx, dy) {
    let robotMap = this.getVisibleRobotMap();
    let passableMap = this.getPassableMap();
    let fuelCost = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;
    let dist2 = qmath$1.dist(dx, dy);
    fuelCost *= dist2;

    if(this.fuel >= fuelCost && search.emptyPos(this.me.x + dx, this.me.y + dy, robotMap, passableMap)) {
      return true;
    }
    return false;
  }

  /*
  * Returns true if bot has enough fuel to attack
  */
  readyAttack() {
    let fuelCost = SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST;
    if (this.fuel >= fuelCost) {
      return true;
    }
  }
  
}

var robot = new MyRobot();
robot.log(`New Bot: ${robot.id}`);
var robot = new MyRobot();
