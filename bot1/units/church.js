import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';

function mind(self){
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  let forcedAction = null;
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
    signal.processMessageChurch(self, msg);
    let signalmsg = robotsInVision[i].signal;
    if (msg === 4) {
      //pilgrim is nearby, assign it new mining stuff if needed
      if (self.status === 'pause' || (self.fuel <= 400)) {
        self.log(`Church tried to tell nearby pilgrims to mine fuel`);
        self.signal(3,2)
      }
    }
  }
  self.status = 'build';
  
  /* Watch for enemies */
  let sawEnemyThisTurn = false;
  let nearestEnemyLoc = null
  let closestEnemyDist = 1000;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.unit === SPECS.CRUSADER) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    else if (obot.unit === SPECS.PREACHER) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      
    }
    else if (obot.unit === SPECS.PROPHET) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    if (obot.team === otherTeamNum) {
      //sees enemy unit, send our units to defend spot
      if (obot.unit !== SPECS.PILGRIM){
        let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToUnit < closestEnemyDist) {
          nearestEnemyLoc = {x: obot.x, y: obot.y};
          closestEnemyDist = distToUnit
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
    if (self.karbonite >= 200) {
      self.buildQueue.push(4, 4, 5);
    }
    else {
      
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
    
    self.log(`BuildQueue: ${self.buildQueue}`)
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
        
        if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

          if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
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
  
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  return {action:action}; 
}
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