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

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

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
    //let vals = {dx: (p2x - p1x), dy: (p2y - p1y)};
    return (p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y);
}
function distDelta(dx,dy) {
  return dx * dx + dy * dy;
}
function unitDist(p1x,p1y,p2x,p2y) {
  return Math.abs(p2x-p1x) + Math.abs(p2y-p1y);
}
var qmath = {dist, distDelta, unitDist};

//bfsDeltas[i] gives all the relative deltas from a current position that is within radius^2 i and is sorted by closeness
const bfsDeltas = {
  0: [[0,0]],
  1: [[0,0], [0,-1], [1, 0], [0, 1], [-1, 0]],
  2: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  3: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  4: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -2], [2, 0], [0, 2], [-2, 0]],
};

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

//returns an object with different unit types as keys, containing an array of units within radius, bounded by vision,
function unitsInRadius(self, radius) {
  let robotsInVision = self.getVisibleRobots();
  let unitsInVincinity = {0:[],1:[],2:[],3:[],4:[],5:[]};
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit <= radius) {
        unitsInVincinity[obot.unit].push(obot);
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
var search = {circle, bfsDeltas, emptyPos, bfs, canPass, fuelDeposit, karboniteDeposit, findNearestStructure, horizontalSymmetry, inArr, unitsInRadius};

/*
* Updates self appropriately, whether it be variables or status
* @param {robot} self - The robot object
* @param {number} msg - the message value
*/
function processMessageCastleTalk(self, msg, id) {
  switch(msg) {
    case 1:
      self.allUnits[id] = msg;
      break;
    case 2:
      self.allUnits[id] = msg;
      break;
    case 3:
      self.allUnits[id] = msg;
      break;
    case 4:
      self.allUnits[id] = msg;
      break;
    case 5:
      self.allUnits[id] = msg;
      break;
    case 6:
      self.status = 'pause';
      break;
    case 7:
      //this means castle opposing the very first castle in turnqueue is gone
      //let pmsg = msg - 7;
      //self.knownStructures[self.me.team].shift();
    case 8:
      //this means castle opposing the 2nd caslte in queue is gone
      //self.knownStructures[self.me.team].shift();
      break;
    case 9:
      //this means castle oppoisng the 3rd caslte in queue is gone
      //self.knownStructures[self.me.team].shift();
      break;
    default:
      break;
  }
}
function processMessageCastle (self, msg, id) {
}

/* All of the bottom message processing functions will receive the same message if within range
* 
*/
function processMessageCrusader(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
    case 16390:
      self.status = 'rally';
      self.finalTarget = self.rallyTarget;
      break;
    case 16391:
      self.status = 'defend';
      self.finalTarget = self.defendTarget;
      break;
  }
}
function processMessagePreacher(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
    case 5:
      //preachers waiting for stack of fuel to engage in next venture stay as that status
      if (self.status !== 'waitingForFuelStack'){
        self.status = 'defend';
      }
      break;
    //if message is from 6 to 4101, this is a map location, with 6 units of padding. Used to tell attacking units to target a location
      //if message is from 4102, to 8197, this is a map location that a castle tells the unit, it is the map location of an enemy castle.
      //if message is from 8198 12293
      //if message is from 12294 to 16389, attack target
    case 16390:
      self.status = 'rally';
      self.finalTarget = self.rallyTarget;
      break;
    case 16391:
      self.status = 'defend';
      self.finalTarget = self.defendTarget;
      break;
  }
}
function processMessageProphet(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
    case 5:
      //preachers waiting for stack of fuel to engage in next venture stay as that status
      if (self.status !== 'waitingForFuelStack'){
        self.status = 'defend';
      }
      break;
    case 16390:
      self.status = 'defend';
      self.finalTarget = self.defendTarget;
      break;
    case 16391:
      self.status = 'defend';
      self.finalTarget = self.defendTarget;
      break;
  }
}
function processMessageChurch(self, msg){
}
function processMessagePilgrim(self, msg){
  switch (msg){
    case 2:
      self.status = 'searchForKarbDeposit';
      break;
    case 3:
      self.status = 'searchForFuelDeposit';
      break;
  }
}

var signal = {processMessageCastleTalk, processMessageCastle, processMessageCrusader, processMessagePreacher, processMessageProphet, processMessageChurch, processMessagePilgrim};

function dist$1(p1x, p1y, p2x, p2y) {
  //if 4 arguments given, process them as x,y positions
    //let vals = {dx: (p2x - p1x), dy: (p2y - p1y)};
    return (p2x - p1x) * (p2x - p1x) + (p2y - p1y) * (p2y - p1y);
}
function distDelta$1(dx,dy) {
  return dx * dx + dy * dy;
}
function unitDist$1(p1x,p1y,p2x,p2y) {
  return Math.abs(p2x-p1x) + Math.abs(p2y-p1y);
}
var qmath$1 = {dist: dist$1, distDelta: distDelta$1, unitDist: unitDist$1};

//bfsDeltas[i] gives all the relative deltas from a current position that is within radius^2 i and is sorted by closeness
const bfsDeltas$1 = {
  0: [[0,0]],
  1: [[0,0], [0,-1], [1, 0], [0, 1], [-1, 0]],
  2: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  3: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]],
  4: [[0,0], [0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -2], [2, 0], [0, 2], [-2, 0]],
};

//Search in a circle
function circle$1(self, xpos, ypos, radius) {
  let positions = [];
  let deltas = bfsDeltas$1[radius];
  let deltaLength = deltas.length;
  for (let k = 0; k < deltaLength; k++) {
   
    let nx = xpos + deltas[k][0];
    let ny = ypos + deltas[k][1];
    //self.log(`circle xy: ${xpos}, ${ypos}; NEW: ${nx}, ${ny}`);
    if (inArr$1(nx,ny, self.map)){
      positions.push([nx,ny]);
    }
  }
  return positions;
}

function emptyPos$1(xpos, ypos, robotMap, passableMap, inVision = true) {
  if (inArr$1(xpos,ypos, robotMap)) {
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

function canPass$1(self,x,y) {
  
  let passableMap = self.getPassableMap();
  if (inArr$1(x,y, passableMap)) {
    return passableMap[y][x];
  }
  return false;
}
function fuelDeposit$1(self,x,y) {
  let fuelMap = self.getFuelMap();
  return fuelMap[y][x];
}
function karboniteDeposit$1(self,x,y) {
  let karboniteMap = self.getKarboniteMap();
  return karboniteMap[y][x];
}
function inArr$1(x,y,arr) {
  if (x < 0 || y < 0 || x >= arr[0].length || y >= arr.length){
    return false;
  }
  return true;
}
//perform BFS on a 2d array, starting fromm arr[i][j]. 
//Comparator is a function and if it returns true, we stop the bfs
//Returns false and we continue

//comparator2 checks if a new added position is valid or not
function bfs$1(self, i, j, comparator, comparator2) {
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
      let neighbors = getNeighbors$1(check.pos.x, check.pos.y);
      for (let k = 0; k < neighbors.length; k++) {
        
        let nx = neighbors[k][0];
        let ny = neighbors[k][1];
        let neighbor = {pos:{x:nx,y:ny},dist:qmath.dist(i,j,nx,ny)};
        
        //check if neighbor position is valid . eg if its passable terrain
        if (inArr$1(nx,ny,myMap) && comparator2(self, nx, ny) === true) {
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
function getNeighbors$1(i,j) {
  return [[i+1,j],[i,j+1],[i-1,j],[i,j-1]];
}

//Finds nearest friendly structure (Castle or Church).
function findNearestStructure$1(self) {
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

//returns an object with different unit types as keys, containing an array of units within radius, bounded by vision,
function unitsInRadius$1(self, radius) {
  let robotsInVision = self.getVisibleRobots();
  let unitsInVincinity = {0:[],1:[],2:[],3:[],4:[],5:[]};
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit <= radius) {
        unitsInVincinity[obot.unit].push(obot);
      }
    }
  return unitsInVincinity;
}

//determine if map is horizontally symmetrical by checking line by line for equal passable tiles
function horizontalSymmetry$1(gameMap){
  
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
var search$1 = {circle: circle$1, bfsDeltas: bfsDeltas$1, emptyPos: emptyPos$1, bfs: bfs$1, canPass: canPass$1, fuelDeposit: fuelDeposit$1, karboniteDeposit: karboniteDeposit$1, findNearestStructure: findNearestStructure$1, horizontalSymmetry: horizontalSymmetry$1, inArr: inArr$1, unitsInRadius: unitsInRadius$1};

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
  let deltas = unitMoveDeltas[self.me.unit];
  if (fast === false) {
    deltas = unitMoveDeltas[self.me.unit].slice(0, 8);
  }
  let robotMap = self.getVisibleRobotMap();
  let closestDist = qmath.dist(p2x,p2y,p1x, p1y);
  let bestDelta = [0,0];
  for (let i = 0; i < deltas.length; i++) {

    let nx = p1x+deltas[i][0];
    let ny = p1y+deltas[i][1];
    let pass = self.canMove(deltas[i][0],deltas[i][1]);
    if (pass === true){
      let validPlace = true;
      if (avoidFriends) {
        
        let checkPositions = search$1.circle(self, nx, ny, 2);
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
      else {
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

var base = {rel, relToPos, unitMoveDeltas, logStructure, updateKnownStructures, destroyedCastle};

function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  let gameMap = self.map;
  let action = '';
  let otherTeamNum = (self.me.team + 1) % 2;
  
  //Initialization code for the castle
  if (self.me.turn === 1){
    //CALCULATING HOW MANY INITIAL CASTLES WE HAVE
    //we make the assumption that each castle makes a pilgrim first thing
    let offsetVal = 0;
    if (self.karbonite === 90) {
      offsetVal = 1;
    }
    else if (self.karbonite === 60) {
      offsetVal = 2;
    }
    //we can also detemrine the offset val by looking at how many castle talk messages of 0 this castle gets.
    //if we all build turn 1, castle 1 gets 3 messages, castle 2 gets 4 messages, castle 3 gets 5 messages.
    
    //self.log(`We have ${robotsInVision.length - offsetVal} castles`);
    self.castles = robotsInVision.length - offsetVal;
    self.castleCount = self.castles;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    
    self.stackFuel = false;
    
    self.oppositeCastleDestroyed = false; //doesn't seem to be used
    
    let fuelMap = self.getFuelMap();
    let karboniteMap = self.getKarboniteMap();
    let closestKarbonitePos = null;
    let closestKarboniteDist = 999999;
    for (let i = 0; i < fuelMap.length; i++) {
      for (let j = 0; j < fuelMap[0].length; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
          let distToKarb = qmath$1.dist(j, i, self.me.x, self.me.y);
          if (distToKarb < closestKarboniteDist) {
            closestKarboniteDist = distToKarb;
            closestKarbonitePos = [j, i];
          }
        }
      }
    }
    let numFuelSpots = self.fuelSpots.length;
    self.maxPilgrims = Math.ceil(numFuelSpots/2);
    
    
    
    self.status = 'build';
    self.canBuildPilgrims = true;
    
    self.initialCastleLocationMessages = {};
    //we store castle ids here to check if id of robot sending msg in castle talk is an castle or not
    self.castleIds = [];
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      //self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
      
      //because we receive castle information first, locCastleNum < self.castles makes sure the messages received are just castles sending 0's or alive signals
      if (msg >= 0) {
        self.allUnits[robotsInVision[i].id] = 0;
        self.castleIds.push(robotsInVision[i].id);
        
        //initialize location messages objects
        self.initialCastleLocationMessages[robotsInVision[i].id] = {};
        self.initialCastleLocationMessages[robotsInVision[i].id].x = -1;
        self.initialCastleLocationMessages[robotsInVision[i].id].y = -1;
        //self.log(`${self.initialCastleLocationMessages[robotsInVision[i].id].x}`);
      }
      
      //SPECIAL MICRO MANAGE TO SEND CASTLE LOCATION BY TURN 1
      
      //SEND OUR X LOCATION TO OTHER CASTLES!
      
      
      //IN TURN 1 WE PROCESS CASTLE TALK AS FOLLOWS
      //MSG contains X POSITION OF FRIENDLY CASTLE PADDED by 191. 192 -> x:0, 193-> x:1,..., 255-> x:63;
      self.sawEnemyLastTurn = false;
      
    }
    
    //INITIAL BUILDING STRATEGIES
    //only first castle builds pilgrim in 3 preacher defence strategy
    if (self.castles === 3) {
      //only first castle builds pilgrim in 3 preacher defence strategy
      if (offsetVal === 0) {
        self.buildQueue.push(2,4,4,4,2);
      }
    }
    else if (self.castles === 2) {
      if (offsetVal === 0) {
        self.buildQueue.push(2, 4,4,4,2);
      }
    }
    else if (self.castles === 1) {
      self.buildQueue.push(2,4,4,4,2);
      //self.buildQueue.push(2,4,4,4);
      //defending against 4 archers seems to need 4 archer defence
    }
    
    
    let enemyCastle = [self.knownStructures[otherTeamNum][0].x,self.knownStructures[otherTeamNum][0].y];
    //here we prioritize building directions
    let allAdjacentPos = search.circle(self, self.me.x, self.me.y, 2);
    let desiredX = enemyCastle[0];
    let desiredY = enemyCastle[1];
    
    let tempPos = [];
    self.buildingAttackUnitPositions = [];
    self.buildingPilgrimPositions = [];
    
    //find best building spots for building attacking unit
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath$1.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    //sort by shortest distance to enemy
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    
    self.buildingAttackUnitPositions = tempPos.map(function(a){
      return a.pos;
    });
    self.log('Attack build pos: '+ self.buildingAttackUnitPositions);
    
    tempPos = [];
    desiredX = closestKarbonitePos[0];
    desiredY = closestKarbonitePos[1];
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath$1.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    
    //sort by shortest distance to karbonite
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    self.buildingPilgrimPositions = tempPos.map(function(a){
      return a.pos;
    });
    self.log('Pilgrim build pos: ' + self.buildingPilgrimPositions);
  }
  
  //CODE FOR DETERMINING FRIENDLY CASTLE LOCATIONS!
  if (self.me.turn <= 3) {
    if (self.me.turn === 1) {
      let xposPadded = self.me.x + 192;
       self.log(`Said X: ${xposPadded}`);
      self.castleTalk(xposPadded);
    }
    else if (self.me.turn === 2){
      let yposPadded = self.me.y + 192;
      self.castleTalk(yposPadded);
      self.log(`Said y: ${yposPadded}`);
    }
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      let botId = robotsInVision[i].id;
      let robotIsCastle = false;
      
      for (let k = 0; k < self.castleIds.length; k++) {
        if (botId === self.castleIds[k]) {
          robotIsCastle = true;
          break;
        }
      }
      if (robotIsCastle){
        
        if (msg >= 192) {
          
          if (self.initialCastleLocationMessages[botId].x === -1){
            self.log(`Received x pos from castle-${botId}  msg: ${msg}=${msg-192}`);
            self.initialCastleLocationMessages[botId].x = (msg - 192);
          }
          else {
            self.log(`Received y pos from castle-${botId}  msg: ${msg}=${msg-192}`);
            self.initialCastleLocationMessages[botId].y = (msg - 192);
          }
        }

      }
    }
  }

  if (self.me.turn === 3) {
    
    //STORE A SORTED ENEEMY LOCATION ARRAY
    self.enemyCastlesSorted = [];
    for (let i = 0; i < self.castleIds.length; i++){
      let castleId = self.castleIds[i];
      let nx = self.initialCastleLocationMessages[castleId].x;
      let ny = self.initialCastleLocationMessages[castleId].y;
      if (nx !== -1 && ny !== -1){
        self.log(`Castle Location Data Received for castle-${castleId}: ${self.initialCastleLocationMessages[castleId].x}, ${self.initialCastleLocationMessages[castleId].y}`);

        //NOW STORE ALL ENEMY CASTLE LOCATION DATA AND ALL FRIENDLY CASTLE LOC DATA

        //LOG FRIENDLY
        base.logStructure(self,nx,ny,self.me.team, 0);

        //LOG ENEMY
        let ex = nx;
        let ey = self.map.length - ny - 1;

        if (!self.mapIsHorizontal) {
          ex = self.map[0].length - nx - 1;
          ey = ny;
        }
        base.logStructure(self,ex,ey,otherTeamNum, 0);
      }
    }
    for (let i = 0; i < self.knownStructures[self.me.team].length; i++) {
      //self.log(`Castle at ${self.knownStructures[self.me.team][i].x}, ${self.knownStructures[self.me.team][i].y}`);
    }
    for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
      //self.log(`ENEMY Castle at ${self.knownStructures[otherTeamNum][i].x}, ${self.knownStructures[otherTeamNum][i].y}`);
      self.enemyCastlesSorted.push(self.knownStructures[otherTeamNum][i]);
    }
    self.enemyCastlesSorted.sort(function(a,b){
      return a.x - b.x;
    });
    for (let i = 0; i < self.enemyCastlesSorted.length; i++){
      self.log(`Enemy Castle: ${i}, at ${self.enemyCastlesSorted[i].x}, ${self.enemyCastlesSorted[i].y}`);
      for (let k = 0; k < self.knownStructures[otherTeamNum].length; k++) {
        let kx = self.knownStructures[otherTeamNum][k].x;
        let ky = self.knownStructures[otherTeamNum][k].y;
        if (kx === self.enemyCastlesSorted[i].x && ky === self.enemyCastlesSorted[i].y) {
          self.knownStructures[otherTeamNum][k].index = i;
        }
      }
    }
    self.knownStructures[otherTeamNum].forEach(function(a){
      self.log(`Index for ${a.x}, ${a.y}: ${a.index}`);
    });
    
  }
  
  
  //BY DEFAULT CASTLE ALWAYS BUILDS UNLESS TOLD OTHERWISE:
  self.status = 'build';
  self.canBuildPilgrims = true;
  self.canBuildPreachers = true;
  self.stackFuel = false;
  
  let idsWeCanHear = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk; //msg through castle talk
    let signalmsg = robotsInVision[i].signal; //msg through normal signalling
    
    idsWeCanHear.push(robotsInVision[i].id);
    
    let orobot = robotsInVision[i];
    
    signal.processMessageCastleTalk(self, msg, robotsInVision[i].id);
    if (signalmsg === 4) {
      //pilgrim is nearby, assign it new mining stuff if needed
      if (self.status === 'pause' || (self.fuel <= self.preachers * 60 + self.prophets * 70) || self.stackFuel === true) {
        self.log(`Castle tried to tell nearby pilgrims to mine fuel`);
        self.signal(3,2);
      }
    }
    
    if (msg >= 7 && msg <= 70) {
      let enemyCastlePosDestroyed = msg - 7;
      self.log(`Castle knows that enemy castle: ${enemyCastlePosDestroyed} was destroyed`);
      
      //TODO, create a better hash from enemy castle position, that is more likely to be correct
      for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
        if (self.mapIsHorizontal) {
          //check xpos for almost unique castle identifier;
          if (self.knownStructures[otherTeamNum][i].x === enemyCastlePosDestroyed) {
            if (enemyCastlePosDestroyed === gameMap[0].length - self.me.x - 1) {
              self.log(`Opposite castle destroyed`);
              self.oppositeCastleDestroyed = true;
            }
            self.knownStructures[otherTeamNum].splice(i,1);
            
            break;
          }
        }
        else {
          if (self.knownStructures[otherTeamNum][i].y === enemyCastlePosDestroyed) {
            if (enemyCastlePosDestroyed === gameMap.length - self.me.y - 1) {
              self.oppositeCastleDestroyed = true;
              self.log(`Opposite castle destroyed`);
            }
            self.knownStructures[otherTeamNum].splice(i,1);
            break;
          }
        }
      }
      for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
        self.log(`New known structures: ${self.knownStructures[otherTeamNum][i].x}, ${self.knownStructures[otherTeamNum][i].y}`);
      }
    }
    else if (msg === 71) {
      //dont allow pilgrims to be built
      self.canBuildPilgrims = false;
    }
    
    
  }
  
  
  //Count units
  self.castles = 0;
  self.pilgrims = 0;
  self.crusaders = 0;
  self.churches = 0;
  self.prophets = 0;
  self.preachers = 0;
  
  //out of all last turns self.allUnits and the additional units added after processing signals, check which ones are still 
  for (let id in self.allUnits) {
    let alive = false;
    for (let k = 0; k < idsWeCanHear.length; k++) {
      if (idsWeCanHear[k] == id) {
        alive = true;
        break;
      }
    }
    if (alive === true){      
      switch(self.allUnits[id]) {
        case 0:
          self.castles += 1;
          break;
        case 1:
          self.churches += 1;
          break;
        case 2:
          self.pilgrims += 1;
          break;
        case 3:
          self.crusaders += 1;
          break;
        case 4:
          self.prophets += 1;
          break;
        case 5:
          self.preachers += 1;
          break;
        default:
          break;
      }
    }
  }
  
  
  //ACCURATE numbers as of the end of the last round
  self.log(`Round ${self.me.turn}: Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}, Prophets: ${self.prophets}, Preachers: ${self.preachers}, Fuel:${self.fuel}, Karbonite: ${self.karbonite}`);
  
  //Commands code:
  //Here, castles give commands to surrounding units?
  //Give commands to rally units to attack a known castle
  //Give commands to pilgrims who then relay the message to other units?
  
  
  let sawEnemyThisTurn = false;
  let nearestEnemyLoc = null;
  let closestEnemyDist = 1000;
  let sawProphet = false;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.unit === SPECS.CRUSADER) {
      let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    else if (obot.unit === SPECS.PREACHER) {
      let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
      
    }
    else if (obot.unit === SPECS.PROPHET) {
      let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    if (obot.team === otherTeamNum) {
      //sees enemy unit, send our units to defend spot
      if (obot.unit !== SPECS.PILGRIM){
        let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
        
        if (distToUnit < closestEnemyDist) {
          if (obot.unit === SPECS.PROPHET) {
            sawProphet = true;
          }
          nearestEnemyLoc = {x: obot.x, y: obot.y};
          closestEnemyDist = distToUnit;
          self.log(`Nearest to castle is ${nearestEnemyLoc.x}, ${nearestEnemyLoc.y}`);
          sawEnemyThisTurn = true;
        }
      }
      
    }
  }
  
  //code for determing when castle sends its local army out.
  let unitsInVincinity = search.unitsInRadius(self, 36);
  {
    
    
    if (unitsInVincinity[SPECS.PREACHER].length + unitsInVincinity[SPECS.PROPHET].length >= 12){
      self.status = 'pause';
      let distToTarget = qmath$1.unitDist(self.me.x, self.me.y, self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y);
      let fuelNeededForAttack = (distToTarget/2) * 8 * unitsInVincinity[SPECS.PREACHER].length + (distToTarget/2) * 10 * unitsInVincinity[SPECS.PROPHET].length;
      self.log(`Still need ${fuelNeededForAttack} fuel before attacking ${self.knownStructures[otherTeamNum][0].x}, ${self.knownStructures[otherTeamNum][0].y}`);
      self.stackFuel = true;
      if (self.fuel >= fuelNeededForAttack){
        let targetLoc = self.knownStructures[otherTeamNum][0];
        let compressedLocationHash = self.compressLocation(targetLoc.x, targetLoc.y);
        let padding = 16392;
        self.signal (padding + compressedLocationHash, 36);
      }
    }
  }
  if (sawEnemyThisTurn === false) {
    //keep karbonite in stock so we can spam mages out when needed
    if ((self.karbonite >= 100 || self.pilgrims <= 0) && self.me.turn >= 2 && self.canBuildPilgrims === true && self.pilgrims <= self.maxPilgrims) {
      self.buildQueue.push(2);
    }
    else if (self.pilgrims <= self.maxPilgrims * 1.5 && unitsInVincinity[SPECS.PROPHET] + unitsInVincinity[SPECS.PREACHER] >= 8) {
      //we are probably safe
      self.buildQueue.push(2);
    }
    if (self.sawEnemyLastTurn === true) {
      self.signal(16391, 36); //tell everyone to defend
      if (self.canBuildPilgrims === true){
        self.buildQueue = [2];
      }
      else {
        self.buildQueue = [];
      }
    }
    if (self.karbonite >= 150 && self.stackFuel === false) {
      self.buildQueue.push(4, 4, 5);
    }
    self.sawEnemyLastTurn = false;
  }
  else {
    let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
    let padding = 12294;
    if (sawProphet === true) {
      padding = 16392;
    }
    self.signal(padding + compressedLocationHash, 36);
    //self.log(`Nearest to castle is ${nearestEnemyLoc.x}, ${nearestEnemyLoc.y}`);
    self.sawEnemyLastTurn = true;
    //spam mages if we dont have any, otherwise prophets!
    //let unitsInVincinity = search.unitsInRadius(self, 36);
    
    //we start building up prophets after their rush is done
    if (self.me.turn > 5){
      if (unitsInVincinity[SPECS.PREACHER].length >= 3){
        self.buildQueue.unshift(4);
      }
      else {
        self.buildQueue.unshift(5);
      }
    }
  }
  //building code
  //only build if we have sufficient fuel for our units to perform attack manuevers
  if ((self.fuel <= self.preachers * 50 + self.prophets * 60) && sawEnemyThisTurn === false) {
    self.status = 'pause';
  }
  if (self.status === 'build') {
    
    self.log(`BuildQueue: ${self.buildQueue}`);
    if (self.buildQueue[0] !== -1){
      
      let adjacentPos = [];//search.circle(self, self.me.x, self.me.y, 2);
      if (self.buildQueue[0] === 2){
        adjacentPos = self.buildingPilgrimPositions;
      }
      else {
        adjacentPos = self.buildingAttackUnitPositions;
      }
      
      
      for (let i = 0; i < adjacentPos.length; i++) {
        let checkPos = adjacentPos[i];
        
        if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

          if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
            //build the first unit put into the build queue
            let unit = self.buildQueue.shift(); //remove that unit

            if (self.buildQueue[self.buildQueue.length-1] === 2);
            else if (self.pilgrims <= self.maxPilgrims);
            let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
            action = self.buildUnit(unit, rels.dx, rels.dy);
            return {action:action};
            //RUSH STRAT
            /*
            if (self.crusaders < self.maxCrusaders) {
              return {action: self.buildUnit(3, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'build', response:'built'};
            }
            */
            //return {action:'',status:'build',response:'none'};
            //return {action: self.buildUnit(unit, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'build', response:'built'};
          }
        }

      }
    }
    else {
      self.buildQueue.shift();
    }
  }
  
  //if status is pause, that means we are stacking fuel, so send signal to nearby pilgrims to mine fuel
  if (self.status === 'pause');
  return {action: '', status: 'build', response:''};
}

//returns true if unit can build on that location
function canBuild(self, xpos, ypos, robotMap, passableMap) {
  if (search.inArr(xpos,ypos,robotMap)) {
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

var castle = {mind};

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t);}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

function compileSearch(funcName, predicate, reversed, extraArgs, useNdarray, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
";while(l<=h){\
var m=(l+h)>>>1,x=a", useNdarray ? ".get(m)" : "[m]"];
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){");
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){");
    }
  } else {
    code.push(";if(", predicate, "){i=m;");
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}");
  } else {
    code.push("h=m-1}else{l=m+1}");
  }
  code.push("}");
  if(earlyOut) {
    code.push("return -1};");
  } else {
    code.push("return i};");
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], false, earlyOut),
  compileSearch("B", "x" + predicate + "y", reversed, ["y"], true, earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], false, earlyOut),
  compileSearch("Q", "c(x,y)" + predicate + "0", reversed, ["y", "c"], true, earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(a.shape){\
if(typeof(c)==='function'){\
return Q(a,(l===undefined)?0:l|0,(h===undefined)?a.shape[0]-1:h|0,y,c)\
}else{\
return B(a,(c===undefined)?0:c|0,(l===undefined)?a.shape[0]-1:l|0,y)\
}}else{\
if(typeof(c)==='function'){\
return P(a,(l===undefined)?0:l|0,(h===undefined)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===undefined)?0:c|0,(l===undefined)?a.length-1:l|0,y)\
}}}\
return dispatchBsearch", suffix].join(""));
  return result()
}

module.exports = {
  ge: compileBoundsSearch(">=", false, "GE"),
  gt: compileBoundsSearch(">", false, "GT"),
  lt: compileBoundsSearch("<", true, "LT"),
  le: compileBoundsSearch("<=", true, "LE"),
  eq: compileBoundsSearch("-", true, "EQ", true)
};

},{}],2:[function(require,module,exports){

module.exports = getContours;

function Segment(start, end, direction, height) {
  this.start = start;
  this.end = end;
  this.direction = direction;
  this.height = height;
  this.visited = false;
  this.next = null;
  this.prev = null;
}

function Vertex(x, y, segment, orientation) {
  this.x = x;
  this.y = y;
  this.segment = segment;
  this.orientation = orientation;
}

function getParallelCountours(array, direction) {
  var n = array.shape[0];
  var m = array.shape[1];
  var contours = [];
  //Scan top row
  var a = false;
  var b = false;
  var c = false;
  var d = false;
  var x0 = 0;
  var i=0, j=0;
  for(j=0; j<m; ++j) {
    b = !!array.get(0, j);
    if(b === a) {
      continue
    }
    if(a) {
      contours.push(new Segment(x0, j, direction, 0));
    }
    if(b) {
      x0 = j;
    }
    a = b;
  }
  if(a) {
    contours.push(new Segment(x0, j, direction, 0));
  }
  //Scan center
  for(i=1; i<n; ++i) {
    a = false;
    b = false;
    x0 = 0;
    for(j=0; j<m; ++j) {
      c = !!array.get(i-1, j);
      d = !!array.get(i, j);
      if(c === a && d === b) {
        continue
      }
      if(a !== b) {
        if(a) {
          contours.push(new Segment(j, x0, direction, i));
        } else {
          contours.push(new Segment(x0, j, direction, i));
        }
      }
      if(c !== d) {
        x0 = j;
      }
      a = c;
      b = d;
    }
    if(a !== b) {
      if(a) {
        contours.push(new Segment(j, x0, direction, i));
      } else {
        contours.push(new Segment(x0, j, direction, i));
      }
    }
  }
  //Scan bottom row
  a = false;
  x0 = 0;
  for(j=0; j<m; ++j) {
    b = !!array.get(n-1, j);
    if(b === a) {
      continue
    }
    if(a) {
      contours.push(new Segment(j, x0, direction, n));
    }
    if(b) {
      x0 = j;
    }
    a = b;
  }
  if(a) {
    contours.push(new Segment(j, x0, direction, n));
  }
  return contours
}

function getVertices(contours) {
  var vertices = new Array(contours.length * 2);
  for(var i=0; i<contours.length; ++i) {
    var h = contours[i];
    if(h.direction === 0) {
      vertices[2*i] = new Vertex(h.start, h.height, h, 0);
      vertices[2*i+1] = new Vertex(h.end, h.height, h, 1);
    } else {
      vertices[2*i] = new Vertex(h.height, h.start, h, 0);
      vertices[2*i+1] = new Vertex(h.height, h.end, h, 1);
    }
  }
  return vertices
}

function walk(v, clockwise) {
  var result = [];
  while(!v.visited) {
    v.visited = true;
    if(v.direction) {
      result.push([v.height, v.end]);
    } else {
      result.push([v.start, v.height]);
    }
    if(clockwise) {
      v = v.next;
    } else {
      v = v.prev;
    }
  }
  return result
}

function compareVertex(a, b) {
  var d = a.x - b.x;
  if(d) {
    return d
  }
  d = a.y - b.y;
  if(d) {
    return d
  }
  return a.orientation - b.orientation
}


function getContours(array, clockwise) {

  var clockwise = !!clockwise;

  //First extract horizontal contours and vertices
  var hcontours = getParallelCountours(array, 0);
  var hvertices = getVertices(hcontours);
  hvertices.sort(compareVertex);

  //Extract vertical contours and vertices
  var vcontours = getParallelCountours(array.transpose(1, 0), 1);
  var vvertices = getVertices(vcontours);
  vvertices.sort(compareVertex);

  //Glue horizontal and vertical vertices together
  var nv = hvertices.length;
  for(var i=0; i<nv; ++i) {
    var h = hvertices[i];
    var v = vvertices[i];
    if(h.orientation) {
      h.segment.next = v.segment;
      v.segment.prev = h.segment;
    } else {
      h.segment.prev = v.segment;
      v.segment.next = h.segment;
    }
  }

  //Unwrap loops
  var loops = [];
  for(var i=0; i<hcontours.length; ++i) {
    var h = hcontours[i];
    if(!h.visited) {
      loops.push(walk(h, clockwise));
    }
  }

  //Return
  return loops
}
},{}],3:[function(require,module,exports){

var createThunk = require("./lib/thunk.js");

function Procedure() {
  this.argTypes = [];
  this.shimArgs = [];
  this.arrayArgs = [];
  this.arrayBlockIndices = [];
  this.scalarArgs = [];
  this.offsetArgs = [];
  this.offsetArgIndex = [];
  this.indexArgs = [];
  this.shapeArgs = [];
  this.funcName = "";
  this.pre = null;
  this.body = null;
  this.post = null;
  this.debug = false;
}

function compileCwise(user_args) {
  //Create procedure
  var proc = new Procedure();
  
  //Parse blocks
  proc.pre    = user_args.pre;
  proc.body   = user_args.body;
  proc.post   = user_args.post;

  //Parse arguments
  var proc_args = user_args.args.slice(0);
  proc.argTypes = proc_args;
  for(var i=0; i<proc_args.length; ++i) {
    var arg_type = proc_args[i];
    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
      proc.argTypes[i] = "array";
      proc.arrayArgs.push(i);
      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0);
      proc.shimArgs.push("array" + i);
      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
        throw new Error("cwise: pre() block may not reference array args")
      }
      if(i < proc.post.args.length && proc.post.args[i].count>0) {
        throw new Error("cwise: post() block may not reference array args")
      }
    } else if(arg_type === "scalar") {
      proc.scalarArgs.push(i);
      proc.shimArgs.push("scalar" + i);
    } else if(arg_type === "index") {
      proc.indexArgs.push(i);
      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
        throw new Error("cwise: pre() block may not reference array index")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array index")
      }
      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
        throw new Error("cwise: post() block may not reference array index")
      }
    } else if(arg_type === "shape") {
      proc.shapeArgs.push(i);
      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
        throw new Error("cwise: pre() block may not write to array shape")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array shape")
      }
      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
        throw new Error("cwise: post() block may not write to array shape")
      }
    } else if(typeof arg_type === "object" && arg_type.offset) {
      proc.argTypes[i] = "offset";
      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset });
      proc.offsetArgIndex.push(i);
    } else {
      throw new Error("cwise: Unknown argument type " + proc_args[i])
    }
  }
  
  //Make sure at least one array argument was specified
  if(proc.arrayArgs.length <= 0) {
    throw new Error("cwise: No array arguments specified")
  }
  
  //Make sure arguments are correct
  if(proc.pre.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in pre() block")
  }
  if(proc.body.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in body() block")
  }
  if(proc.post.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in post() block")
  }

  //Check debug flag
  proc.debug = !!user_args.printCode || !!user_args.debug;
  
  //Retrieve name
  proc.funcName = user_args.funcName || "cwise";
  
  //Read in block size
  proc.blockSize = user_args.blockSize || 64;

  return createThunk(proc)
}

module.exports = compileCwise;

},{"./lib/thunk.js":5}],4:[function(require,module,exports){

var uniq = require("uniq");

// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
function innerFill(order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , has_index = proc.indexArgs.length>0
    , code = []
    , vars = []
    , idx=0, pidx=0, i, j;
  for(i=0; i<dimension; ++i) { // Iteration variables
    vars.push(["i",i,"=0"].join(""));
  }
  //Compute scan deltas
  for(j=0; j<nargs; ++j) {
    for(i=0; i<dimension; ++i) {
      pidx = idx;
      idx = order[i];
      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""));
      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""));
      }
    }
  }
  if (vars.length > 0) {
    code.push("var " + vars.join(","));
  }  
  //Scan loop
  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
    idx = order[i];
    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""));
  }
  //Push body of inner loop
  code.push(body);
  //Advance scan pointers
  for(i=0; i<dimension; ++i) {
    pidx = idx;
    idx = order[i];
    for(j=0; j<nargs; ++j) {
      code.push(["p",j,"+=d",j,"s",i].join(""));
    }
    if(has_index) {
      if(i > 0) {
        code.push(["index[",pidx,"]-=s",pidx].join(""));
      }
      code.push(["++index[",idx,"]"].join(""));
    }
    code.push("}");
  }
  return code.join("\n")
}

// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
function outerFill(matched, order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , blockSize = proc.blockSize
    , has_index = proc.indexArgs.length > 0
    , code = [];
  for(var i=0; i<nargs; ++i) {
    code.push(["var offset",i,"=p",i].join(""));
  }
  //Generate loops for unmatched dimensions
  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
  for(var i=matched; i<dimension; ++i) {
    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")); // Iterate back to front
    code.push(["if(j",i,"<",blockSize,"){"].join("")); // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
    code.push(["s",order[i],"=j",i].join(""));
    code.push(["j",i,"=0"].join(""));
    code.push(["}else{s",order[i],"=",blockSize].join(""));
    code.push(["j",i,"-=",blockSize,"}"].join(""));
    if(has_index) {
      code.push(["index[",order[i],"]=j",i].join(""));
    }
  }
  for(var i=0; i<nargs; ++i) {
    var indexStr = ["offset"+i];
    for(var j=matched; j<dimension; ++j) {
      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""));
    }
    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""));
  }
  code.push(innerFill(order, proc, body));
  for(var i=matched; i<dimension; ++i) {
    code.push("}");
  }
  return code.join("\n")
}

//Count the number of compatible inner orders
// This is the length of the longest common prefix of the arrays in orders.
// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
function countMatches(orders) {
  var matched = 0, dimension = orders[0].length;
  while(matched < dimension) {
    for(var j=1; j<orders.length; ++j) {
      if(orders[j][matched] !== orders[0][matched]) {
        return matched
      }
    }
    ++matched;
  }
  return matched
}

//Processes a block according to the given data types
// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
function processBlock(block, proc, dtypes) {
  var code = block.body;
  var pre = [];
  var post = [];
  for(var i=0; i<block.args.length; ++i) {
    var carg = block.args[i];
    if(carg.count <= 0) {
      continue
    }
    var re = new RegExp(carg.name, "g");
    var ptrStr = "";
    var arrNum = proc.arrayArgs.indexOf(i);
    switch(proc.argTypes[i]) {
      case "offset":
        var offArgIndex = proc.offsetArgIndex.indexOf(i);
        var offArg = proc.offsetArgs[offArgIndex];
        arrNum = offArg.array;
        ptrStr = "+q" + offArgIndex; // Adds offset to the "pointer" in the array
      case "array":
        ptrStr = "p" + arrNum + ptrStr;
        var localStr = "l" + i;
        var arrStr = "a" + arrNum;
        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
          if(carg.count === 1) { // Argument/array used only once(?)
            if(dtypes[arrNum] === "generic") {
              if(carg.lvalue) {
                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                code = code.replace(re, localStr);
                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""));
              } else {
                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""));
              }
            } else {
              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
            }
          } else if(dtypes[arrNum] === "generic") {
            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr);
            if(carg.lvalue) {
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""));
            }
          } else {
            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")); // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr);
            if(carg.lvalue) {
              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""));
            }
          }
        } else { // Argument to body is a "block"
          var reStrArr = [carg.name], ptrStrArr = [ptrStr];
          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
            reStrArr.push("\\s*\\[([^\\]]+)\\]");
            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j); // Matched index times stride
          }
          re = new RegExp(reStrArr.join(""), "g");
          ptrStr = ptrStrArr.join("+");
          if(dtypes[arrNum] === "generic") {
            /*if(carg.lvalue) {
              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
              code = code.replace(re, localStr)
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            } else {
              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
            }*/
            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
          } else {
            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""));
          }
        }
      break
      case "scalar":
        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i));
      break
      case "index":
        code = code.replace(re, "index");
      break
      case "shape":
        code = code.replace(re, "shape");
      break
    }
  }
  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
}

function typeSummary(dtypes) {
  var summary = new Array(dtypes.length);
  var allEqual = true;
  for(var i=0; i<dtypes.length; ++i) {
    var t = dtypes[i];
    var digits = t.match(/\d+/);
    if(!digits) {
      digits = "";
    } else {
      digits = digits[0];
    }
    if(t.charAt(0) === 0) {
      summary[i] = "u" + t.charAt(1) + digits;
    } else {
      summary[i] = t.charAt(0) + digits;
    }
    if(i > 0) {
      allEqual = allEqual && summary[i] === summary[i-1];
    }
  }
  if(allEqual) {
    return summary[0]
  }
  return summary.join("")
}

//Generates a cwise operator
function generateCWiseOp(proc, typesig) {

  //Compute dimension
  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0;
  var orders = new Array(proc.arrayArgs.length);
  var dtypes = new Array(proc.arrayArgs.length);
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    dtypes[i] = typesig[2*i];
    orders[i] = typesig[2*i+1];
  }
  
  //Determine where block and loop indices start and end
  var blockBegin = [], blockEnd = []; // These indices are exposed as blocks
  var loopBegin = [], loopEnd = []; // These indices are iterated over
  var loopOrders = []; // orders restricted to the loop indices
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    if (proc.arrayBlockIndices[i]<0) {
      loopBegin.push(0);
      loopEnd.push(dimension);
      blockBegin.push(dimension);
      blockEnd.push(dimension+proc.arrayBlockIndices[i]);
    } else {
      loopBegin.push(proc.arrayBlockIndices[i]); // Non-negative
      loopEnd.push(proc.arrayBlockIndices[i]+dimension);
      blockBegin.push(0);
      blockEnd.push(proc.arrayBlockIndices[i]);
    }
    var newOrder = [];
    for(var j=0; j<orders[i].length; j++) {
      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
        newOrder.push(orders[i][j]-loopBegin[i]); // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
      }
    }
    loopOrders.push(newOrder);
  }

  //First create arguments for procedure
  var arglist = ["SS"]; // SS is the overall shape over which we iterate
  var code = ["'use strict'"];
  var vars = [];
  
  for(var j=0; j<dimension; ++j) {
    vars.push(["s", j, "=SS[", j, "]"].join("")); // The limits for each dimension.
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    arglist.push("a"+i); // Actual data array
    arglist.push("t"+i); // Strides
    arglist.push("p"+i); // Offset in the array at which the data starts (also used for iterating over the data)
    
    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""));
    }
    
    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""));
    }
  }
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    arglist.push("Y" + i);
  }
  if(proc.shapeArgs.length > 0) {
    vars.push("shape=SS.slice(0)"); // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
  }
  if(proc.indexArgs.length > 0) {
    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
    var zeros = new Array(dimension);
    for(var i=0; i<dimension; ++i) {
      zeros[i] = "0";
    }
    vars.push(["index=[", zeros.join(","), "]"].join(""));
  }
  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
    var off_arg = proc.offsetArgs[i];
    var init_string = [];
    for(var j=0; j<off_arg.offset.length; ++j) {
      if(off_arg.offset[j] === 0) {
        continue
      } else if(off_arg.offset[j] === 1) {
        init_string.push(["t", off_arg.array, "p", j].join(""));      
      } else {
        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""));
      }
    }
    if(init_string.length === 0) {
      vars.push("q" + i + "=0");
    } else {
      vars.push(["q", i, "=", init_string.join("+")].join(""));
    }
  }

  //Prepare this variables
  var thisVars = uniq([].concat(proc.pre.thisVars)
                      .concat(proc.body.thisVars)
                      .concat(proc.post.thisVars));
  vars = vars.concat(thisVars);
  if (vars.length > 0) {
    code.push("var " + vars.join(","));
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    code.push("p"+i+"|=0");
  }
  
  //Inline prelude
  if(proc.pre.body.length > 3) {
    code.push(processBlock(proc.pre, proc, dtypes));
  }

  //Process body
  var body = processBlock(proc.body, proc, dtypes);
  var matched = countMatches(loopOrders);
  if(matched < dimension) {
    code.push(outerFill(matched, loopOrders[0], proc, body)); // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
  } else {
    code.push(innerFill(loopOrders[0], proc, body));
  }

  //Inline epilog
  if(proc.post.body.length > 3) {
    code.push(processBlock(proc.post, proc, dtypes));
  }
  
  if(proc.debug) {
    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------");
  }
  
  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("");
  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""));
  return f()
}
module.exports = generateCWiseOp;

},{"uniq":21}],5:[function(require,module,exports){

// The function below is called when constructing a cwise function object, and does the following:
// A function object is constructed which accepts as argument a compilation function and returns another function.
// It is this other function that is eventually returned by createThunk, and this function is the one that actually
// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
// The compilation passed to the first function object is used for compiling new functions.
// Once this function object is created, it is called with compile as argument, where the first argument of compile
// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
// So createThunk roughly works like this:
// function createThunk(proc) {
//   var thunk = function(compileBound) {
//     var CACHED = {}
//     return function(arrays and scalars) {
//       if (dtype and order of arrays in CACHED) {
//         var func = CACHED[dtype and order of arrays]
//       } else {
//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
//       }
//       return func(arrays and scalars)
//     }
//   }
//   return thunk(compile.bind1(proc))
// }

var compile = require("./compile.js");

function createThunk(proc) {
  var code = ["'use strict'", "var CACHED={}"];
  var vars = [];
  var thunkName = proc.funcName + "_cwise_thunk";
  
  //Build thunk
  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""));
  var typesig = [];
  var string_typesig = [];
  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")];
  var shapeLengthConditions = [], shapeConditions = [];
  // Process array arguments
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    var j = proc.arrayArgs[i];
    vars.push(["t", j, "=array", j, ".dtype,",
               "r", j, "=array", j, ".order"].join(""));
    typesig.push("t" + j);
    typesig.push("r" + j);
    string_typesig.push("t"+j);
    string_typesig.push("r"+j+".join()");
    proc_args.push("array" + j + ".data");
    proc_args.push("array" + j + ".stride");
    proc_args.push("array" + j + ".offset|0");
    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])));
      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]");
    }
  }
  // Check for shape equality
  if (proc.arrayArgs.length > 1) {
    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')");
    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {");
    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')");
    code.push("}");
  }
  // Process scalar arguments
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    proc_args.push("scalar" + proc.scalarArgs[i]);
  }
  // Check for cached function (and if not present, generate it)
  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""));
  vars.push("proc=CACHED[type]");
  code.push("var " + vars.join(","));
  
  code.push(["if(!proc){",
             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
             "return proc(", proc_args.join(","), ")}"].join(""));

  if(proc.debug) {
    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------");
  }
  
  //Compile thunk
  var thunk = new Function("compile", code.join("\n"));
  return thunk(compile.bind(undefined, proc))
}

module.exports = createThunk;

},{"./compile.js":4}],6:[function(require,module,exports){

function iota(n) {
  var result = new Array(n);
  for(var i=0; i<n; ++i) {
    result[i] = i;
  }
  return result
}

module.exports = iota;
},{}],7:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
};

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],8:[function(require,module,exports){

var ndarray     = require('ndarray');
var uniq        = require('uniq');
var ops         = require('ndarray-ops');
var prefixSum   = require('ndarray-prefix-sum');
var getContour  = require('contour-2d');
var orient      = require('robust-orientation')[3];

module.exports = createGeometry;

function Geometry(corners, grid) {
  this.corners = corners;
  this.grid    = grid;
}

var proto = Geometry.prototype;

proto.stabRay = function(vx, vy, x) {
  return this.stabBox(vx, vy, x, vy)
};

proto.stabTile = function(x, y) {
  return this.stabBox(x, y, x, y)
};

proto.integrate = function(x, y) {
  if(x < 0 || y < 0) {
    return 0
  }
  return this.grid.get(
    Math.min(x, this.grid.shape[0]-1)|0,
    Math.min(y, this.grid.shape[1]-1)|0)
};

proto.stabBox = function(ax, ay, bx, by) {
  var lox = Math.min(ax, bx);
  var loy = Math.min(ay, by);
  var hix = Math.max(ax, bx);
  var hiy = Math.max(ay, by);

  var s = this.integrate(lox-1,loy-1)
        - this.integrate(lox-1,hiy)
        - this.integrate(hix,loy-1)
        + this.integrate(hix,hiy);

  return s > 0
};

function comparePair(a, b) {
  var d = a[0] - b[0];
  if(d) { return d }
  return a[1] - b[1]
}

function createGeometry(grid) {
  var loops = getContour(grid.transpose(1,0));

  //Extract corners
  var corners = [];
  for(var k=0; k<loops.length; ++k) {
    var polygon = loops[k];
    for(var i=0; i<polygon.length; ++i) {
      var a = polygon[(i+polygon.length-1)%polygon.length];
      var b = polygon[i];
      var c = polygon[(i+1)%polygon.length];
      if(orient(a, b, c) > 0) {
        var offset = [0,0];
        for(var j=0; j<2; ++j) {
          if(b[j] - a[j]) {
            offset[j] = b[j] - a[j];
          } else {
            offset[j] = b[j] - c[j];
          }
          offset[j] = b[j]+Math.min(Math.round(offset[j]/Math.abs(offset[j]))|0, 0);
        }
        if(offset[0] >= 0 && offset[0] < grid.shape[0] &&
           offset[1] >= 0 && offset[1] < grid.shape[1] &&
           grid.get(offset[0], offset[1]) === 0) {
          corners.push(offset);
        }
      }
    }
  }

  //Remove duplicate corners
  uniq(corners, comparePair);

  //Create integral image
  var img = ndarray(new Int32Array(grid.shape[0]*grid.shape[1]), grid.shape);
  ops.gts(img, grid, 0);
  prefixSum(img);

  //Return resulting geometry
  return new Geometry(corners, img)
}

},{"contour-2d":2,"ndarray":14,"ndarray-ops":12,"ndarray-prefix-sum":13,"robust-orientation":15,"uniq":21}],9:[function(require,module,exports){

module.exports = Graph;

var vtx = require('./vertex');
var NIL = vtx.NIL;
var NUM_LANDMARKS = vtx.NUM_LANDMARKS;
var LANDMARK_DIST = vtx.LANDMARK_DIST;

function heuristic(tdist, tx, ty, node) {
  var nx = +node.x;
  var ny = +node.y;
  var pi = Math.abs(nx-tx) + Math.abs(ny-ty);
  var ndist = node.landmark;
  for(var i=0; i<NUM_LANDMARKS; ++i) {
    pi = Math.max(pi, tdist[i]-ndist[i]);
  }
  return 1.0000009536743164 * pi
}

function Graph() {
  this.target   = vtx.create(0,0);
  this.verts    = [];
  this.freeList = this.target;
  this.toVisit  = NIL;
  this.lastS    = null;
  this.lastT    = null;
  this.srcX     = 0;
  this.srcY     = 0;
  this.dstX     = 0;
  this.dstY     = 0;
  this.landmarks = [];
  this.landmarkDist = LANDMARK_DIST.slice();
}

var proto = Graph.prototype;

proto.vertex = function(x, y) {
  var v = vtx.create(x, y);
  this.verts.push(v);
  return v
};

proto.link = function(u, v) {
  vtx.link(u, v);
};

proto.setSourceAndTarget = function(sx, sy, tx, ty) {
  this.srcX = sx|0;
  this.srcY = sy|0;
  this.dstX = tx|0;
  this.dstY = ty|0;
};

//Mark vertex connected to source
proto.addS = function(v) {
  if((v.state & 2) === 0) {
    v.heuristic   = heuristic(this.landmarkDist, this.dstX, this.dstY, v);
    v.weight      = Math.abs(this.srcX - v.x) + Math.abs(this.srcY - v.y) + v.heuristic;
    v.state       |= 2;
    v.pred        = null;
    this.toVisit  = vtx.push(this.toVisit, v);
    this.freeList = vtx.insert(this.freeList, v);
    this.lastS    = v;
  }
};

//Mark vertex connected to target
proto.addT = function(v) {
  if((v.state & 1) === 0) {
    v.state       |= 1;
    this.freeList = vtx.insert(this.freeList, v);
    this.lastT    = v;

    //Update heuristic
    var d = Math.abs(v.x-this.dstX) + Math.abs(v.y-this.dstY);
    var vdist = v.landmark;
    var tdist = this.landmarkDist;
    for(var i=0; i<NUM_LANDMARKS; ++i) {
      tdist[i] = Math.min(tdist[i], vdist[i]+d);
    }
  }
};

//Retrieves the path from dst->src
proto.getPath = function(out) {
  var prevX = this.dstX;
  var prevY = this.dstY;
  out.push(prevX, prevY);
  var head = this.target.pred;
  while(head) {
    if(prevX !== head.x && prevY !== head.y) {
      out.push(head.x, prevY);
    }
    if(prevX !== head.x || prevY !== head.y) {
      out.push(head.x, head.y);
    }
    prevX = head.x;
    prevY = head.y;
    head = head.pred;
  }
  if(prevX !== this.srcX && prevY !== this.srcY) {
    out.push(this.srcX, prevY);
  }
  if(prevX !== this.srcX || prevY !== this.srcY) {
    out.push(this.srcX, this.srcY);
  }
  return out
};

proto.findComponents = function() {
  var verts = this.verts;
  var n = verts.length;
  for(var i=0; i<n; ++i) {
    verts[i].component = -1;
  }
  var components = [];
  for(var i=0; i<n; ++i) {
    var root = verts[i];
    if(root.component >= 0) {
      continue
    }
    var label = components.length;
    root.component = label;
    var toVisit = [root];
    var ptr = 0;
    while(ptr < toVisit.length) {
      var v = toVisit[ptr++];
      var adj = v.edges;
      for(var j=0; j<adj.length; ++j) {
        var u = adj[j];
        if(u.component >= 0) {
          continue
        }
        u.component = label;
        toVisit.push(u);
      }
    }
    components.push(toVisit);
  }
  return components
};

//Find all landmarks
function compareVert(a, b) {
  var d = a.x - b.x;
  if(d) { return d }
  return a.y - b.y
}

//For each connected component compute a set of landmarks
proto.findLandmarks = function(component) {
  component.sort(compareVert);
  var v = component[component.length>>>1];
  for(var k=0; k<NUM_LANDMARKS; ++k) {
    v.weight = 0.0;
    this.landmarks.push(v);
    for(var toVisit = v; toVisit !== NIL; ) {
      v = toVisit;
      v.state = 2;
      toVisit = vtx.pop(toVisit);
      var w = v.weight;
      var adj = v.edges;
      for(var i=0; i<adj.length; ++i) {
        var u = adj[i];
        if(u.state === 2) {
          continue
        }
        var d = w + Math.abs(v.x-u.x) + Math.abs(v.y-u.y);
        if(u.state === 0) {
          u.state = 1;
          u.weight = d;
          toVisit = vtx.push(toVisit, u);
        } else if(d < u.weight) {
          u.weight = d;
          toVisit = vtx.decreaseKey(toVisit, u);
        }
      }
    }
    var farthestD = 0;
    for(var i=0; i<component.length; ++i) {
      var u = component[i];
      u.state = 0;
      u.landmark[k] = u.weight;
      var s = Infinity;
      for(var j=0; j<=k; ++j) {
        s = Math.min(s, u.landmark[j]);
      }
      if(s > farthestD) {
        v = u;
        farthestD = s;
      }
    }
  }
};

proto.init = function() {
  var components = this.findComponents();
  for(var i=0; i<components.length; ++i) {
    this.findLandmarks(components[i]);
  }
};

//Runs a* on the graph
proto.search = function() {
  var target   = this.target;
  var freeList = this.freeList;
  var tdist    = this.landmarkDist;

  //Initialize target properties
  var dist = Infinity;

  //Test for case where S and T are disconnected
  if( this.lastS && this.lastT &&
      this.lastS.component === this.lastT.component ) {

    var sx = +this.srcX;
    var sy = +this.srcY;
    var tx = +this.dstX;
    var ty = +this.dstY;

    for(var toVisit=this.toVisit; toVisit!==NIL; ) {
      var node = toVisit;
      var nx   = +node.x;
      var ny   = +node.y;
      var d    = Math.floor(node.weight - node.heuristic);

      if(node.state === 3) {
        //If node is connected to target, exit
        dist = d + Math.abs(tx-nx) + Math.abs(ty-ny);
        target.pred = node;
        break
      }

      //Mark node closed
      node.state = 4;

      //Pop node from toVisit queue
      toVisit = vtx.pop(toVisit);

      var adj = node.edges;
      var n   = adj.length;
      for(var i=0; i<n; ++i) {
        var v = adj[i];
        var state = v.state;
        if(state === 4) {
          continue
        }
        var vd = d + Math.abs(nx-v.x) + Math.abs(ny-v.y);
        if(state < 2) {
          var vh      = heuristic(tdist, tx, ty, v);
          v.state    |= 2;
          v.heuristic = vh;
          v.weight    = vh + vd;
          v.pred      = node;
          toVisit     = vtx.push(toVisit, v);
          freeList    = vtx.insert(freeList, v);
        } else {
          var vw = vd + v.heuristic;
          if(vw < v.weight) {
            v.weight   = vw;
            v.pred     = node;
            toVisit    = vtx.decreaseKey(toVisit, v);
          }
        }
      }
    }
  }

  //Clear the free list & priority queue
  vtx.clear(freeList);

  //Reset pointers
  this.freeList = target;
  this.toVisit = NIL;
  this.lastS = this.lastT = null;

  //Reset landmark distance
  for(var i=0; i<NUM_LANDMARKS; ++i) {
    tdist[i] = Infinity;
  }

  //Return target distance
  return dist
};

},{"./vertex":11}],10:[function(require,module,exports){

var bsearch = require('binary-search-bounds');
var createGeometry = require('./geometry');
var Graph = require('./graph');

var LEAF_CUTOFF = 64;
var BUCKET_SIZE = 32;

module.exports = createPlanner;

function Leaf(verts) {
  this.verts = verts;
  this.leaf = true;
}

function Bucket(y0, y1, top, bottom, left, right, on) {
  this.y0     = y0;
  this.y1     = y1;
  this.top    = top;
  this.bottom = bottom;
  this.left   = left;
  this.right  = right;
  this.on     = on;
}

function Node(x, buckets, left, right) {
  this.x       = x;
  this.buckets = buckets;
  this.left    = left;
  this.right   = right;
}

function L1PathPlanner(geometry, graph, root) {
  this.geometry   = geometry;
  this.graph      = graph;
  this.root       = root;
}

var proto = L1PathPlanner.prototype;

function compareBucket(bucket, y) {
  return bucket.y0 - y
}

function connectList(nodes, geom, graph, target, x, y) {
  for(var i=0; i<nodes.length; ++i) {
    var v = nodes[i];
    if(!geom.stabBox(v.x, v.y, x, y)) {
      if(target) {
        graph.addT(v);
      } else {
        graph.addS(v);
      }
    }
  }
}

function connectNodes(geom, graph, node, target, x, y) {
  //Mark target nodes
  while(node) {
    //Check leaf case
    if(node.leaf) {
      var vv = node.verts;
      var nn = vv.length;
      for(var i=0; i<nn; ++i) {
        var v = vv[i];
        if(!geom.stabBox(v.x, v.y, x, y)) {
          if(target) {
            graph.addT(v);
          } else {
            graph.addS(v);
          }
        }
      }
      break
    }

    //Otherwise, glue into buckets
    var buckets = node.buckets;
    var idx = bsearch.lt(buckets, y, compareBucket);
    if(idx >= 0) {
      var bb = buckets[idx];
      if(y < bb.y1) {
        //Common case:
        if(node.x >= x) {
          //Connect right
          connectList(bb.right, geom, graph, target, x, y);
        }
        if(node.x <= x) {
          //Connect left
          connectList(bb.left, geom, graph, target, x, y);
        }
        //Connect on
        connectList(bb.on, geom, graph, target, x, y);
      } else {
        //Connect to bottom of bucket above
        var v = buckets[idx].bottom;
        if(v && !geom.stabBox(v.x, v.y, x, y)) {
          if(target) {
            graph.addT(v);
          } else {
            graph.addS(v);
          }
        }
        //Connect to top of bucket below
        if(idx + 1 < buckets.length) {
          var v = buckets[idx+1].top;
          if(v && !geom.stabBox(v.x, v.y, x, y)) {
            if(target) {
              graph.addT(v);
            } else {
              graph.addS(v);
            }
          }
        }
      }
    } else {
      //Connect to top of box
      var v = buckets[0].top;
      if(v && !geom.stabBox(v.x, v.y, x, y)) {
        if(target) {
          graph.addT(v);
        } else {
          graph.addS(v);
        }
      }
    }
    if(node.x > x) {
      node = node.left;
    } else if(node.x < x) {
      node = node.right;
    } else {
      break
    }
  }
}

proto.search = function(tx, ty, sx, sy, out) {

  var geom = this.geometry;

  //Degenerate case:  s and t are equal
  if(tx === sx && ty === sy) {
    if(!geom.stabBox(tx, ty, sx, sy)) {
      if(out) {
        out.push(sx, sy);
      }
      return 0
    }
    return Infinity
  }

  //Check easy case - s and t directly connected
  if(!geom.stabBox(tx, ty, sx, sy)) {
    if(out) {
      if(sx !== tx && sy !== ty) {
        out.push(tx, ty, sx, ty, sx, sy);
      } else {
        out.push(tx, ty, sx, sy);
      }
    }
    return Math.abs(tx-sx) + Math.abs(ty-sy)
  }

  //Prepare graph
  var graph = this.graph;
  graph.setSourceAndTarget(sx, sy, tx, ty);

  //Mark target
  connectNodes(geom, graph, this.root, true, tx, ty);

  //Mark source
  connectNodes(geom, graph, this.root, false, sx, sy);

  //Run A*
  var dist = graph.search();

  //Recover path
  if(out && dist < Infinity) {
    graph.getPath(out);
  }

  return dist
};

function comparePair(a, b) {
  var d = a[1] - b[1];
  if(d) {
    return d
  }
  return a[0] - b[0]
}

function makePartition(x, corners, geom, edges) {
  var left  = [];
  var right = [];
  var on    = [];

  //Intersect rays along x horizontal line
  for(var i=0; i<corners.length; ++i) {
    var c = corners[i];
    if(!geom.stabRay(c[0], c[1], x)) {
      on.push(c);
    }
    if(c[0] < x) {
      left.push(c);
    } else if(c[0] > x) {
      right.push(c);
    }
  }

  //Sort on events by y then x
  on.sort(comparePair);

  //Construct vertices and horizontal edges
  var vis = [];
  var rem = [];
  for(var i=0; i<on.length; ) {
    var l = x;
    var r = x;
    var v = on[i];
    var y = v[1];
    while(i < on.length && on[i][1] === y && on[i][0] < x) {
      l = on[i++][0];
    }
    if(l < x) {
      vis.push([l,y]);
    }
    while(i < on.length && on[i][1] === y && on[i][0] === x) {
      rem.push(on[i]);
      vis.push(on[i]);
      ++i;
    }
    if(i < on.length && on[i][1] === y) {
      r = on[i++][0];
      while(i < on.length && on[i][1] === y) {
        ++i;
      }
    }
    if(r > x) {
      vis.push([r,y]);
    }
  }

  return {
    x:       x,
    left:    left,
    right:   right,
    on:      rem,
    vis:     vis
  }
}

function createPlanner(grid) {
  var geom = createGeometry(grid);
  var graph = new Graph();
  var verts = {};
  var edges = [];

  function makeVertex(pair) {
    if(!pair) {
      return null
    }
    var res = verts[pair];
    if(res) {
      return res
    }
    return verts[pair] = graph.vertex(pair[0], pair[1])
  }

  function makeLeaf(corners, x0, x1) {
    var localVerts = [];
    for(var i=0; i<corners.length; ++i) {
      var u = corners[i];
      var ux = graph.vertex(u[0], u[1]);
      localVerts.push(ux);
      verts[u] = ux;
      for(var j=0; j<i; ++j) {
        var v = corners[j];
        if(!geom.stabBox(u[0], u[1], v[0], v[1])) {
          edges.push([u,v]);
        }
      }
    }
    return new Leaf(localVerts)
  }

  function makeBucket(corners, x) {
    //Split visible corners into 3 cases
    var left  = [];
    var right = [];
    var on    = [];
    for(var i=0; i<corners.length; ++i) {
      if(corners[i][0] < x) {
        left.push(corners[i]);
      } else if(corners[i][0] > x) {
        right.push(corners[i]);
      } else {
        on.push(corners[i]);
      }
    }

    //Add Steiner vertices if needed
    function addSteiner(y, first) {
      if(!geom.stabTile(x,y)) {
        for(var i=0; i<on.length; ++i) {
          if(on[i][0] === x && on[i][1] === y) {
            return on[i]
          }
        }
        var pair = [x,y];
        if(first) {
          on.unshift(pair);
        } else {
          on.push(pair);
        }
        if(!verts[pair]) {
          verts[pair] = graph.vertex(x,y);
        }
        return pair
      }
      return null
    }

    var y0 = corners[0][1];
    var y1 = corners[corners.length-1][1];
    var loSteiner = addSteiner(y0, true);
    var hiSteiner = addSteiner(y1, false);

    function bipartite(a, b) {
      for(var i=0; i<a.length; ++i) {
        var u = a[i];
        for(var j=0; j<b.length; ++j) {
          var v = b[j];
          if(!geom.stabBox(u[0], u[1], v[0], v[1])) {
            edges.push([u,v]);
          }
        }
      }
    }

    bipartite(left, right);
    bipartite(on, left);
    bipartite(on, right);

    //Connect vertical edges
    for(var i=1; i<on.length; ++i) {
      var u = on[i-1];
      var v = on[i];
      if(!geom.stabBox(u[0], u[1], v[0], v[1])) {
        edges.push([u,v]);
      }
    }

    return {
      left:     left,
      right:    right,
      on:       on,
      steiner0: loSteiner,
      steiner1: hiSteiner,
      y0:       y0,
      y1:       y1
    }
  }

  //Make tree
  function makeTree(corners, x0, x1) {
    if(corners.length === 0) {
      return null
    }

    if(corners.length < LEAF_CUTOFF) {
      return makeLeaf(corners, x0, x1)
    }

    var x = corners[corners.length>>>1][0];
    var partition = makePartition(x, corners, geom, edges);
    var left      = makeTree(partition.left, x0, x);
    var right     = makeTree(partition.right, x, x1);

    //Construct vertices
    for(var i=0; i<partition.on.length; ++i) {
      verts[partition.on[i]] = graph.vertex(partition.on[i][0], partition.on[i][1]);
    }

    //Build buckets
    var vis = partition.vis;
    var buckets = [];
    var lastSteiner = null;
    for(var i=0; i<vis.length; ) {
      var v0 = i;
      var v1 = Math.min(i+BUCKET_SIZE-1, vis.length-1);
      while(++v1 < vis.length && vis[v1-1][1] === vis[v1][1]) {}
      i = v1;
      var bb = makeBucket(vis.slice(v0, v1), x);
      if(lastSteiner && bb.steiner0 &&
        !geom.stabBox(lastSteiner[0], lastSteiner[1], bb.steiner0[0], bb.steiner0[1])) {
        edges.push([lastSteiner, bb.steiner0]);
      }
      lastSteiner = bb.steiner1;
      buckets.push(new Bucket(
        bb.y0,
        bb.y1,
        makeVertex(bb.steiner0),
        makeVertex(bb.steiner1),
        bb.left.map(makeVertex),
        bb.right.map(makeVertex),
        bb.on.map(makeVertex)
      ));
    }
    return new Node(x, buckets, left, right)
  }
  var root = makeTree(geom.corners, -Infinity, Infinity);

  //Link edges
  for(var i=0; i<edges.length; ++i) {
    graph.link(verts[edges[i][0]], verts[edges[i][1]]);
  }

  //Initialized graph
  graph.init();

  //Return resulting tree
  return new L1PathPlanner(geom, graph, root)
}

},{"./geometry":8,"./graph":9,"binary-search-bounds":1}],11:[function(require,module,exports){

var NUM_LANDMARKS = 16;

var LANDMARK_DIST = (function(){
  var res = new Array(NUM_LANDMARKS);
  for(var count=0; count<NUM_LANDMARKS; ++count) {
    res[count] = Infinity;
  }
  return res
})();

//Vertices have to do multiple things
//
//  1.  They store the topology of the graph which is gonna get searched
//  2.  They implement the pairing heap data sturcture (intrusively)
//  3.  They implement a linked list for tracking clean up
//  4.  Track search information (keep track of predecessors, distances, open state)
//

function Vertex(x, y) {
  //User data
  this.x        = x;
  this.y        = y;

  //Priority queue info
  this.heuristic = 0.25;
  this.weight    = 0.25;
  this.left      = null;
  this.right     = null;
  this.parent    = null;

  //Visit tags
  this.state    = 0;
  this.pred     = null;

  //Free list
  this.nextFree = null;

  //Adjacency info
  this.edges    = [];

  //Landmark data
  this.landmark = LANDMARK_DIST.slice();

  //Connected component label
  this.component = 0;
}

//Sentinel node
var NIL = new Vertex(Infinity,Infinity);
NIL.weight = -Infinity;
NIL.left = NIL.right = NIL.parent = NIL;

//Heap insertion
function link(a, b) {
  var al = a.left;
  b.right = al;
  al.parent = b;
  b.parent = a;
  a.left = b;
  a.right = NIL;
  return a
}

function merge(a, b) {
  if(a === NIL) {
    return b
  } else if(b === NIL) {
    return a
  } else if(a.weight < b.weight) {
    return link(a, b)
  } else {
    return link(b, a)
  }
}

function heapPush(root, node) {
  if(root === NIL) {
    return node
  } else if(root.weight < node.weight) {
    var l = root.left;
    node.right = l;
    l.parent = node;
    node.parent = root;
    root.left = node;
    return root
  } else {
    var l = node.left;
    root.right = l;
    l.parent = root;
    root.parent = node;
    node.left = root;
    return node
  }
}

function takeMin(root) {
  var p = root.left;
  root.left = NIL;
  root = p;
  while(true) {
    var q = root.right;
    if(q === NIL) {
      break
    }
    p = root;
    var r = q.right;
    var s = merge(p, q);
    root = s;
    while(true) {
      p = r;
      q = r.right;
      if(q === NIL) {
        break
      }
      r = q.right;
      s = s.right = merge(p, q);
    }
    s.right = NIL;
    if(p !== NIL) {
      p.right = root;
      root = p;
    }
  }
  root.parent = NIL;
  return root
}

function decreaseKey(root, p) {
  var q = p.parent;
  if(q.weight < p.weight) {
    return root
  }
  var r = p.right;
  r.parent = q;
  if(q.left === p) {
    q.left = r;
  } else {
    q.right = r;
  }
  if(root.weight <= p.weight) {
    var l = root.left;
    l.parent = p;
    p.right = l;
    root.left = p;
    p.parent = root;
    return root
  } else {
    var l = p.left;
    root.right = l;
    l.parent = root;
    p.left = root;
    root.parent = p;
    p.right = p.parent = NIL;
    return p
  }
}

//Topology
function createVertex(x, y) {
  var result = new Vertex(x, y);
  result.left = result.right = result.parent = NIL;
  return result
}

function addEdge(u, v) {
  u.edges.push(v);
  v.edges.push(u);
}

//Free list functions
function pushList(list, node) {
  if(node.nextFree) {
    return list
  }
  node.nextFree = list;
  return node
}

function clearList(v) {
  while(v) {
    var next = v.nextFree;
    v.state  = 0;
    v.left = v.right = v.parent = NIL;
    v.nextFree = null;
    v = next;
  }
}

//Graph topology
exports.create        = createVertex;
exports.link          = addEdge;

//Free list management
exports.insert        = pushList;
exports.clear         = clearList;

//Heap operations
exports.NIL           = NIL;
exports.push          = heapPush;
exports.pop           = takeMin;
exports.decreaseKey   = decreaseKey;

//Landmark info
exports.NUM_LANDMARKS = NUM_LANDMARKS;
exports.LANDMARK_DIST = LANDMARK_DIST;

},{}],12:[function(require,module,exports){

var compile = require("cwise-compiler");

var EmptyProc = {
  body: "",
  args: [],
  thisVars: [],
  localVars: []
};

function fixup(x) {
  if(!x) {
    return EmptyProc
  }
  for(var i=0; i<x.args.length; ++i) {
    var a = x.args[i];
    if(i === 0) {
      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 };
    } else {
      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1};
    }
  }
  if(!x.thisVars) {
    x.thisVars = [];
  }
  if(!x.localVars) {
    x.localVars = [];
  }
  return x
}

function pcompile(user_args) {
  return compile({
    args:     user_args.args,
    pre:      fixup(user_args.pre),
    body:     fixup(user_args.body),
    post:     fixup(user_args.proc),
    funcName: user_args.funcName
  })
}

function makeOp(user_args) {
  var args = [];
  for(var i=0; i<user_args.args.length; ++i) {
    args.push("a"+i);
  }
  var wrapper = new Function("P", [
    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
  ].join(""));
  return wrapper(pcompile(user_args))
}

var assign_ops = {
  add:  "+",
  sub:  "-",
  mul:  "*",
  div:  "/",
  mod:  "%",
  band: "&",
  bor:  "|",
  bxor: "^",
  lshift: "<<",
  rshift: ">>",
  rrshift: ">>>"
}
;(function(){
  for(var id in assign_ops) {
    var op = assign_ops[id];
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a","b","c"],
             body: "a=b"+op+"c"},
      funcName: id
    });
    exports[id+"eq"] = makeOp({
      args: ["array","array"],
      body: {args:["a","b"],
             body:"a"+op+"=b"},
      rvalue: true,
      funcName: id+"eq"
    });
    exports[id+"s"] = makeOp({
      args: ["array", "array", "scalar"],
      body: {args:["a","b","s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    });
    exports[id+"seq"] = makeOp({
      args: ["array","scalar"],
      body: {args:["a","s"],
             body:"a"+op+"=s"},
      rvalue: true,
      funcName: id+"seq"
    });
  }
})();

var unary_ops = {
  not: "!",
  bnot: "~",
  neg: "-",
  recip: "1.0/"
}
;(function(){
  for(var id in unary_ops) {
    var op = unary_ops[id];
    exports[id] = makeOp({
      args: ["array", "array"],
      body: {args:["a","b"],
             body:"a="+op+"b"},
      funcName: id
    });
    exports[id+"eq"] = makeOp({
      args: ["array"],
      body: {args:["a"],
             body:"a="+op+"a"},
      rvalue: true,
      count: 2,
      funcName: id+"eq"
    });
  }
})();

var binary_ops = {
  and: "&&",
  or: "||",
  eq: "===",
  neq: "!==",
  lt: "<",
  gt: ">",
  leq: "<=",
  geq: ">="
}
;(function() {
  for(var id in binary_ops) {
    var op = binary_ops[id];
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a", "b", "c"],
             body:"a=b"+op+"c"},
      funcName: id
    });
    exports[id+"s"] = makeOp({
      args: ["array","array","scalar"],
      body: {args:["a", "b", "s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    });
    exports[id+"eq"] = makeOp({
      args: ["array", "array"],
      body: {args:["a", "b"],
             body:"a=a"+op+"b"},
      rvalue:true,
      count:2,
      funcName: id+"eq"
    });
    exports[id+"seq"] = makeOp({
      args: ["array", "scalar"],
      body: {args:["a","s"],
             body:"a=a"+op+"s"},
      rvalue:true,
      count:2,
      funcName: id+"seq"
    });
  }
})();

var math_unary = [
  "abs",
  "acos",
  "asin",
  "atan",
  "ceil",
  "cos",
  "exp",
  "floor",
  "log",
  "round",
  "sin",
  "sqrt",
  "tan"
]
;(function() {
  for(var i=0; i<math_unary.length; ++i) {
    var f = math_unary[i];
    exports[f] = makeOp({
                    args: ["array", "array"],
                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
                    funcName: f
                  });
    exports[f+"eq"] = makeOp({
                      args: ["array"],
                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
                      rvalue: true,
                      count: 2,
                      funcName: f+"eq"
                    });
  }
})();

var math_comm = [
  "max",
  "min",
  "atan2",
  "pow"
]
;(function(){
  for(var i=0; i<math_comm.length; ++i) {
    var f= math_comm[i];
    exports[f] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f
                });
    exports[f+"s"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f+"s"
                  });
    exports[f+"eq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"eq"
                  });
    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"seq"
                  });
  }
})();

var math_noncomm = [
  "atan2",
  "pow"
]
;(function(){
  for(var i=0; i<math_noncomm.length; ++i) {
    var f= math_noncomm[i];
    exports[f+"op"] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"op"
                });
    exports[f+"ops"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"ops"
                  });
    exports[f+"opeq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"opeq"
                  });
    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"opseq"
                  });
  }
})();

exports.any = compile({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return false"},
  funcName: "any"
});

exports.all = compile({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "all"
});

exports.sum = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "sum"
});

exports.prod = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "prod"
});

exports.norm2squared = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm2squared"
});
  
exports.norm2 = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
  funcName: "norm2"
});
  

exports.norminf = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norminf"
});

exports.norm1 = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm1"
});

exports.sup = compile({
  args: [ "array" ],
  pre:
   { body: "this_h=-Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 });

exports.inf = compile({
  args: [ "array" ],
  pre:
   { body: "this_h=Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 });

exports.argmin = compile({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
});

exports.argmax = compile({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
});  

exports.random = makeOp({
  args: ["array"],
  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
  funcName: "random"
});

exports.assign = makeOp({
  args:["array", "array"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assign" });

exports.assigns = makeOp({
  args:["array", "scalar"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assigns" });


exports.equals = compile({
  args:["array", "array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
               {name:"y", lvalue:false, rvalue:true, count:1}], 
        body: "if(x!==y){return false}", 
        localVars: [], 
        thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "equals"
});



},{"cwise-compiler":3}],13:[function(require,module,exports){

var SHAPE   = "n";
var DATA    = "d";
var STRIDE  = "s";
var STEP    = "p";
var OFFSET  = "o";
var INDEX   = "i";

module.exports = computePrefixSum;

function generateScan(type, boundaries, n) {
  if(n === 0) {
    var neighbors = [ [] ];
    for(var i=0; i<boundaries.length; ++i) {
      if(boundaries[i]) {
        continue
      }
      var nn = neighbors.length;
      for(var j=0; j<nn; ++j) {
        var v = neighbors[j].slice();
        v.push(STRIDE + i);
        neighbors.push(v);
      }
    }
    if(neighbors.length === 1) {
      return ""
    }
    var result = [];
    if(type === "generic") {
      result.push(DATA, ".set(", OFFSET, ",", DATA, ".get(", OFFSET, ")+");
    } else {
      result.push(DATA, "[", OFFSET, "]+=");
    }
    for(var i=1; i<neighbors.length; ++i) {
      var v = neighbors[i];
      var negative = (v.length + 1) % 2;
      if(i > 1 && !negative) {
        result.push("+");
      } else if(negative) {
        result.push("-");
      }
      if(type === "generic") {
        result.push(DATA, ".get(");
      } else {
        result.push(DATA, "[");
      }
      result.push(OFFSET, "-", v.join("-"));
      if(type === "generic") {
        result.push(")");
      } else {
        result.push("]");
      }
    }
    if(type === "generic") {
      result.push(");");
    } else {
      result.push(";");
    }
    return result.join("")
  }
  boundaries[n-1] = true;
  var code = [
    generateScan(type, boundaries, n-1),
    OFFSET, "+=", STEP, n-1,
    ";for(", INDEX, n-1, "=1;", INDEX, n-1, "<", SHAPE, n-1, ";++", INDEX, n-1, "){",
  ];
  boundaries[n-1] = false;
  code.push(generateScan(type, boundaries, n-1),
    OFFSET, "+=", STEP, n-1, ";}");
  return code.join("")
}

function generatePrefixSumCode(type, order) {
  //Initialize local variables

  var funcName = [ "prefixSum", order.length, "d", type, "s", order.join("s") ].join("");

  var code = [ 
    "function ", funcName, "(arr){var ",
      DATA, "=arr.data,",
      SHAPE, "=arr.shape,",
      STRIDE, "=arr.stride,",
      OFFSET, "=arr.offset,"
  ];
  var n = order.length;
  for(var i=0; i<n; ++i) {
    code.push(SHAPE, i, "=", SHAPE, "[", order[i], "],");
  }
  for(var i=0; i<n; ++i) {
    code.push(STRIDE, i, "=", STRIDE, "[", order[i], "],");
  }
  for(var i=0; i<n; ++i) {
    code.push(INDEX, i, "=0,");
  }
  for(var i=n-1; i>0; --i) {
    code.push(STEP, i, "=", STRIDE, i, "-", SHAPE, i-1, "*", STRIDE, i-1, ",");
  }
  code.push(STEP, "0=", STRIDE, 0, ";");

  //Generate scan code recursively
  var boundaries = new Array(n);
  for(var i=0; i<n; ++i) {
    boundaries[i] = true;
  }
  code.push(
    generateScan(type, boundaries, n), "}return ", funcName
  );

  //Allocate subroutine and return
  var proc = new Function(code.join(""));
  return proc()
}

var CACHE = {};

function computePrefixSum(array) {
  var key = array.dtype + array.order.join();
  var proc = CACHE[key];
  if(!proc) {
    proc = CACHE[key] = generatePrefixSumCode(array.dtype, array.order);
  }
  proc(array);
  return array
}
},{}],14:[function(require,module,exports){
var iota = require("iota-array");
var isBuffer = require("is-buffer");

var hasTypedArrays  = ((typeof Float64Array) !== "undefined");

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride;
  var terms = new Array(stride.length);
  var i;
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i];
  }
  terms.sort(compare1st);
  var result = new Array(terms.length);
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1];
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("");
  if(dimension < 0) {
    className = "View_Nil" + dtype;
  }
  var useGetters = (dtype === "generic");

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}";
    var procedure = new Function(code);
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}";
    var procedure = new Function("TrivialArray", code);
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"];

  //Create constructor for view
  var indices = iota(dimension);
  var args = indices.map(function(i) { return "i"+i });
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+");
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",");
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",");
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension);

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})");

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]");
  } else {
    code.push("Object.defineProperty(proto,'order',{get:");
    if(dimension < 4) {
      code.push("function "+className+"_order(){");
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})");
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})");
      }
    } else {
      code.push("ORDER})");
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){");
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}");
  } else {
    code.push("return this.data["+index_str+"]=v}");
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){");
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}");
  } else {
    code.push("return this.data["+index_str+"]}");
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}");

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}");

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" });
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" });
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","));
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}");
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}");

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil");
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}");
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}");

  //view.transpose():
  var tShape = new Array(dimension);
  var tStride = new Array(dimension);
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]";
    tStride[i] = "b[i"+i+"]";
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}");

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset");
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}");
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}");

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}");

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"));
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(isBuffer(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "buffer":[],
  "generic":[]
}

;
function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0];
    return ctor([])
  } else if(typeof data === "number") {
    data = [data];
  }
  if(shape === undefined) {
    shape = [ data.length ];
  }
  var d = shape.length;
  if(stride === undefined) {
    stride = new Array(d);
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz;
      sz *= shape[i];
    }
  }
  if(offset === undefined) {
    offset = 0;
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i];
      }
    }
  }
  var dtype = arrayDType(data);
  var ctor_list = CACHED_CONSTRUCTORS[dtype];
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1));
  }
  var ctor = ctor_list[d+1];
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor;

},{"iota-array":6,"is-buffer":7}],15:[function(require,module,exports){

var twoProduct = require("two-product");
var robustSum = require("robust-sum");
var robustScale = require("robust-scale");
var robustSubtract = require("robust-subtract");

var NUM_EXPAND = 5;

var EPSILON     = 1.1102230246251565e-16;
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON;
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON;

function cofactor(m, c) {
  var result = new Array(m.length-1);
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1);
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j];
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n);
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n);
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-1), "]"].join("");
    }
  }
  return result
}

function sign(n) {
  if(n & 1) {
    return "-"
  }
  return ""
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1;
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function determinant(m) {
  if(m.length === 2) {
    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")]
  } else {
    var expr = [];
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""));
    }
    return expr
  }
}

function orientation(n) {
  var pos = [];
  var neg = [];
  var m = matrix(n);
  var args = [];
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos, determinant(cofactor(m, i)));
    } else {
      neg.push.apply(neg, determinant(cofactor(m, i)));
    }
    args.push("m" + i);
  }
  var posExpr = generateSum(pos);
  var negExpr = generateSum(neg);
  var funcName = "orientation" + n + "Exact";
  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("");
  var proc = new Function("sum", "prod", "scale", "sub", code);
  return proc(robustSum, twoProduct, robustScale, robustSubtract)
}

var orientation3Exact = orientation(3);
var orientation4Exact = orientation(4);

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) { 
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0]);
    var r = (a[0] - c[0]) * (b[1] - c[1]);
    var det = l - r;
    var s;
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r;
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r);
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s;
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0];
    var bdx = b[0] - d[0];
    var cdx = c[0] - d[0];
    var ady = a[1] - d[1];
    var bdy = b[1] - d[1];
    var cdy = c[1] - d[1];
    var adz = a[2] - d[2];
    var bdz = b[2] - d[2];
    var cdz = c[2] - d[2];
    var bdxcdy = bdx * cdy;
    var cdxbdy = cdx * bdy;
    var cdxady = cdx * ady;
    var adxcdy = adx * cdy;
    var adxbdy = adx * bdy;
    var bdxady = bdx * ady;
    var det = adz * (bdxcdy - cdxbdy) 
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady);
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz);
    var tol = ERRBOUND4 * permanent;
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
];

function slowOrient(args) {
  var proc = CACHED[args.length];
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length);
  }
  return proc.apply(undefined, args)
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length));
  }
  var args = [];
  var procArgs = ["slow"];
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i);
    procArgs.push("o" + i);
  }
  var code = [
    "function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ];
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");");
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation");
  procArgs.push(code.join(""));

  var proc = Function.apply(undefined, procArgs);
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED));
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i];
  }
}

generateOrientationProc();
},{"robust-scale":16,"robust-subtract":17,"robust-sum":18,"two-product":19}],16:[function(require,module,exports){

var twoProduct = require("two-product");
var twoSum = require("two-sum");

module.exports = scaleLinearExpansion;

function scaleLinearExpansion(e, scale) {
  var n = e.length;
  if(n === 1) {
    var ts = twoProduct(e[0], scale);
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n);
  var q = [0.1, 0.1];
  var t = [0.1, 0.1];
  var count = 0;
  twoProduct(e[0], scale, q);
  if(q[0]) {
    g[count++] = q[0];
  }
  for(var i=1; i<n; ++i) {
    twoProduct(e[i], scale, t);
    var pq = q[1];
    twoSum(pq, t[0], q);
    if(q[0]) {
      g[count++] = q[0];
    }
    var a = t[1];
    var b = q[1];
    var x = a + b;
    var bv = x - a;
    var y = b - bv;
    q[1] = x;
    if(y) {
      g[count++] = y;
    }
  }
  if(q[1]) {
    g[count++] = q[1];
  }
  if(count === 0) {
    g[count++] = 0.0;
  }
  g.length = count;
  return g
}
},{"two-product":19,"two-sum":20}],17:[function(require,module,exports){

module.exports = robustSubtract;

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b;
  var bv = x - a;
  var av = x - bv;
  var br = b - bv;
  var ar = a - av;
  var y = ar + br;
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0;
  var nf = f.length|0;
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], -f[0])
  }
  var n = ne + nf;
  var g = new Array(n);
  var count = 0;
  var eptr = 0;
  var fptr = 0;
  var abs = Math.abs;
  var ei = e[eptr];
  var ea = abs(ei);
  var fi = -f[fptr];
  var fa = abs(fi);
  var a, b;
  if(ea < fa) {
    b = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    b = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = -f[fptr];
      fa = abs(fi);
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    a = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = -f[fptr];
      fa = abs(fi);
    }
  }
  var x = a + b;
  var bv = x - a;
  var y = b - bv;
  var q0 = y;
  var q1 = x;
  var _x, _bv, _av, _br, _ar;
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei;
      eptr += 1;
      if(eptr < ne) {
        ei = e[eptr];
        ea = abs(ei);
      }
    } else {
      a = fi;
      fptr += 1;
      if(fptr < nf) {
        fi = -f[fptr];
        fa = abs(fi);
      }
    }
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
  }
  while(eptr < ne) {
    a = ei;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
    }
  }
  while(fptr < nf) {
    a = fi;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    } 
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    fptr += 1;
    if(fptr < nf) {
      fi = -f[fptr];
    }
  }
  if(q0) {
    g[count++] = q0;
  }
  if(q1) {
    g[count++] = q1;
  }
  if(!count) {
    g[count++] = 0.0;  
  }
  g.length = count;
  return g
}
},{}],18:[function(require,module,exports){

module.exports = linearExpansionSum;

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b;
  var bv = x - a;
  var av = x - bv;
  var br = b - bv;
  var ar = a - av;
  var y = ar + br;
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0;
  var nf = f.length|0;
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf;
  var g = new Array(n);
  var count = 0;
  var eptr = 0;
  var fptr = 0;
  var abs = Math.abs;
  var ei = e[eptr];
  var ea = abs(ei);
  var fi = f[fptr];
  var fa = abs(fi);
  var a, b;
  if(ea < fa) {
    b = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    b = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = f[fptr];
      fa = abs(fi);
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
      ea = abs(ei);
    }
  } else {
    a = fi;
    fptr += 1;
    if(fptr < nf) {
      fi = f[fptr];
      fa = abs(fi);
    }
  }
  var x = a + b;
  var bv = x - a;
  var y = b - bv;
  var q0 = y;
  var q1 = x;
  var _x, _bv, _av, _br, _ar;
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei;
      eptr += 1;
      if(eptr < ne) {
        ei = e[eptr];
        ea = abs(ei);
      }
    } else {
      a = fi;
      fptr += 1;
      if(fptr < nf) {
        fi = f[fptr];
        fa = abs(fi);
      }
    }
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
  }
  while(eptr < ne) {
    a = ei;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    }
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    eptr += 1;
    if(eptr < ne) {
      ei = e[eptr];
    }
  }
  while(fptr < nf) {
    a = fi;
    b = q0;
    x = a + b;
    bv = x - a;
    y = b - bv;
    if(y) {
      g[count++] = y;
    } 
    _x = q1 + x;
    _bv = _x - q1;
    _av = _x - _bv;
    _br = x - _bv;
    _ar = q1 - _av;
    q0 = _ar + _br;
    q1 = _x;
    fptr += 1;
    if(fptr < nf) {
      fi = f[fptr];
    }
  }
  if(q0) {
    g[count++] = q0;
  }
  if(q1) {
    g[count++] = q1;
  }
  if(!count) {
    g[count++] = 0.0;  
  }
  g.length = count;
  return g
}
},{}],19:[function(require,module,exports){

module.exports = twoProduct;

var SPLITTER = +(Math.pow(2, 27) + 1.0);

function twoProduct(a, b, result) {
  var x = a * b;

  var c = SPLITTER * a;
  var abig = c - a;
  var ahi = c - abig;
  var alo = a - ahi;

  var d = SPLITTER * b;
  var bbig = d - b;
  var bhi = d - bbig;
  var blo = b - bhi;

  var err1 = x - (ahi * bhi);
  var err2 = err1 - (alo * bhi);
  var err3 = err2 - (ahi * blo);

  var y = alo * blo - err3;

  if(result) {
    result[0] = y;
    result[1] = x;
    return result
  }

  return [ y, x ]
}
},{}],20:[function(require,module,exports){

module.exports = fastTwoSum;

function fastTwoSum(a, b, result) {
	var x = a + b;
	var bv = x - a;
	var av = x - bv;
	var br = b - bv;
	var ar = a - av;
	if(result) {
		result[0] = ar + br;
		result[1] = x;
		return result
	}
	return [ar+br, x]
}
},{}],21:[function(require,module,exports){

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0];
  for(var i=1; i<len; ++i) {
    b = a;
    a = list[i];
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0];
  for(var i=1; i<len; ++i, b=a) {
    b = a;
    a = list[i];
    if(a !== b) {
      if(i === ptr) {
        ptr++;
        continue
      }
      list[ptr++] = a;
    }
  }
  list.length = ptr;
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare);
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort();
  }
  return unique_eq(list)
}

module.exports = unique;

},{}],22:[function(require,module,exports){
ndarray = require('ndarray');
createPlanner = require('l1-path-finder');

function initializePlanner(self) {
  let gameMap = self.map;
  let w = self.map[0].length;
  let h = self.map.length;
  let mapArr = new Int8Array(w * h);
  
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      //x:j, y:i
      let indexInMap = j + i * w;
      if (gameMap[i][j] === false){
        mapArr[indexInMap] = 1;
      }
    }
  }
  
  let gMap = self.ndarray = ndarray(mapArr, [w, h]);
  let planner = createPlanner(gMap);
  self.planner = planner;
}



module.exports = {initializePlanner};
},{"l1-path-finder":10,"ndarray":14}]},{},[22]);


//declare ndarray and createPlanner outside so that browserify can do its magic by converting node's require functions and it will come up here
var ndarray;
var createPlanner;

//Initializes the L1 planner into self.planner
function initializePlanner(self) {
  let t1 = new Date();
  let gameMap = self.map;
  let w = self.map[0].length;
  let h = self.map.length;
  let mapArr = new Int8Array(w * h);
  self.log('Width: ' + w + ' Height: ' + h);
  //[[0,-1], [1,-1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  //FIRST WE REDUCE MAP TO SAVE PLANNING TIME
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      //x:j, y:i
      let indexInMap = j + i * w;
      if (gameMap[i][j] === false){
        /*
        let numObstacles = 0;
        let remove = false;
        let surroundingTileInfo = [];
        for (let k = 0; k < surrounding.length; k++) {
          let tileRel = surrounding[k];
          let ny = i + tileRel[1];
          let nx = j + tileRel[0];
          if (nx < 0 || ny < 0 || nx >= gameMap[0].length || ny >= gameMap.length){
            surroundingTileInfo.push(true);
          }
          else {
            let passable = gameMap[i + tileRel[1]][j + tileRel[0]];
            if (passable === false) {
              numObstacles += 1;
              surroundingTileInfo.push(false);
            }
            else {
              surroundingTileInfo.push(true);
            }
          }
        }
        if (numObstacles <= 2) {
          //remove all wals that are singular
          mapArr[indexInMap] = 0;
        }
        else if (surroundingTileInfo[1] === false && surroundingTileInfo[6] === false) {
          mapArr[indexInMap] = 0;
        }
        else if (surroundingTileInfo[3] === false && surroundingTileInfo[4] === false) {
          mapArr[indexInMap] = 0;
        }
        else {
          mapArr[indexInMap] = 1;
        }
        */
        mapArr[indexInMap] = 1;
      }
    }
  }
  self.log(`Map Reduction took ${new Date() - t1} ms`);
  //self.log('Obstacles maze: ' + maze.get(0,1));
  let t2 = new Date();
  let gMap = ndarray(mapArr, [w, h]);
  let planner = createPlanner(gMap);
  self.planner = planner;
  
  self.log(`Planner took ${new Date() - t2} ms`);
  self.log(`51,10:${gMap.get(10,51)}`);
  //var path = [];
  //var dist = planner.search(19,7, 23,7,  path);
  //self.log(`Dist: ${dist}; path:${path}`);
}
var pathing = {initializePlanner};

function mind$1(self){
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  self.log(`Church (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let action = '';
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.map;
  //INITIALIZATION
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    self.buildQueue = [3];
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    let signalmsg = robotsInVision[i].signal;
    if (msg === 4) {
      self.log(`Church got a unit returned`);
      //pilgrim is nearby, assign it new mining stuff if needed
      if (self.status === 'pause' || (self.fuel <= 600)) {
        self.log(`Church tried to tell nearby pilgrims to mine fuel`);
        self.signal(3,2);
      }
    }
  }
  self.status = 'build';
  
  /* Watch for enemies */
  let sawEnemyThisTurn = false;
  let nearestEnemyLoc = null;
  let closestEnemyDist = 1000;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.unit === SPECS.CRUSADER) {
      let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    else if (obot.unit === SPECS.PREACHER) {
      let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
      
    }
    else if (obot.unit === SPECS.PROPHET) {
      let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    if (obot.team === otherTeamNum) {
      //sees enemy unit, send our units to defend spot
      if (obot.unit !== SPECS.PILGRIM){
        let distToUnit = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToUnit < closestEnemyDist) {
          nearestEnemyLoc = {x: obot.x, y: obot.y};
          closestEnemyDist = distToUnit;
          self.log(`Nearest to church is ${nearestEnemyLoc.x}, ${nearestEnemyLoc.y}`);
          sawEnemyThisTurn = true;
        }
        
        
      }
      
    }
  }
  if (sawEnemyThisTurn === false) {
    //keep karbonite in stock so we can spam mages out when needed
    if (self.sawEnemyLastTurn === true) {
      self.signal(16391, 36); //tell everyone to defend
    }
    if (self.karbonite >= 200 && (self.fuel <= self.preachers * 60 + self.prophets * 70)) {
      self.buildQueue.push(4, 4, 5);
    }
    if ((self.fuel <= self.preachers * 60 + self.prophets * 70) && self.karbonite >= 100) {
      //not enough fuel, build pilgrim
      let unitsInVincinity = search.unitsInRadius(self, 8);
      if (unitsInVincinity[SPECS.PILGRIM].length < numberOfDeposits(self, self.me.x, self.me.y)){
        self.buildQueue.push(2);
      }
    }
    self.sawEnemyLastTurn = false;
  }
  else {
    let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
    self.signal(12294 + compressedLocationHash, 36);
    //self.log(`Nearest to castle is ${nearestEnemyLoc.x}, ${nearestEnemyLoc.y}`);
    self.sawEnemyLastTurn = true;
    //self.buildQueue.unshift(5);
    
  }
  
  
  
  //DECISION MAKING
  if (self.status === 'build') {
    
    self.log(`BuildQueue: ${self.buildQueue}`);
    if (self.buildQueue[0] !== -1){
      
      let adjacentPos = search.circle(self, self.me.x, self.me.y, 2);
      /*
      if (self.buildQueue[0] === 2){
        adjacentPos = self.buildingPilgrimPositions
      }
      else {
        adjacentPos = self.buildingAttackUnitPositions;
      }
      */
      
      for (let i = 0; i < adjacentPos.length; i++) {
        let checkPos = adjacentPos[i];
        
        if(canBuild$1(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

          if (self.buildQueue.length > 0 && enoughResourcesToBuild$1(self, self.buildQueue[0])) {
            let unit = self.buildQueue.shift();
            let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
            action = self.buildUnit(unit, rels.dx, rels.dy);
            return {action:action};
          }
        }
      }
    }
    else {
      self.buildQueue.shift();
    }
  }
  return {action:action}; 
}
function canBuild$1(self, xpos, ypos, robotMap, passableMap) {
  if (search.inArr(xpos,ypos,robotMap)) {
    if (robotMap[ypos][xpos] === 0) {
      if (passableMap[ypos][xpos] === true){
        return true;
      }
    }
  }
  return false;
}

function enoughResourcesToBuild$1(self, unitType) {
  let fuelCost = SPECS.UNITS[unitType].CONSTRUCTION_FUEL;
  let karbCost = SPECS.UNITS[unitType].CONSTRUCTION_KARBONITE;
  if (fuelCost <= self.fuel) {
    if (karbCost <= self.karbonite) {
      return true;
    }
  }
  return false;
}
function numberOfDeposits(self, nx, ny) {
  let checkPositions = search.circle(self, nx, ny, 2);
  let numDeposits = 0;
  let fuelMap = self.getFuelMap();
  let karbMap = self.getKarboniteMap();
  for (let i = 0; i < checkPositions.length; i++) {
    let cx = checkPositions[i][0];
    let cy = checkPositions[i][1];
    if (fuelMap[cy][cx] === true || karbMap[cy][cx] === true) {
      numDeposits += 1;
    }
  }
  return numDeposits;
}
var church = {mind: mind$1};

function mind$2(self) {
  
  self.log(`Pilgrim (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();
  //we can improve the speed here by using bfs
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  let gameMap = self.map;
  
  //INITIALIZATION
  if (self.me.turn === 1) {
    //for pilgrims, search first
    self.status = 'searchForKarbDeposit';
    
    //self.log(`${self.knownStructures[self.me.team][0].x}`);
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
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.initializeCastleLocations();
    
    self.originalCastleLocation = [self.knownStructures[self.me.team][0].x, self.knownStructures[self.me.team][0].y];
    
    self.target = [self.me.x,self.me.y];
    self.finalTarget = [self.me.x, self.me.y];
  }
  
  //initializing planner
  if (self.me.turn === 5) {
    self.log('Trying to plan');
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
    //self.status = 'searchForKarbDeposit';
  }
  
  //SIGNAL PROCESSION
  let robotsInVision = self.getVisibleRobots();
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePilgrim(self, msg);
  }
  let enemyPositionsToAvoid = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    
    //find position that is the farthest away from all enemies
    if (obot.team === otherTeamNum) {
      let distToEnemy = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (obot.unit === SPECS.PROPHET && distToEnemy <= 80) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      else if (obot.unit === SPECS.PREACHER && distToEnemy <= 36) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      
    }
  }
  let avoidLocs = [];
  if (enemyPositionsToAvoid.length > 0){
    self.log(`Pilgrim sees enemies nearby`);
    let positionsToGoTo = search.circle(self, self.me.x, self.me.y, 4);
    for (let i = 0; i < positionsToGoTo.length; i++) {
      let thisSumDist = 0;
      let pos = positionsToGoTo[i];
      if (search.emptyPos(pos[0], pos[1], robotMap, self.map)){
        for (let j = 0; j < enemyPositionsToAvoid.length; j++) {
          thisSumDist += qmath$1.dist(pos[0], pos[1], enemyPositionsToAvoid[j][0], enemyPositionsToAvoid[j][1]);
        }
        avoidLocs.push({pos:pos, dist:thisSumDist});
      }
    }
  }
  if (avoidLocs.length > 0) {
    //FORCE A MOVE AWAY
    self.log(`Pilgrim running away from enemy`);
    avoidLocs.sort(function(a,b) {
      return b.dist - a.dist;
    });
    let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
    return {action:self.move(rels.dx,rels.dy)}
  }
  
  //if robot is going to deposit but it is taken up, search for new deposit loc.
  if (self.status === 'goingToKarbDeposit' || self.status === 'goingToFuelDeposit') {
    //self.log(`Robotmap at 11,11 ${robotMap[self.finalTarget[1]][self.finalTarget[0]]}`)
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0){
      if (self.status === 'goingToKarbDeposit'){
        self.status = 'searchForKarbDeposit';
      }
      else {
        self.status = 'searchForFuelDeposit';
      }
    }
  }
  //search for deposit, set new finalTarget and set path
  if (self.status === 'searchForKarbDeposit' || self.status === 'searchForFuelDeposit') {
    //perform search for closest deposit
    let newTarget = null;
    let cd = 9999990;
    if (self.status === 'searchForFuelDeposit'){
    
      for (let i = 0; i < self.fuelSpots.length; i++) {
        let nx = self.fuelSpots[i].x;
        let ny = self.fuelSpots[i].y;
        if (robotMap[ny][nx] <= 0){
          let patharr = [];
          let distToThere = 0;
          if (self.planner !== null) {
            distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
          }
          else {
            distToThere = qmath$1.dist(self.me.x,self.me.y,nx,ny);
          }

          if (distToThere < cd) {
            cd = distToThere;
            newTarget = [nx,ny];
          }
        }
      }
      self.status = 'goingToFuelDeposit';
      self.finalTarget = [newTarget[0],newTarget[1]];
    }
    if (self.status === 'searchForKarbDeposit'){
      for (let i = 0; i < self.karboniteSpots.length; i++) {
        let nx = self.karboniteSpots[i].x;
        let ny = self.karboniteSpots[i].y;
        if (robotMap[ny][nx] <= 0 || robotMap[ny][nx] === self.me.id){
          let patharr = [];
          let distToThere = 0;
          if (self.planner !== null) {
            distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
          }
          else {
            distToThere = qmath$1.dist(self.me.x,self.me.y,nx,ny);
          }
          if (distToThere < cd) {
            cd = distToThere;
            newTarget = [nx,ny];
          }
        }
      }
      if (newTarget !== null){
        self.status = 'goingToKarbDeposit';
        if (self.karbonite >= 30) {
          let nearestStructure = search.findNearestStructure(self);
          self.log(`nearest struct is ${nearestStructure.x}, ${nearestStructure.y}, karb target is ${newTarget}`);
          if (qmath$1.dist(newTarget[0], newTarget[1],nearestStructure.x, nearestStructure.y) > 10) {
            //if far enough, try to build church there
            self.status = 'building';
            //search all around karb deposit
            let mostDeposits = 0;
            let buildLoc = null;
            let positionsAroundDeposit = search.circle(self, newTarget[0], newTarget[1], 2);
            for (let k = 0; k < positionsAroundDeposit.length; k++) {
              let px = positionsAroundDeposit[k][0];
              let py = positionsAroundDeposit[k][1];
              if (fuelMap[py][px] === false && karboniteMap[py][px] === false) {
                let numDepositsHere = numberOfDeposits$1(self, px, py);
                if (numDepositsHere > mostDeposits) {
                  mostDeposits = numDepositsHere;
                  buildLoc = [px, py];
                }
              }
            }
            if (buildLoc !== null) {
              self.buildTarget = buildLoc;

            }
            else {
              self.status = 'goingToKarbDeposit';
            }
          }
          else {
            self.status = 'goingToKarbDeposit';
          }
        }
        self.finalTarget = [newTarget[0],newTarget[1]];
      }
    }
    
    
  }

  if (((self.me.fuel >= 100 || self.me.karbonite >= 20) || self.status === 'return') && self.status !== 'building') {
    //send karbo
    let bestTarget = search.findNearestStructure(self);
    self.finalTarget = [bestTarget.x, bestTarget.y];
    self.status = 'return';

    let currRels = base.rel(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
      self.status = 'searchForKarbDeposit';
      if (self.fuel <= 100) {
        self.status = 'searchForFuelDeposit';
      }
      else {
        self.status = 'searchForKarbDeposit';
      }
      self.signal(4,2);
      action = self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel);
      return {action:action}; 
    }
  }
  
  if (self.status === 'searchForBuildLocation') {
    self.castleTalk(6);
    let newTarget = null;
    let moveTarget = null;
    let cd = 9999990;
    for (let i = 0; i < self.fuelSpots.length; i++) {
      let nx = self.fuelSpots[i].x;
      let ny = self.fuelSpots[i].y;
      if (qmath$1.dist(self.me.x, self.me.y, nx, ny) >= 10){
        let patharr = [];
        let distToThere = 0;
        if (self.planner !== null) {
          distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
        }
        else {
          distToThere = qmath$1.dist(self.me.x,self.me.y,nx,ny);
        }

        if (distToThere < cd) {
          cd = distToThere;
          moveTarget = [nx, ny];
          //newTarget = [nx,ny];
          let mostSpots = 0;
          let checkPositions = search.circle(self, nx, ny, 2);
          for (let k = 0; k < checkPositions.length; k++) {
            let checkPos = checkPositions[k];
            if (fuelMap[checkPos[1]][checkPos[0]] === false && fuelMap[checkPos[1]][checkPos[0]] === false) {
              let positionsAround = search.circle(self, checkPos[0], checkPos[1], 2);
              let spotsHere = 0;
              for (let j = 0; j < positionsAround.length; j++) {
                let px = positionsAround[j][0];
                let py = positionsAround[j][1];
                if (fuelMap[py][px] === true || karboniteMap[py][px] === true) {
                  spotsHere += 1;
                }
              }
              if (spotsHere > mostSpots) {
                newTarget = [checkPos[0], checkPos[1]];
                mostSpots = spotsHere;
              }
            }
          }
          
        }
      }
    }
    self.buildTarget = null;
    if (newTarget !== null){
      self.buildTarget = newTarget;
      self.finalTarget = moveTarget;
      self.status = 'building';
    }
    self.log(`Trying to build at ${self.buildTarget}`);
  }
  if (self.status === 'building') {
    if (self.me.turn > 1){
      //make sure we don't confuddle the signal for counting units
      self.castleTalk(71);
    }
    let robotThere = self.getRobot(robotMap[self.buildTarget[1]][self.buildTarget[0]]);
    if (robotThere !== null && (robotThere.unit === SPECS.CHURCH)){
      self.status = 'searchForKarbDeposit';
      self.log(`Church built already`);
    }
    else {
      if (self.me.x === self.finalTarget[0] && self.me.y === self.finalTarget[1]) {
        let rels = base.rel(self.me.x, self.me.y, self.buildTarget[0], self.buildTarget[1]);
        self.log(`TRIED TO BUILD: ${rels.dx}, ${rels.dy}`);
        if (self.fuel >= 200 && self.karbonite + self.me.karbonite >= 50){
          if (self.fuel <= 100){
            self.status = 'searchForFuelDeposit';
          }
          else {
            self.status = 'searchForKarbDeposit';
          }
          return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)}
        }
        else {
          self.log(`NOT ENOUGH RESOURCES: fuel:${self.fuel}; karb: ${self.karbonite}`);
        }
      }
      //dont stand on the build target, leave it if the final target has a pilgrim on it already
      let pilgrimOnFinalTarget = self.getRobot(robotMap[self.finalTarget[1]][self.finalTarget[0]]);
      if (pilgrimOnFinalTarget !== null && pilgrimOnFinalTarget.team === self.me.team && pilgrimOnFinalTarget.unit === SPECS.PILGRIM && self.me.id !== pilgrimOnFinalTarget.id){
        self.log(`already a unit building there`);
          self.status = 'searchForFuelDeposit';
      }
      /*
      self.log(`Checking`)
      let pilgrimOnFinalTarget = self.getRobot(robotMap[self.finalTarget[1]][self.finalTarget[0]]);
      if (pilgrimOnFinalTarget !== null && pilgrimOnFinalTarget.team === self.me.team && pilgrimOnFinalTarget.unit === SPECS.PILGRIM){
        if (self.me.x === self.buildTarget[0] && self.me.y === self.buildTarget[1]) {
          let leavePositions = search.circle(self, self.me.x, self.me.y, 2);
          for (let i = 0; i < leavePositions.length; i++) {
            let pos = leavePositions[i];
            let orobot = self.getRobot(robotMap[pos[1]][pos[0]]);
            if (orobot === null && gameMap[pos[1]][pos[0]] === true) {
              self.log(`Moved away from build target`)
              let rels = base.rel(self.me.x, self.me.y, pos[0], pos[1]);
              return {action:self.move(rels.dx, rels.dy)};
            }
          }
        }
      }
      */
    }
  }
  //forever mine
  if (karboniteMap[self.me.y][self.me.x] === true && (self.status === 'goingToKarbDeposit' || self.status === 'mine' || self.status === 'building')) {
    action = self.mine();
    if (self.status !== 'building') {
    
      self.status = 'mine';
    }
    return {action:action}; 
  }
  else if (fuelMap[self.me.y][self.me.x] === true && (self.status === 'goingToFuelDeposit' || self.status === 'mine')) {
    action = self.mine();
    if (self.status !== 'building') {
    
      self.status = 'mine';
    }
    //self.build(SPECS.CHURCH, 0, 1);
    //ADD CHURCH CODE
    return {action:action}; 
  }
  action = self.navigate(self.finalTarget);
  return {action:action};

  //return self.move(0,0);
}

function numberOfDeposits$1(self, nx, ny) {
  let checkPositions = search.circle(self, nx, ny, 2);
  let numDeposits = 0;
  let fuelMap = self.getFuelMap();
  let karbMap = self.getKarboniteMap();
  for (let i = 0; i < checkPositions.length; i++) {
    let cx = checkPositions[i][0];
    let cy = checkPositions[i][1];
    if (fuelMap[cy][cx] === true || karbMap[cy][cx] === true) {
      numDeposits += 1;
    }
  }
  return numDeposits;
}


var pilgrim = {mind: mind$2};

function mind$3(self){
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  self.log(`Crusader (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let robotMap = self.getVisibleRobotMap();
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  //INITIALIZATION
  if (self.me.turn === 1) {
    //broadcast your unit number for castles to add to their count of units
    self.castleTalk(self.me.unit);
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    let initialized = self.initializeCastleLocations();
    if (initialized){
      let enemyCastle = self.knownStructures[otherTeamNum][0];
      //rally means crusader goes to a rally point
      self.status = 'defend';

      let rels = base.relToPos(self.me.x, self.me.y, enemyCastle[0], enemyCastle[1], self);
      self.finalTarget = [self.me.x + rels.dx, self.me.y+rels.dy];
      self.defendTarget = [self.me.x, self.me.y];
    }
    else {
      //set defending target
      self.status = 'defend';
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
  }
  if (self.me.turn === 3) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    //self.log(`Received from ${robotsInVision[i].id}  msg: ${msg}`);
    signal.processMessageCrusader(self, msg);
    if (msg >= 12294 && msg <= 16389) {
      self.status = 'attackTarget';
      let padding = 12294;
      let targetLoc = self.getLocation(msg - padding);
      self.finalTarget = [targetLoc.x, targetLoc.y];
      self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      //final target is wherever is max dist from final target
    }
    if (msg >= 16392 && msg <= 20487) {
        self.status = 'goToTarget';
        let padding = 16392;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy at ${self.finalTarget}`);
      }
  }
  base.updateKnownStructures(self);
  //DECISION MAKING

  if (self.status === 'defend') {
    //follow lattice structure
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true) {
        let closestDist = 99999;
        let bestLoc = null;
        for (let i = 0; i < gameMap.length; i++) {
          for (let j = 0; j < gameMap[0].length; j++) {
            if (i % 2 !== j % 2 ){
              if (search.emptyPos(j, i , robotMap, gameMap) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
                //assuming final target when rallying is the rally targt
                let thisDist = qmath$1.dist(self.defendTarget[0], self.defendTarget[1], j, i);
                if (thisDist < closestDist) {
                  closestDist = thisDist;
                  bestLoc = [j, i];
                }
              }
            }
          }
        }
        if (bestLoc !== null) {
          self.finalTarget = bestLoc;
          self.log('New location near rally point :' + self.finalTarget);
        }
    }
  }
  if (self.status === 'searchAndAttack') {
    self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
  }
  
  //at any time
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot = null;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        //if bot sees enemy structures, log it, and send to castle
        if (obot.unit === SPECS.CASTLE || obot.unit === SPECS.CHURCH) ;
        let distToThisTarget = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget) {
          leastDistToTarget = distToThisTarget;

          isEnemy = true;
          enemyBot = obot;
          
        }
        
      }
    }
    if (enemyBot !== null) {
      if (self.status === 'goToTarget') {
        self.finalTarget = [enemyBot.x, enemyBot.y];
      }
    }
    //enemy nearby, attack it?
    if (leastDistToTarget <= 16 && isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, enemyBot.x, enemyBot.y);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        action = self.attack(rels.dx,rels.dy);
        return {action:action};
      }
    }
  }
  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath$1.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
  }
  if (self.status === 'goToTarget') ;
  action = self.navigate(self.finalTarget);
  return {action:action};
  

  
}
var crusader = {mind: mind$3};

function mind$4(self){
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  self.log(`Prophet (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let robotMap = self.getVisibleRobotMap();
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  //INITIALIZATION
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.initializeCastleLocations();
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'defend';
    self.rallyTarget = [self.me.x, self.me.y];
    self.defendTarget = [self.me.x, self.me.y];
  }
  if (self.me.turn === 3) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  //self.status = 'defend';
  
  //SIGNAL PROCESSION
  let seeMage = false;
  let closestMage = null;
  let closestMageDistance = 99999;
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessageProphet(self, msg);
    if (msg >= 6 && msg <= 4101) {
      let newTarget = self.getLocation(msg - 6);
      self.finalTarget = [newTarget.x, newTarget.y];
      self.status = 'searchAndAttack';
    }
    if (msg >= 12294 && msg <= 16389) {
      self.status = 'attackTarget';
      let padding = 12294;
      let targetLoc = self.getLocation(msg - padding);
      self.finalTarget = [targetLoc.x, targetLoc.y];
      self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      //final target is wherever is max dist from final target
    }
    if (msg >= 16392 && msg <= 20487) {
      self.status = 'goToTarget';
      let padding = 16392;
      let targetLoc = self.getLocation(msg - padding);
      self.finalTarget = [targetLoc.x, targetLoc.y];
      self.log(`Preparing to attack enemy at ${self.finalTarget}`);
    }
    if (robotsInVision[i].unit === SPECS.PREACHER && robotsInVision[i].team === otherTeamNum) {
      seeMage = true;
      let distToEnemy = qmath$1.dist(self.me.x, self.me.y, robotsInVision[i].x, robotsInVision[i].y);
      if (distToEnemy < closestMageDistance) {
        closestMageDistance = distToEnemy;
        closestMage = robotsInVision[i];
      }
    }
  }
  //each turn, we update our local self.knownStructures list.
  //it also sets self.destroyedCastle to true if the castle that it knew about is no longer there anymore
  base.updateKnownStructures(self);
  
  
  //DECISIONS
  if (self.status === 'attackTarget') {
    if(seeMage === true){
      //kite mages
      let distToEnemy = qmath$1.dist(self.me.x, self.me.y, closestMage.x, closestMage.y);
      if (distToEnemy <= 16) {
        let rels = self.avoidEnemyLocations([[closestMage.x, closestMage.y]]);
        if (rels !== null) {
          return {action:self.move(rels.dx,rels.dy)} 
        }
      }
      
      
    }
    
  }
  
  
  if (self.status === 'defend') {
    //follow lattice structure
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true) {
        let closestDist = 99999;
        let bestLoc = null;
        let nearestStructure = search.findNearestStructure(self);

        for (let i = 0; i < gameMap.length; i++) {
          for (let j = 0; j < gameMap[0].length; j++) {
            if (i % 2 !== j % 2 ){
              if (search.emptyPos(j, i , robotMap, gameMap, false) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
                //assuming final target when rallying is the rally targt
                let distToStructure = qmath$1.dist(j, i, nearestStructure.x, nearestStructure.y);
                if (distToStructure > 2){
                  let thisDist = qmath$1.dist(self.defendTarget[0], self.defendTarget[1], j, i);
                  if (thisDist < closestDist) {
                    closestDist = thisDist;
                    bestLoc = [j, i];
                  }
                }
              }
            }
          }
        }
        if (bestLoc !== null) {
          self.finalTarget = bestLoc;
          self.log('New location near defend point :' + self.finalTarget);
        }
    }
  }
  if (self.status === 'attackTarget') ;
  
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        let distToThisTarget = qmath$1.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget && distToThisTarget >= 16) {
          leastDistToTarget = distToThisTarget;
          
          isEnemy = true;
          enemyBot = obot;
        }
        
      }
    }
    //enemy nearby, attack it?
    if (leastDistToTarget <= 64 && isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, enemyBot.x, enemyBot.y);
      self.log(`Prophet Attacks ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        action = self.attack(rels.dx,rels.dy);
        return {action:action};
      }
    }
    
    
    if (self.destroyedCastle === true) {
      self.destroyedCastle = false;
      //go back home
      
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];
      self.log('Destroyed castle, now going to: ' + newLoc);
      self.status = 'defend';
    }
    
  }
  
  
  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath$1.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 82) ;
    else {
      return '';
    }
    
  }
  let moveFast = true;
  action = self.navigate(self.finalTarget, false, moveFast);
  return {action:action}; 
}

var prophet = {mind: mind$4};

function attackNearestAOE(self){
  let attackLoc = {};
  let mostUnitsAttacked = -100;
  let existEnemy = false;
  let robotMap = self.getVisibleRobotMap();
  let gameMap = self.map;
  for (let i = 0; i < robotMap.length; i++) {
    for (let j = 0; j < robotMap[i].length; j++) {
      if (robotMap[i][j] >= 0 && gameMap[i][j] === true) {

        //i = y value, j =  value;
        //let oRobot = self.getRobot(oRobotId);
        //location in vision and attackble because preacher vision = attack radius
        //check units that will get hit, maximize damage
        let checkPositions = search$1.circle(self, j, i, 2);
        let unitsAttacked = 0;
        let thereIsEnemy = false;
        for (let k = 0; k < checkPositions.length; k++) {
          let checkPos = checkPositions[k];
          let oRobotId = robotMap[checkPos[1]][checkPos[0]];
          if (oRobotId > 0) {
            let oRobot = self.getRobot(oRobotId);
            //if other team, add to number of affected enemies
            //Strategy is to hit as many enemies as possible and as little friendlies as possible
            if (oRobot.team !== self.me.team) {
              unitsAttacked += 1; //enemy team hit
              thereIsEnemy = true;
            }
            else {
              unitsAttacked -= 1;
            }

          }
        }
        if (mostUnitsAttacked < unitsAttacked && thereIsEnemy === true) {
          attackLoc = {x:j,y:i};
          mostUnitsAttacked = unitsAttacked;
          existEnemy = true;
        }
      }
    }
  }
  
  if (existEnemy === true) {
    return attackLoc;
  }
  return null;
}
function attackNearest(self) {
  let leastDistToTarget = 99999999;
  let attackLoc = {};
  let robotToAttack = null;
  let existEnemy = false;
  
  for (let i = 0; i < robotsInVision.length; i++) {
    let oVisRobot = robotsInVision[i];

    //check if they defined or not, because of some bugs with bc19 i think
    if (oVisRobot.x !== undefined && oVisRobot.y !== undefined){
      let distToTarget = qmath.dist(self.me.x, self.me.y, oVisRobot.x, oVisRobot.y);
      if (distToTarget < leastDistToTarget) {
        leastDistToTarget = distToTarget;
        attackLoc = {x:oVisRobot.x, y:oVisRobot.y};
        existEnemy = true;
        robotToAttack = oVisRobot;
      }
    }
  }
  if (existEnemy === true) {
    return robotToAttack;
  }
  return null;
}
var attack = {attackNearest, attackNearestAOE};

function mind$5(self){
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  
  let forcedAction = null;
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  let robotMap = self.getVisibleRobotMap();
  
  self.log(`Preacher (${self.me.x}, ${self.me.y}); Status: ${self.status}; Final Target: ${self.finalTarget}`);
  //STRATS:
  //3 preacher defence. build a pilgrim then 3 preachers
  
  
  //INITIALIZATION
  if (self.me.turn === 5) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  if (self.me.turn === 1) {
    self.originalCastleTarget = [-1, -1];
    
    self.castleTalk(self.me.unit);
    self.allowedToMove = true;
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'defend';
    self.lastAttackedUnit = null;
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    let initializedCastles = self.initializeCastleLocations();
    self.log(`initialized castles: ${initializedCastles}`);
    if (initializedCastles){
      let myCastleLocation = self.knownStructures[self.me.team][0];
      let enemyCastleLocation = self.knownStructures[otherTeamNum][0];
      //DETERMINE RALLY POSITION

      //pathing.initializePlanner(self);
      self.setFinalTarget([enemyCastleLocation.x, enemyCastleLocation.y]);
      //self.log(self.path + ': ' + enemyCastleLocation.x + ', ' + enemyCastleLocation.y);
      //check path, and follow it until you are at least a distance away
      let finalNode = [];
      for (let i = 0; i < self.path.length; i+=2) {
        if (qmath$1.dist(myCastleLocation.x,myCastleLocation.y,self.path[i],self.path[i+1]) >= 10) {
          finalNode = [self.path[i],self.path[i+1]];
          break;
        }
      }
      if (self.path.length === 0) {
        finalNode = [enemyCastleLocation.x, enemyCastleLocation.y];
      }
      //self.log('First here:' + finalNode);
      let rels = base.relToPos(self.me.x, self.me.y, finalNode[0], finalNode[1], self);
      //self.log(rels);
      let rels2 = base.relToPos(self.me.x + rels.dx, self.me.y+rels.dy, finalNode[0], finalNode[1], self);
      let rels3 = base.relToPos(self.me.x + rels.dx + rels2.dx, self.me.y+rels.dy + rels2.dy, finalNode[0], finalNode[1], self);
      let relsx = self.me.x + rels.dx + rels2.dx + rels3.x;
      /*
      pathing.initializePlanner(self);
      self.setFinalTarget(exploreTarget[0],exploreTarget[1]);
      let path = [];
      planner.search(self.me.y,self.me.x,self.finalTarget[1],self.finalTarget[0],path);
      self.log(path);
      */


      self.rallyTarget = [self.me.x + rels.dx + rels2.dx, self.me.y + rels.dy + rels2.dy];

      self.finalTarget = [self.me.x + rels.dx + rels2.dx, self.me.y + rels.dy + rels2.dy];
      //self.rallyTarget = [self.me.x, self.me.y];
      //self.finalTarget = [self.me.x, self.me.y];
      self.log(`Rally Point: ${self.rallyTarget}`);
      self.defendTarget = self.rallyTarget;
    }
    else {
      //set defending target
      self.status = 'defend';
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
    //self.finalTarget = [exploreTarget[0], exploreTarget[1]];
    
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePreacher(self, msg);
    if(robotsInVision[i].id !== self.me.id){
      //process new target location
      if (msg >= 6 && msg <= 4101) {
        //- 6 for padding
        let newTarget = self.getLocation(msg - 6);
        self.finalTarget = [newTarget.x, newTarget.y];
        self.status = 'searchAndAttack';
        self.allowedToMove = true;
        self.log(`New target: ${self.finalTarget} from message:${msg}`);
      }
      if (msg >= 4102 && msg <= 12293){
        let padding = 4102;
        let pushToEndOfKnownStructures = true;
        //self.enemyCastleSortedIndex = 0;
        if (msg >= 4102 && msg <= 8197) {
          //-4102 for padding
          //this caslte location is the first castle in any castle robots self.enemyCastlesSorted array.
          padding = 4102;
          //self.enemyCastleSortedIndex = 0;
          
        }
        else if (msg >= 8198 && msg <= 12293) {
          //this caslte location is the first castle in any castle robots self.enemyCastlesSorted array.
          padding = 8198;
          pushToEndOfKnownStructures = false;
          //we know opposite castle was destroyed...
          
          
          //self.enemyCastleSortedIndex = 1;
        }
        /*
        else if (msg >= 12294 && msg <= 16389) {
          //this caslte location is the first castle in any castle robots self.enemyCastlesSorted array.
          padding = self.knownStructures[otherTeamNum][k]
          //this index is what we send back to castles when we destroy this enemy castle
          self.enemyCastleSortedIndex = 2;
        }
        */
        let enemyCastleLoc = self.getLocation(msg - padding);
        base.logStructure(self,enemyCastleLoc.x, enemyCastleLoc.y, otherTeamNum, 0, pushToEndOfKnownStructures);
        self.originalCastleTarget = [enemyCastleLoc.x, enemyCastleLoc.y];
        self.log(`Received location of enemy castle: ${enemyCastleLoc.x}, ${enemyCastleLoc.y} from message:${msg}`);
      }
      if (msg >= 12294 && msg <= 16389) {
        self.status = 'attackTarget';
        let padding = 12294;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      }
      if (msg >= 16392 && msg <= 20487) {
        self.status = 'goToTarget';
        let padding = 16392;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy at ${self.finalTarget}`);
      }
      if (msg === 5) {
        self.log(`Received ${msg} from ${robotsInVision[i].id}`);
      }
      
    }
  }
  
  //always update our locations and send death of enemy castle signal if possible
  base.updateKnownStructures(self);
  /*
  for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
    self.log(`ENEMY Castle at ${self.knownStructures[otherTeamNum][i].x}, ${self.knownStructures[otherTeamNum][i].y}`);
  }
  */
  //defenders and units that are have no final target. If they did, then they must be waiting for a fuel stack to go that target
  if (self.status === 'defend') {
    if (self.me.x % 2 === 0 || self.me.y % 2 === 0 || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true) {
      let closestDist = 99999;
      let bestLoc = null;
      let nearestStructure = search.findNearestStructure(self);
      for (let i = 0; i < gameMap.length; i++) {
        for (let j = 0; j < gameMap[0].length; j++) {
          if (i % 2 === 1 && j % 2 === 1){
            //position can also not be next to structure
            if (search.emptyPos(j, i , robotMap, gameMap, false) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
              //assuming final target when rallying is the rally targt
             
              let distToStructure = qmath$1.dist(j, i, nearestStructure.x, nearestStructure.y);
              if (distToStructure > 2){
                let thisDist = qmath$1.dist(self.defendTarget[0], self.defendTarget[1], j, i);
                if (thisDist < closestDist) {
                  closestDist = thisDist;
                  bestLoc = [j, i];
                }
              }
            }
          }
        }
      }
      if (bestLoc !== null) {
        self.finalTarget = bestLoc;
        self.log('New location near defend point :' + self.finalTarget);
      }
    }
  }
  //units rallying go to a rally point sort of, and will end up trying to attack the first known enemy structure
  if (self.status === 'rally');
  
  
  //DECISIONS
  
  if (self.status === 'attackTarget') ;
  if (self.status === 'goToTarget') ;
  if (self.status === 'searchAndAttack') {
    if (self.knownStructures[otherTeamNum].length > 0){
      
      self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
    }
  }
  
  //robot is waiting for enough fuel to start another war charge
  if (self.status === 'waitingForFuelStack') {
    self.log(`Waiting for fuel stack:${self.fuelNeeded}`);
    let unitsInVincinity = search.unitsInRadius(self, 36);
    
    moveApart(self);
    /*
    let path2 = [];
    let distToTarget2 = 0;
    if (self.planner !== null){
      distToTarget2 = self.planner.search(self.me.y,self.me.x,self.finalTarget[1], self.finalTarget[0],path2);
    }
    else {
      distToTarget2 = qmath.unitDist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    }
    
    self.fuelNeeded = (distToTarget2/2) * 12 * 6 + 250;//unitsInVincinity[5].length;
    */
    if (self.fuelNeeded <= self.fuel) {
      self.signal(self.signalToSendAfterFuelIsMet, 36);
      self.status = 'searchAndAttack';
      self.allowedToMove = true;
      forcedAction = '';
      //self.castleTalk(7);
    }
    else {
      //tell castle to pause
      self.allowedToMove = false;
      self.castleTalk(6);
    }
  }
  
  
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'exploreAndAttack' || self.status === 'waitingForFuelStack' || self.status === 'attackTarget' || self.status === 'goToTarget') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    
    let attackLoc = attack.attackNearestAOE(self);
    
    
    //check if castle is destroyed
    if (self.destroyedCastle === true) {
      self.log(`Killed castle`);
      self.destroyedCastle = false;
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];
      //self.lastAttackedUnit = null;
      //self.status = 'searchAndAttack';

      if (self.knownStructures[otherTeamNum].length > 1) {
        let ln = self.knownStructures[otherTeamNum].length;
        newLoc = [self.knownStructures[otherTeamNum][1].x, self.knownStructures[otherTeamNum][1].y];
      }
      self.log('Next enemy: ' + newLoc);
      let path2 = [];
      let distToTarget2 = 0;
      if (self.planner !== null){
        distToTarget2 = self.planner.search(self.me.y,self.me.x,newLoc[1], newLoc[0],path2);
      }
      else {
        distToTarget2 = qmath$1.unitDist(self.me.x, self.me.y, newLoc[0], newLoc[1]);
      }
      self.log(`Destroyed castle, now going to ${newLoc}`);
      let compressedLocationHash = self.compressLocation(newLoc[0], newLoc[1]);
      //padding hash by 6
      /*
      self.status = 'waitingForFuelStack';
      self.signalToSendAfterFuelIsMet = 6 + compressedLocationHash;
      self.fuelNeeded = fuelNeededForAttack;
      //self.signal(5 + compressedLocationHash, 36);
      self.finalTarget = newLoc;
      self.allowedToMove = false;
      */
      self.status = 'defend';
      //through base.updateKnownStructures, bot sends signal throgh castleTalk to tell castle which castle was probably destroyed.
      //send signal to tell bots to stop moving and wait for fuel stack
      //self.signal(5, 36);
      //self.log(`Initial New target: ${self.finalTarget}`);

      //Send through castle talk the xpos and ypos of the enemy castle destroyed if it was the original target


    }
    //enemy nearby, attack it?
    if (attackLoc !== null) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, attackLoc.x, attackLoc.y);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      self.log(`Preacher Attacks ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        //self.lastAttackedUnit = robotToAttack
        action = self.attack(rels.dx,rels.dy);
        return {action:action};
      }
    }
  }

  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath$1.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 50) ;
    else {
      //stay put
      return '';
    }
  }
  if (self.status === 'goToTarget') ;
  
  //PROCESSING FINAL TARGET
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  if (self.allowedToMove === true){
    let avoidFriends = false;
    let moveFast = true;
    if (self.status === 'attackTarget'){
      avoidFriends = true;
    }
    if (self.me.turn <= 3 && self.status === 'defend') {
      //initially, allow bot to move freely if its not attackinga
      avoidFriends = false;
    }
    self.log(`STAUS:${self.status}`);
    action = self.navigate(self.finalTarget, avoidFriends, moveFast);
  }
  else {
    action = '';
  }
  return {action:action};
}

function moveApart(self) {
  let gameMap = self.map;
  let robotMap = self.getVisibleRobotMap();
  if (self.me.x % 2 === 0 || self.me.y %2 === 0) {
    let closestDist = 99999;
    let bestLoc = null;
    for (let i = 0; i < gameMap.length; i++) {
      for (let j = 0; j < gameMap[0].length; j++) {
        if (i % 2 === 1 && j % 2 === 1){
          if (search.emptyPos(j, i , robotMap, gameMap)){
            let thisDist = qmath$1.dist(self.me.x, self.me.y, j, i);
            if (thisDist < closestDist) {
              closestDist = thisDist;
              bestLoc = [j, i];
            }
          }
        }
      }
    }
    if (bestLoc !== null) {
      self.finalTarget = bestLoc;
    }
  }
}


var preacher = {mind: mind$5};

/* SYSTEM
* We run unit.mind(this) to get decisions
* That returns an object result where
* result.action = the action to be returned
*/

class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    
    this.status = 'justBuilt'; //current status of robot; just built means bot was just built has no prior status
    
    this.target = [0,0]; //current target destination for robot, used for travelling to waypoints
    this.finalTarget = [0,0]; //the final target bot wants to go to
    this.path = []; //path bot follows

    this.knownStructures = {0:[],1:[]}; //contains positions of all the known structures this robot knows. Keys 0 is team 0, key 1 is team1. Each is an array of objects {x:,y:}
    //this.knownStructures[id].team = team the structure is on, .position = [x,y] position array;
    this.knownDeposits = {};
    
    //Counts for number of units we have
    //Available only to castles
    this.castles = 0;
    this.churches = 0;
    this.pilgrims = 0;
    this.crusaders = 0;
    this.prophets = 0;
    this.preachers = 0;
    
    this.buildQueue = []; //queue of what unit to build for castles and churches. First element is the next unit to build.
    
    this.maxPilgrims = 0;
    this.maxCrusaders = 1000;
    
    
    
    
    this.fuelSpots = []; //array of all fuelspots
    this.karboniteSpots = []; //array of all karbonite spots
    this.sentCommand = false;
    this.planner = null; //planner used to navigate
    
    this.allUnits = {}; //array of all units castle can still hear. allUnits[id] is unit type
    //if we no longer hear back from id, we remove it from this list. This is how we keep accurate unit counts
    
  };
  
  turn() {
    
    if (this.me.unit === SPECS.CASTLE) {
      let result = {action:''};
      result = castle.mind(this);
      return result.action;
    }
    else if (this.me.unit === SPECS.CRUSADER) {
      let result = crusader.mind(this);
      return result.action;
    } 
    else if (this.me.unit === SPECS.PILGRIM) {
      let result = pilgrim.mind(this);
      //this.status = result.status;
      //this.target = result.target;
      return result.action;
    }
    else if (this.me.unit === SPECS.CHURCH) {
      let result = church.mind(this);
      //this.status = result.status;
      //this.target = result.target;
      return result.action;
    }
    else if (this.me.unit === SPECS.PROPHET) {
      let result = prophet.mind(this);
      //this.status = result.status;
      //this.target = result.target;
      return result.action;
    }
    else if (this.me.unit === SPECS.PREACHER) {
      let result = preacher.mind(this);
      //this.status = result.status;
      //this.target = result.target;
      return result.action;
    }
    //this.log(`Turn took ${endTime - startTime} ms`);
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
    let dist2 = qmath$1.distDelta(dx, dy);
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
    this.log(`I have ${this.fuel} fuel, need ${fuelCost}`);
    if (this.fuel >= fuelCost) {
      return true;
    }
  }
  /*
  * Sets the robots finalTarget key and also plans new path. After setting this, if the robot mind hasn't decided to perform an action earlier, it will always move towards this target accordingly. This doesn't need to be run because each unit uses navigate to run
  * @param{[px,py]} newTarget - array of position of new target
  */
  setFinalTarget(newTarget) {
    this.finalTarget = newTarget;
    let path = [];
    //this.log(`New Path`);
    if (this.planner !== null) {
      this.planner.search(this.me.y,this.me.x,newTarget[1],newTarget[0],path);
    }
    else {
      //this.log('using ez')
      path = [this.me.y,this.me.x, newTarget[1], newTarget[0]];
    }
    path.shift();
    path.shift();
    //this.log(`My path: ${path}`);
    this.path = path;
    this.target[1] = path.shift();
    this.target[0] = path.shift();
  }

  /*
  * Returns the action that leads the bot to the final target using the planner
  * @param{[x,y]} finalTarget - An array of the position of the target the bot wants to navigate to
  * @param{boolean} avoidFriends - whether or not to move to 
  */
  navigate(finalTarget, avoidFriends = false, fast = true) {
    if (finalTarget !== null){
      this.setFinalTarget(finalTarget);
      let action = '';
      if (this.path.length > 0) {
        let distLeftToSubTarget = qmath$1.dist(this.me.x, this.me.y, this.target[0], this.target[1]);
        if (distLeftToSubTarget <= 1){
          this.target[1] = this.path.shift();
          this.target[0] = this.path.shift();
        }
      }
      if (this.target) {
        let rels = base.relToPos(this.me.x, this.me.y, this.target[0], this.target[1], this, avoidFriends, fast);
        if (rels.dx === 0 && rels.dy === 0) {
          action = '';
        }
        else {
          action = this.move(rels.dx, rels.dy);    
        }
      }
      return action;
    }
    return '';
  }
  /*
  * Returns the nearest enemy unit
  *
  */
  
  /*
  * Returns the map location given a compressed location value
  * @param{num} hash - The compressed location
  */
  getLocation(hash) {
    let xpos = hash % this.map[0].length;
    let ypos = (hash - xpos) / this.map[0].length;
    //this.log(`Xy:${xpos}, ${ypos}`)
    return {x:xpos, y:ypos};
    //hash is now a value from 0 to 4095, representing every possible map location
  }
  /*
  * Compresses a location into a number between 0 and 4095
  * @param{num} x - Xpos
  * @param{num} y - Ypos
  */
  compressLocation(x,y) {
    return x + y * this.map[0].length;
  }
  
  /*
  * Finds and stores enemy castle and friendly castle to this.knownStructures, to be used upon initialization. MUST HAVE SYMMETRY DETERMINED BEFORE HAND
  *
  *
  */
  initializeCastleLocations() {
    let possibleCastlePositions = search.circle(this, this.me.x, this.me.y, 2);
    let robotMap = this.getVisibleRobotMap();
    let nextToCastle = false;
    for (let i = 0; i < possibleCastlePositions.length; i++) {
      let px = possibleCastlePositions[i][0];
      let py = possibleCastlePositions[i][1];

      let castleRobot = this.getRobot(robotMap[py][px]);
      if (castleRobot !== null && castleRobot.unit === SPECS.CASTLE) {
        this.knownStructures[this.me.team].push({x:castleRobot.x, y:castleRobot.y, unit: 0});
        nextToCastle = true;
        break;
      }
    }
    if (nextToCastle === false ){
      this.knownStructures = {0:[], 1:[]};
      return false;
    }
    let cx = this.knownStructures[this.me.team][0].x;
    let cy = this.knownStructures[this.me.team][0].y;
    
    let exploreTarget = null;
    if (this.mapIsHorizontal) {
      exploreTarget = [cx, this.map.length - cy - 1];
    }
    else {
      exploreTarget = [this.map[0].length - cx - 1, cy];
    }
    if (exploreTarget !== null) {
      this.knownStructures[(this.me.team + 1) % 2].push({x:exploreTarget[0], y:exploreTarget[1], unit: 0});
      return true;
    }
    else {
      return false; //not at castle
    }
    
  }
  
  /*
  * Returns the best move a bot should take in order to maximize distance away from the provided enemy locations
  * 
  */
  avoidEnemyLocations(enemyPositionsToAvoid) {
    let avoidLocs = [];
    let robotMap = this.getVisibleRobotMap();
    if (enemyPositionsToAvoid.length > 0){

      let positionsToGoTo = search.circle(this, this.me.x, this.me.y, 4);
      for (let i = 0; i < positionsToGoTo.length; i++) {
        let thisSumDist = 0;
        let pos = positionsToGoTo[i];
        if (search.emptyPos(pos[0], pos[1], robotMap, this.map)){
          for (let j = 0; j < enemyPositionsToAvoid.length; j++) {
            thisSumDist += qmath$1.dist(pos[0], pos[1], enemyPositionsToAvoid[j][0], enemyPositionsToAvoid[j][1]);
          }
          avoidLocs.push({pos:pos, dist:thisSumDist});
        }
      }
    }
    if (avoidLocs.length > 0) {
      //FORCE A MOVE AWAY

      avoidLocs.sort(function(a,b) {
        return b.dist - a.dist;
      });
      let rels = base.rel(this.me.x, this.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
      return rels;
    }
    else {
      return null;
    }
  }
  
  
}

var robot = new MyRobot();
robot.log(`New Bot: ${robot.id}`);
var robot = new MyRobot();
