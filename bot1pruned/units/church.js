import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';

function mind(self){
  let gameMap = self.map;
  let mapLength = self.map.length;
  let otherTeamNum = (self.me.team + 1) % 2;
  let forcedAction = null;
  let action = '';
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  let robotsMapInVision = self.getVisibleRobotMap();
  let robotMap = self.getVisibleRobotMap();
  let passableMap = self.map;
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    self.buildQueue = [];
    self.builtDirect = false;
    self.pastChurchChain = false;
    self.churchAttackLoc = null;
    self.occupiedHalf = null;
    self.churchNeedsProtection = false;
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    if (!self.mapIsHorizontal) {
      self.halfPoint = mapLength/2;
      if (self.me.x < mapLength/2){
        self.lowerHalf = true;
      }
      else {
        self.lowerHalf = false;
      }
    }
    else {
      self.halfPoint = mapLength/2;
      if (self.me.y < mapLength/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }
    }
    
    let closestKarbonitePos = null;
    let closestKarboniteDist = 999999;
    for (let i = 0; i < mapLength; i++) {
      for (let j = 0; j < mapLength; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'fuel'});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'karbonite'});
          let distToKarb = qmath.dist(j, i, self.me.x, self.me.y);
          if (distToKarb < closestKarboniteDist) {
            closestKarboniteDist = distToKarb
            closestKarbonitePos = [j, i];
          }
        }
      }
    }
    
    
    let closestDepositDist = 99999;
    for (let i = 0; i < self.fuelSpots.length; i++) {
      if (ownHalf(self, self.fuelSpots[i].x, self.fuelSpots[i].y) === false){
        let distToDeposit = qmath.dist(self.fuelSpots[i].x, self.fuelSpots[i].y, self.me.x, self.me.y);
        if (distToDeposit < closestDepositDist) {
          closestDepositDist = distToDeposit;
        }
      }
    }
    for (let i = 0; i < self.karboniteSpots.length; i++) {
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
      self.buildQueue = [4];
    }
    let numFuelSpots = self.fuelSpots.length;
    self.maxPilgrims = Math.ceil((self.fuelSpots.length + self.karboniteSpots.length)/2);
    
    self.enemyDirection = self.determineEnemyDirection();
    self.buildingAttackUnitPositions = [];
    self.setBuildTowardsEnemyDirections(self);
    
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    if (robotsInVision[i].team === self.me.team) {
      
      if (msg >= 33099 && msg <= 41290 && self.pastChurchChain === false) {
        let padding = 33099;
        if (msg >= 37195) {
          padding = 37195;
        }
        let enemyPos = self.getLocation(msg - padding);
        base.logStructure(self, enemyPos.x, enemyPos.y, otherTeamNum, 0);
        let ox = enemyPos.x;
        let oy = enemyPos.y
        if (self.mapIsHorizontal) {
          oy = mapLength - oy - 1;
        }
        else {
          ox = mapLength - ox - 1;
        }
        base.logStructure(self, ox, oy, self.me.team, 0);
        self.enemyDirection = self.determineEnemyDirection(ox, oy);
        let needsdefence = false;
        if (self.mapIsHorizontal) {
          if (oy <= mapLength/2 && self.me.y > mapLength/2) {
            needsdefence = true;
            self.lowerHalf = !self.lowerHalf
          }
          else if (oy >= mapLength/2 && self.me.y < mapLength/2) {
            needsdefence = true;
            self.lowerHalf = !self.lowerHalf
          }
        }
        else {
          if (ox <= mapLength/2 && self.me.x > mapLength/2) {
            needsdefence = true;
            self.lowerHalf = !self.lowerHalf
          }
          else if (ox >= mapLength/2 && self.me.x < mapLength/2) {
            needsdefence = true;
            self.lowerHalf = !self.lowerHalf
          }
        }
        if (needsdefence === true){
          self.churchNeedsProtection = needsdefence;
        }
        self.log(`Church on own half: ${ownHalf(self,self.me.x, self.me.y)}`);
        if (padding === 37195) {
          self.status = 'churchchain';
          self.churchNeedsProtection = false;
          self.churchAttackLoc = [enemyPos.x, enemyPos.y];
        }
      }
      else if (msg === 41291) {
        if (self.status === 'churchchain'){
          self.buildQueue = [5];
          self.signal(41291, 4);
          self.status = 'spampreachers';
          self.pastChurchChain = true;
        }
      }
    }
    
  }
  
  
  
  
  let sawEnemyThisTurn = false;
  let nearestEnemyLoc = null
  let closestEnemyDist = 1000;
  let closestEnemyType = null;
  let sawChurch = false;
  let sawCrusader = false;
  let sawProphet = false;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.team === otherTeamNum) {
      if (obot.unit === SPECS.CHURCH) {
        sawChurch = true;
      }
      else if (obot.unit === SPECS.CRUSADER) {
        sawCrusader = true;
      }
      else if (obot.unit === SPECS.PROPHET) {
        sawProphet = true;
      }
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit < closestEnemyDist) {
        nearestEnemyLoc = {x: obot.x, y: obot.y};
        closestEnemyDist = distToUnit
        closestEnemyType = obot.unit;
        sawEnemyThisTurn = true;
      }
    }
  }
  
  if (self.status === 'churchchain') {
    
    let padding = 37195;
    if (self.karbonite <= 500 || self.fuel <= 6100) {
      padding = 33099;
      self.buildQueue = [5];
      self.signal(41291, 4);
    }
    else {
      if (self.churchAttackLoc !== null) {
        let msg = self.compressLocation(self.churchAttackLoc[0], self.churchAttackLoc[1]);
        self.signal(padding + msg, 4);
      }
      self.buildQueue = [2];
    }
    
   
    
    
    
  }
  else if (self.status === 'spampreachers') {
    if (self.karbonite < 30 || self.fuel < 4000) {
      self.status = 'build';
      self.pastChurchChain = false;
    }
    else {
      self.buildQueue = [5];
      if (nearestEnemyLoc !== null){
        let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
        let padding = 41292;
        self.signal(padding + compressedLocationHash, 64);
      }
      else {
        self.buildQueue = [4];
      }
    }
  }
  else {
    self.status = 'build';
  }
  
  
  
  if (self.status !== 'churchchain' && self.status !== 'spampreachers'){
    if (sawEnemyThisTurn === false) {
      let unitsInVincinity = search.unitsInRadius(self, 8);
      let unitsInVincinity100 = search.unitsInRadius(self, 100);
      if (self.sawEnemyLastTurn === true) {
        self.signal(16391, 64);
        self.buildQueue = [];
      }

      if (self.karbonite >= 125 && self.fuel >= (unitsInVincinity100[SPECS.PROPHET].length + unitsInVincinity100[SPECS.PREACHER].length) * 60 && unitsInVincinity100[SPECS.PROPHET].length < 12){
        if (self.churchNeedsProtection === true){
          self.buildQueue = [4];
        }
      }

      self.sawEnemyLastTurn = false;


      if (self.karbonite >= 50 && self.builtDirect === false) {
        let buildPilgrim = false;
        let buildLoc = null;
        let checkPositions = search.circle(self, self.me.x, self.me.y, 2);
        for (let i = 0; i < checkPositions.length; i++) {
          let cx = checkPositions[i][0];
          let cy = checkPositions[i][1];
          let robotThere = self.getRobot(robotMap[cy][cx]);
          if ((fuelMap[cy][cx] === true || karboniteMap[cy][cx] === true) && (robotThere === null)) {
            buildPilgrim = true;
            buildLoc = [cx, cy];
            break;
          }
        }
        if (buildLoc === null) {
          self.builtDirect = true;
        }


        if (buildPilgrim === true){
          if (enoughResourcesToBuild(self, 2)){
            self.buildQueue = [];

            let val = getIndexAllSpots(self, buildLoc);
            if (self.turn > 1){
              self.castleTalk(77 + val);
            }
            let rels = base.rel(self.me.x, self.me.y, buildLoc[0], buildLoc[1]);
            if (self.knownStructures[otherTeamNum].length) {
              let nx = self.knownStructures[otherTeamNum][0].x;
              let ny = self.knownStructures[otherTeamNum][0].y;
              let msg = self.compressLocation(nx, ny);
              let padding = 33099;
              self.signal(padding + msg, 2);
            }

            action = self.buildUnit(2, rels.dx, rels.dy);
            return {action:action};
          }
        }


      }

    }
    else {
      let unitsInVincinity36 = search.unitsInRadius(self, 36);
      let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
      let padding = 12294;
      if (closestEnemyType === SPECS.PROPHET || closestEnemyType === SPECS.PILGRIM || closestEnemyType === SPECS.CHURCH) {
        padding = 20488;
      }
      self.signal(padding + compressedLocationHash, 64);
      self.sawEnemyLastTurn = true;


      if ((sawChurch || sawCrusader) && unitsInVincinity36[SPECS.PREACHER].length < 1){
        if (self.fuel >= 50 && self.karbonite >= 30){
          self.buildQueue.unshift(5);
        }
        else {
          self.buildQueue.unshift(4);
        }
      }
      else {
        self.buildQueue.unshift(4);
      }

    }
  }
  
  
  //DECISION MAKING
  if (self.status === 'build' || self.status === 'churchchain' || self.status === 'spampreachers') {
    
    if (self.buildQueue[0] !== -1){
      
      let adjacentPos = search.circle(self, self.me.x, self.me.y, 2);
      if (self.buildQueue[0] > 2 && self.status !== 'churchchain') {
        adjacentPos = self.buildingAttackUnitPositions;
      }
      if (self.status === 'churchchain') {
        let adjacentPosDist = adjacentPos.map(function (a) {
          return {pos: a, dist: qmath.dist(a[0], a[1], self.churchAttackLoc[0], self.churchAttackLoc[1])}
        });
        adjacentPosDist.sort(function (a, b) {
          return a.dist - b.dist;
        })
        adjacentPos = adjacentPosDist.map(function (a) {
          return a.pos
        });

      }
      
      for (let i = 0; i < adjacentPos.length; i++) {
        let checkPos = adjacentPos[i];
        if(canBuild(self, checkPos[0], checkPos[1], robotMap, passableMap)){

          if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
            let unit = self.buildQueue.shift();
            let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);

            if (self.knownStructures[otherTeamNum].length) {
              let nx = self.knownStructures[otherTeamNum][0].x;
              let ny = self.knownStructures[otherTeamNum][0].y;
              let msg = self.compressLocation(nx, ny); // Eventually = compressed location
              let padding = 33099;
              if (self.status !== 'churchchain'){
                self.signal(padding + msg, 2);
              }
            }

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

function getIndexAllSpots(self, pos){
  for (let i = 0; i < self.allSpots.length; i++) {
    let p = self.allSpots[i];
    if (p.x === pos[0] && p.y === pos[1]) {
      return i;
    }
  }
  return false;
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
  let karboniteMap = self.getKarboniteMap();
  for (let i = 0; i < checkPositions.length; i++) {
    let cx = checkPositions[i][0];
    let cy = checkPositions[i][1];
    if (fuelMap[cy][cx] === true || karboniteMap[cy][cx] === true) {
      numDeposits += 1;
    }
  }
  return numDeposits;
}

function ownHalf(self, nx, ny) {
  let gameMap = self.map;
  let mapLength = gameMap.length;
  //self.log()
  if (!self.mapIsHorizontal) {
    if (self.lowerHalf) {
      if (nx < mapLength/2) {
        return true;
      }
    }
    else {
      if (nx >= mapLength/2) {
        return true;
      }
    }
  }
  else {
    if (self.lowerHalf) {
      if (ny < gameMap.length/2) {
        return true;
      }
    }
    else {
      if (ny >= gameMap.length/2) {
        return true;
      }
    }
  }
  return false;
}
export default {mind}