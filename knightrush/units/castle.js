import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import signal from '../signals.js';
import qmath from '../math.js'
import base from '../base.js'
function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  let gameMap = self.map;
  let action = '';
  let forcedAction = null;
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
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    
    
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
          let distToKarb = qmath.dist(j, i, self.me.x, self.me.y);
          if (distToKarb < closestKarboniteDist) {
            closestKarboniteDist = distToKarb
            closestKarbonitePos = [j, i];
          }
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
    
    
    //INITIAL BUILDING STRATEGIES
    //only first castle builds pilgrim in 3 preacher defence strategy
    if (self.castles === 3) {
      //only first castle builds pilgrim in 3 preacher defence strategy
      if (offsetVal === 0) {
        self.buildQueue.push(3,3, 3, 3, 3, 2);
      }
      else if (offsetVal === 1){
        self.buildQueue.push(-1,-1, -1, -1, -1, 2);
      }
      else if (offsetVal === 2) {
        self.buildQueue.push(-1,-1, -1, -1, -1, 2);
      }
    }
    else if (self.castles === 2) {
      if (offsetVal === 0) {
        self.buildQueue.push(3,3,3,3,3,2);
      }
      else if (offsetVal === 1) {
        self.buildQueue.push(-1, -1, -1, 2, 3, 3);
      }
    }
    else if (self.castles === 1) {
      self.buildQueue.push(3,3,3,3,3,2);
    }
    
    
    //find enemy castle
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    let enemyCastle = null;
    if (self.mapIsHorizontal) {
      enemyCastle = [self.me.x, gameMap.length - self.me.y - 1];
    }
    else {
      enemyCastle = [gameMap[0].length - self.me.x - 1, self.me.y];
    }
    self.knownStructures[otherTeamNum].push({x:enemyCastle[0], y:enemyCastle[1], unit: 0});
    
    
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
        tempPos.push({pos:allAdjacentPos[i], dist:qmath.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    //sort by shortest distance to enemy
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    
    self.buildingAttackUnitPositions = tempPos.map(function(a){
      return a.pos;
    })
    self.log('Attack build pos: '+ self.buildingAttackUnitPositions);
    
    tempPos = [];
    desiredX = closestKarbonitePos[0];
    desiredY = closestKarbonitePos[1];
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    
    //sort by shortest distance to karbonite
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    self.buildingPilgrimPositions = tempPos.map(function(a){
      return a.pos;
    })
    self.log('Pilgrim build pos: ' + self.buildingPilgrimPositions);
  }
  
  
  //BY DEFAULT CASTLE ALWAYS BUILDS UNLESS TOLD OTHERWISE:
  self.status = 'build';
  
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
  self.log(`Round ${self.me.turn}: Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}, Prophets: ${self.prophets}, Preachers: ${self.preachers}, Fuel:${self.fuel}, Karbonite: ${self.karbonite}`);
  
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
    
    self.log(`BuildQueue: ${self.buildQueue}`)
    if (self.buildQueue[0] !== -1){
      
      let adjacentPos = [];//search.circle(self, self.me.x, self.me.y, 2);
      if (self.buildQueue[0] === 2){
        adjacentPos = self.buildingPilgrimPositions
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
  if (self.status === 'pause'){
    
  }
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
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

export default {mind}