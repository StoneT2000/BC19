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
    self.buildQueue = [];
    
    self.churchNeedsProtection = false;
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    if (!self.mapIsHorizontal) {
      self.halfPoint = gameMap[0].length/2;
      if (self.me.x < gameMap[0].length/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }
      //self.log(`Half x: ${self.halfPoint}, i'm on lower half:${self.lowerHalf}`);
    }
    else {
      self.halfPoint = gameMap.length/2;
      if (self.me.y < gameMap.length/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }
      //self.log(`Half y: ${self.halfPoint}, i'm on lower half:${self.lowerHalf}`);
    }
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
    
    
    //determine if the church is in danger
    let closestDepositDist = 99999;
    for (let i = 0; i < self.fuelSpots.length; i++) {
      //self.log(`checking ${self.fuelSpots[i].x}, ${self.fuelSpots[i].y}`)
      if (ownHalf(self, self.fuelSpots[i].x, self.fuelSpots[i].y) === false){
        let distToDeposit = qmath.dist(self.fuelSpots[i].x, self.fuelSpots[i].y, self.me.x, self.me.y);
        if (distToDeposit < closestDepositDist) {
          closestDepositDist = distToDeposit;
        }
      }
    }
    for (let i = 0; i < self.karboniteSpots.length; i++) {
      //self.log(`checking ${self.karboniteSpots[i].x}, ${self.karboniteSpots[i].y}`)
      if (ownHalf(self, self.karboniteSpots[i].x, self.karboniteSpots[i].y) === false){
        let distToDeposit = qmath.dist(self.karboniteSpots[i].x, self.karboniteSpots[i].y, self.me.x, self.me.y);
        if (distToDeposit < closestDepositDist) {
          closestDepositDist = distToDeposit;
        }
      }
    }
    self.log(`Closest dist: ${closestDepositDist}`)
    if (closestDepositDist <= 256) {
      self.churchNeedsProtection = true;
      self.castleTalk(75);
    }
    //self.log(`Churche in danger: ${self.churchNeedsProtection}`);
    let numFuelSpots = self.fuelSpots.length;
    self.maxPilgrims = Math.ceil((self.fuelSpots.length + self.karboniteSpots.length)/2);
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessageChurch(self, msg);
    let signalmsg = robotsInVision[i].signal;
    if (msg === 4) {
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
      if (true){
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
    let unitsInVincinity = search.unitsInRadius(self, 8);
    let unitsInVincinity100 = search.unitsInRadius(self, 100);
    //keep karbonite in stock so we can spam mages out when needed
    if (self.sawEnemyLastTurn === true) {
      //self.signal(16391, 64); //tell everyone to defend
      self.buildQueue = [];
    }
    if (self.karbonite >= 200) {
      /*
      if (unitsInVincinity[SPECS.PROPHET].length < 4){
        self.buildQueue = [4]
      }
      else if (unitsInVincinity[SPECS.PREACHER].length >= 3) {
        self.buildQueue = [4];
      }
      else {
        self.buildQueue = [5];
      }
      */
    }
    
    if (self.karbonite > 120 && self.fuel >= unitsInVincinity100[SPECS.PROPHET].length * 60){
      if (self.churchNeedsProtection === true){
        self.log(`Building prophet`)
        self.buildQueue = [4];
        //self.castleTalk(75)
      }
    }
    if (self.karbonite >= 50) {
      if (unitsInVincinity[SPECS.PILGRIM].length < numberOfDeposits(self, self.me.x, self.me.y)){
        self.buildQueue = [2];
      }

      
    }
    self.sawEnemyLastTurn = false;
  }
  else {
    let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
    //self.signal(12294 + compressedLocationHash, 36);
    //self.log(`Nearest to castle is ${nearestEnemyLoc.x}, ${nearestEnemyLoc.y}`);
    self.sawEnemyLastTurn = true;
    //self.buildQueue.unshift(5);
    self.buildQueue.unshift(4);
    
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

function ownHalf(self, nx, ny) {
  let gameMap = self.map;
  //self.log()
  if (!self.mapIsHorizontal) {
    if (self.lowerHalf) {
      if (nx < gameMap[0].length/2) {
        //self.log(`X:${nx}, ${ny} is on our half`)
        return true;
      }
    }
    else {
      if (nx >= gameMap[0].length/2) {
        //self.log(`X:${nx}, ${ny} is on our half`)
        return true;
      }
    }
  }
  else {
    if (self.lowerHalf) {
      if (ny < gameMap.length/2) {
        //self.log(`Y:${nx}, ${ny} is on our half`)
        return true;
      }
    }
    else {
      if (ny >= gameMap.length/2) {
        //self.log(`Y:${nx}, ${ny} is on our half`)
        return true;
      }
    }
  }
  return false;
}
export default {mind}