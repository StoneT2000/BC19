import {BCAbstractRobot, SPECS} from 'battlecode';
import castle from './magerush/units/castle.js';
import church from './magerush/units/church.js';
import pilgrim from './magerush/units/pilgrim.js';
import crusader from './magerush/units/crusader.js';
import prophet from './magerush/units/prophet.js';
import preacher from './magerush/units/preacher.js';
import qmath from './magerush/math.js';
import search from './magerush/search.js'
import base from './magerush/base.js';


//REMEMBER, NO GLOBAL VARIABLES
let unitTypesStr = ['Castle', 'Church', 'Pilgrim', 'Crusader', 'Prophet', 'Preacher'];


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
    //this.log(`Turn ${this.me.turn}: ID: ${this.id} Unit Type: ${unitTypesStr[this.me.unit]}`);
    let startTime = new Date();
    
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
    let endTime = new Date();
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
    let dist2 = qmath.distDelta(dx, dy);
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
  *
  */
  navigate(finalTarget, avoidFriends = false, fast = true) {
    if (finalTarget !== null){
      this.setFinalTarget(finalTarget);
      let action = '';
      if (this.path.length > 0) {
        let distLeftToSubTarget = qmath.dist(this.me.x, this.me.y, this.target[0], this.target[1]);
        if (distLeftToSubTarget <= 1){
          this.target[1] = this.path.shift();
          this.target[0] = this.path.shift();
        }
      }
      if (this.target) {
        let rels = base.relToPos(this.me.x, this.me.y, this.target[0], this.target[1], this, avoidFriends, fast);
        if (rels.dx === 0 && rels.dy === 0) {
          action = ''
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
    for (let i = 0; i < possibleCastlePositions.length; i++) {
      let px = possibleCastlePositions[i][0];
      let py = possibleCastlePositions[i][1];

      let castleRobot = this.getRobot(robotMap[py][px]);
      if (castleRobot !== null && castleRobot.unit === SPECS.CASTLE) {
        this.knownStructures[this.me.team].push({x:castleRobot.x, y:castleRobot.y, unit: 0});
        break;
      }
    }
    
    let cx = this.knownStructures[this.me.team][0].x;
    let cy = this.knownStructures[this.me.team][0].y;
    let exploreTarget = [this.map[0].length - this.me.x - 1, this.map.length - this.me.y - 1];
    if (this.mapIsHorizontal) {
      exploreTarget = [cx, this.map.length - cy - 1];
    }
    else {
      exploreTarget = [this.map[0].length - cx - 1, cy];
    }
    
    this.knownStructures[(this.me.team + 1) % 2].push({x:exploreTarget[0], y:exploreTarget[1], unit: 0});
  }
}

var robot = new MyRobot();
robot.log(`New Bot: ${robot.id}`)