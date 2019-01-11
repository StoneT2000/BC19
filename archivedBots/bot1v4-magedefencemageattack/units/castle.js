import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import signal from '../signals.js';
import qmath from '../math.js'
function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  
  let action = '';
  let forcedAction = null;
  
  
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
    self.maxPilgrims = Math.ceil(numFuelSpots/3);
    

    
    self.status = 'build';
    
    
    //Here, we initialize self.AllUnits to contain ids of all the castles
    let locCastleNum = 0;
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
      
      //because we receive castle information first, locCastleNum < self.castles makes sure the messages received are just castles sending 0's or alive signals
      if (msg === 0 && locCastleNum < self.castles) {
        self.allUnits[robotsInVision[i].id] = 0;
        locCastleNum +=1;
      }
    }
    
    //only first castle builds pilgrim in 3 preacher defence strategy
    if (self.castles === 3) {
      //only first castle builds pilgrim in 3 preacher defence strategy
      if (offsetVal === 0) {
        self.buildQueue.push(2,5, 5);
      }
      else if (offsetVal === 1){
        self.buildQueue.push(5,-1, 5);
      }
      else if (offsetVal === 2) {
        self.buildQueue.push(5,-1, 5);
      }
    }
    else if (self.castles === 2) {
      if (offsetVal === 0) {
        self.buildQueue.push(2,5, 5);
      }
      else if (offsetVal === 1) {
        self.buildQueue.push(5, 5, 5);
      }
    }
    else if (self.castles === 1) {
      self.buildQueue.push(2,5,5,5);
    }
    
    
  }
  
  
  
  //check for signals in castle talk
  
  let idsWeCanHear = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk; //msg through castle talk
    let signalmsg = robotsInVision[i].signal; //msg through normal signalling
    
    idsWeCanHear.push(robotsInVision[i].id);
    
    let orobot = robotsInVision[i];
    
    signal.processMessageCastleTalk(self, msg, robotsInVision[i].id);
    if (signalmsg === 4) {
      //pilgrim is nearby, assign it new mining stuff if needed
      if (self.status === 'pause') {
        self.signal(3,2)
      }
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
  
  
  //Accurate numbers as of the end of the last round
  self.log(`Round ${self.me.turn}: Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}, Prophets: ${self.prophets}, Preachers: ${self.preachers}`);
  
  //Commands code:
  //Here, castles give commands to surrounding units?
  //Give commands to rally units to attack a known castle
  //Give commands to pilgrims who then relay the message to other units?
  
  
  let crusadersInVincinity = [];
  let pilgrimsNearby = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.unit === SPECS.CRUSADER) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit <= 4) {
        crusadersInVincinity.push(obot);
      }
    }
    else if (obot.unit === SPECS.PILGRIM) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit <= 2) {
        pilgrimsNearby.push(obot);
      }
    }
  }
  
  //if we have at least 3 crusaders, let them attack, basically sending a warcry lmao
  if (crusadersInVincinity.length >= 3) {
    //self.signal(1, 4);
    //self.sentCommand = true;
  }
  
  //building code
  if (self.status === 'build') {
    let adjacentPos = search.circle(self.me.x, self.me.y, 2);
    self.log(`BuildQueue: ${self.buildQueue}`)
    for (let i = 1; i < adjacentPos.length; i++) {
      let checkPos = adjacentPos[i];
      //prioritize building direction in future?

      if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){
        //self.log(`${self.buildQueue}`)

        if (self.buildQueue.length > 0 && self.buildQueue[0] !== -1 && enoughResourcesToBuild(self, self.buildQueue[0])) {
          //build the first unit put into the build queue
          let unit = self.buildQueue.shift(); //remove that unit
          
          
          
          if (self.buildQueue[self.buildQueue.length-1] === 2){
            self.buildQueue.push(5,5);
          }
          else if (self.pilgrims <= self.maxPilgrims){
            self.buildQueue.push(2);
          }
          else {
            self.buildQueue.push(5,5);
          }
          if (unit === 3) {
            //send an initial signal?
          }
          action = self.buildUnit(unit, search.bfsDeltas[2][i][0], search.bfsDeltas[2][i][1]);
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
  
  //if status is pause, that means we are stacking fuel, so send signal to nearby pilgrims to mine fuel
  if (self.status === 'pause'){
    
  }
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  return {action: '', status: 'build', response:''};
}

//returns true if unit can build on that location
function canBuild(self, xpos, ypos, robotMap, passableMap) {
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

export default {mind}