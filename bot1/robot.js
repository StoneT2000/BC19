import {BCAbstractRobot, SPECS} from 'battlecode';
import castle from './bot1/units/castle.js';
import pilgrim from './bot1/units/pilgrim.js';
import crusader from './bot1/units/crusader.js';
import qmath from './bot1/math.js';
import search from './bot1/search.js'


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
    let unitType = '';
    //this.log(`Turn ${this.me.turn}: ID: ${this.id} Unit Type: ${unitTypesStr[this.me.unit]}`);

    
    if (this.me.unit === SPECS.CASTLE) {
      let result = {action:''};
      result = castle.mind(this);
      this.status = result.status;

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
    let dist2 = qmath.dist(dx, dy);
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
robot.log(`New Bot: ${robot.id}`)