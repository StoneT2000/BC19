import {BCAbstractRobot, SPECS} from 'battlecode';
import castle from './bot1/units/castle.js';
import pilgrim from './bot1/units/pilgrim.js';
import crusader from './bot1/units/crusader.js';



let botTargets = [];

//REMEMBER, NO GLOBAL VARIABLES
let unitTypesStr = ['Castle', 'Church', 'Pilgrim', 'Crusader', 'Prophet', 'Preacher'];

let status = '';

let maxPilgrims = 4;
let myPilgrims = 0;

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
  };
  
  turn() {
    let unitType = '';
    this.log(`Turn ${this.me.turn}: ID: ${this.id} Unit Type: ${unitTypesStr[this.me.unit]}`);

    
    if (this.me.unit === SPECS.CASTLE) {
      let result ={action:''};
      if (myPilgrims < maxPilgrims){
        this.status = 'buildPilgrim';
        result = castle.mind(this);
        if (result.response === 'built') {
          myPilgrims += 1;
        }
      }
      else {
        this.status = 'buildCrusader';
        result = castle.mind(this);
      }
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
}

var robot = new MyRobot();
robot.log(`New Bot: ${robot.id}`)