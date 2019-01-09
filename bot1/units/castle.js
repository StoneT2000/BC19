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
  
  self.log(`Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}`);
  
  //Initialization code for the castle
  if (self.me.turn === 1){
    
    
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
    self.buildQueue.push(2);
    
    self.status = 'build';
    
  }
  
  
  
  //check for signals in castle talk
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    //self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
    signal.processMessageCastle(self, msg);
  }
  
  //Commands code:
  //Here, castles give commands to surrounding units?
  //Give commands to rally units to attack a known castle
  //Give commands to pilgrims who then relay the message to other units?
  
  
  let crusadersInVincinity = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.unit === SPECS.CRUSADER) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit <= 4) {
        crusadersInVincinity.push(obot);
      }
    }
  }
  
  //if we have at least 3 crusaders, let them attack, basically sending a warcry lmao
  if (crusadersInVincinity.length >= 3) {
    self.signal(1, 4);
    self.sentCommand = true;
  }
  
  //building code
  if (self.status === 'build') {
    let adjacentPos = search.circle(self.me.x, self.me.y, 1);
    for (let i = 1; i < adjacentPos.length; i++) {
      let checkPos = adjacentPos[i];
      //prioritize building direction in future?

      if(canBuild(checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

        if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
          //build the first unit put into the build queue
          let unit = self.buildQueue.shift(); //remove that unit
          
          
          
          if (unit === 2){
            self.buildQueue.push(3,3,3,3);
          }
          else if (self.pilgrims <= self.maxPilgrims){
            self.buildQueue.push(2);
          }
          else {
            self.buildQueue.push(3);
          }
          if (unit === 3) {
            //send an initial signal?
          }
          action = self.buildUnit(unit, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]);
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
  if (self.status === 'pause'){
    
  }

  return {action: '', status: 'build', response:''};
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

export default {mind}