import {BCAbstractRobot, SPECS} from 'battlecode';
import castle from './bot1/units/castle.js';
import church from './bot1/units/church.js';
import pilgrim from './bot1/units/pilgrim.js';
import crusader from './bot1/units/crusader.js';
import prophet from './bot1/units/prophet.js';
import preacher from './bot1/units/preacher.js';
import qmath from './bot1/math.js';
import search from './bot1/search.js'
import base from './bot1/base.js';

let botTargets = [];

//REMEMBER, NO GLOBAL VARIABLES
let unitTypesStr = ['Castle', 'Church', 'Pilgrim', 'Crusader', 'Prophet', 'Preacher'];

let status = '';

let maxPilgrims = 3;
let myPilgrims = 0;
let pilgrims = 0;



let maxCrusader = 3;
let myCrusaders = 0; //crusaders this castle has spawned
let crusaders = 0; //total crusaders *approx?
let numCastles = 0;


/* SYSTEM
* We run unit.mind(this) to get decisions
* That returns an object result where
* result.action = the action to be returned
* result.status = new status the bot should take. status = null means no change
* result.target = new target the bot should take
* result.response = a response to what was given
*/

class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    this.status = 'justBuilt'; //current status of robot; just built means bot was just built has no prior status
    this.target = [0,0]; //current target destination for robot, used for travelling to waypoints
    this.finalTarget = [0,0]; //the final target bot wnats to go to
    this.path = [];
    this.waypointMap = []; //stores waypoints
    this.waypointEdges = []; //stores edges connecting waypoints. an edge exists if there is a direct clear easy path from one way point to the other
    //note, this waypointMap and Edges is basically a connected graph. Also, for different units the way points are different because some units can move farther. using different waypoints will take advantage of the fact that units can jump over walls.
    //maybe just let castles calculate the waypoints, and then let it communicate the map to everyone)
    this.knownStructures = {0:[],1:[]}; //contains positions of all the known structures this robot knows. Keys 0 is team 0, key 1 is team1. Each is an array of objects {x:,y:}
    //this.knownStructures[id].team = team the structure is on, .position = [x,y] position array;
    this.knownDeposits = {};
    this.churches = 0;
    this.pilgrims = 0;
    this.maxPilgrims = 0;
    this.buildQueue = []; //queue of what unit to build for castles and churches
    this.maxCrusaders = 1000;
    this.crusaders = 0;
    this.preachers = 0;
    this.prophets = 0;
    this.castles = 0;
    this.fuelSpots = [];
    this.karboniteSpots = [];
    this.sentCommand = false;
    this.planner = null;
    
    this.allUnits = {}; //array of all units castle can still hear. allUnits[id] is unit type
    //if we no longer hear back from id, we remove it from this list, reduce pilgrims count
    
  };
  
  turn() {
    let unitType = '';
    //this.log(`Turn ${this.me.turn}: ID: ${this.id} Unit Type: ${unitTypesStr[this.me.unit]}`);
    let startTime = new Date();
    
    if (this.me.unit === SPECS.CASTLE) {
      let result = {action:''};
      result = castle.mind(this);
      this.status = result.status;
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
  * Sets the robots finalTarget key and also plans new path. After setting this, if the robot mind hasn't decided to perform an action earlier, it will always move towards this target accordingly
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
  navigate(finalTarget) {
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
      let rels = base.relToPos(this.me.x, this.me.y, this.target[0], this.target[1], this);
      if (rels.dx === 0 && rels.dy === 0) {
        action = ''
      }
      else {
        action = this.move(rels.dx, rels.dy);    
      }
    }
    return action;
  }
  
}

var robot = new MyRobot();
robot.log(`New Bot: ${robot.id}`)