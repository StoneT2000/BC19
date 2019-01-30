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
  let action = '';
  let forcedAction = null;
  let robotMap = self.getVisibleRobotMap();
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  if (self.me.turn === 1) {
    self.defendLocChosen = false;
    self.useRallyTargetToMakeLattice = true;
    self.castleTalk(self.me.unit);
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.initializeCastleLocations();
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'defend';
    self.rallyTarget = [self.me.x, self.me.y];
    self.defendTarget = [self.me.x, self.me.y]
    self.moveSpeed = 'fast';
    self.origStructureLoc = [self.me.x, self.me.y];
    let possibleStructureLocs = search.circle(self, self.me.x, self.me.y, 2);
    for (let i = 0; i < possibleStructureLocs.length; i++) {
      let pos = possibleStructureLocs[i];
      let rid = robotMap[pos[1]][pos[0]];
      let obot = self.getRobot(rid);
      if (obot !== null && obot.team === self.me.team && (obot.unit === SPECS.CASTLE || obot.unit === SPECS.CHURCH)) {
        self.origStructureLoc = pos;
        self.log('Im from' + pos);
        break;
      }
    }
    for (let i = 0; i < mapLength; i++) {
      for (let j = 0; j < mapLength; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'fuel'});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'karbonite'});
        }
      }
    }
    
    
    
    self.enemyDirection = self.determineEnemyDirection();
    
  }
  if (self.me.turn === 5) {
    pathing.initializePlanner(self);
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  
  let seeMage = false;
  let closestMage = null;
  let closestMageDistance = 99999;
  let unitsInVision = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    if (robotsInVision[i].team === self.me.team) {
      signal.processMessageProphet(self, msg);
      if (msg >= 12294 && msg <= 24583){
        if (msg >= 12294 && msg <= 16389) {
          let padding = 12294;
          let targetLoc = self.getLocation(msg - padding);
        }
        if (msg >= 16392 && msg <= 20487) {
          self.status = 'attackTarget';
          let padding = 16392;
          let targetLoc = self.getLocation(msg - padding);
          self.finalTarget = [targetLoc.x, targetLoc.y];
        }
        if (msg >= 20488 && msg <= 24583) {
          self.status = 'goToTarget';
          let padding = 20488;

          let targetLoc = self.getLocation(msg - padding);
          self.finalTarget = [targetLoc.x, targetLoc.y];
          base.logStructure(self,self.finalTarget[0], self.finalTarget[1], otherTeamNum, 0);
        }

      }
      if (msg >= 24586 && msg <= 28681){
        self.status = 'defendSpot';
        let padding = 24586;
        let targetLoc = self.getLocation(msg - padding);
        self.defendTarget = [targetLoc.x, targetLoc.y];
        self.finalTarget = [targetLoc.x, targetLoc.y];
      }
      else if (msg >= 29003 && msg <= 33098 && self.status !== 'rally') {
        if (self.status !== 'rally') {
          self.oldStatus = self.status;
        }
        self.status = 'rally';
        let padding = 29003;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.rallyTarget = self.finalTarget;
      }
      // Determine position of enemy castle
      else if (msg >= 33099 && msg <= 37194) {
        let padding = 33099;
        let enemyPos = self.getLocation(msg-padding);
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
      }
      else if (msg >= 41292 && msg <= 45387 && self.status !== 'rally') {
        self.status = 'attackTarget';
        let padding = 41292;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
      }
    }
    
    if (robotsInVision[i].unit === SPECS.PREACHER && robotsInVision[i].team === otherTeamNum) {
      seeMage = true;
      let distToEnemy = qmath.dist(self.me.x, self.me.y, robotsInVision[i].x, robotsInVision[i].y);
      if (distToEnemy < closestMageDistance) {
        closestMageDistance = distToEnemy;
        closestMage = robotsInVision[i];
      }
    }
    else if (robotsInVision[i].unit === SPECS.CHURCH) {
      unitsInVision[6].push(robotsInVision[i]);
    }
  }
  
  if (self.me.turn > 1){
    let cdist = 99999;
    let cSpot = null;
    for (let i = 0; i < self.allSpots.length; i++) {
      let spot = self.allSpots[i];
      let id = robotMap[spot.y][spot.x];
      let robotThere = self.getRobot(robotMap[spot.y][spot.x]);
      if (id === 0 || (robotThere !== null && robotThere.team === self.me.team && robotThere.unit !== SPECS.PILGRIM)) {
        let distToSpot = qmath.dist(self.me.x, self.me.y, spot.x, spot.y);
        if (distToSpot <  cdist) {
          cdist = distToSpot;
          cSpot = spot;
         
        }
      }


    }
    if (cSpot !== null) {
      let indexOfspot = getIndexAllSpots(self, [cSpot.x, cSpot.y]);
      self.castleTalk(indexOfspot + 77);
      
    }
  }
  
  
  
  base.updateKnownStructures(self);
  
  if (self.status !== 'rally') {
    self.useRallyTargetToMakeLattice = true;
  }
  
  if (self.status === 'defend' || self.status === 'defendOldPos' || self.status === 'defendSpot' || self.status === 'rally' || self.status === 'defend2nd') {
    
    let nearestStructure = search.findNearestStructure(self);
    let distToStructureFromMe = qmath.dist(self.me.x, self.me.y, nearestStructure.x, nearestStructure.y);
    
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0 && robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id) {
      self.defendLocChosen = false;
    }
    
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true || distToStructureFromMe <= 2 || self.status === 'defendOldPos') {
        
      let bestLoc = null;
      
      if (self.defendLocChosen === false){
        
      if (self.enemyDirection === 'left'){
        if (self.status === 'rally') {
          bestLoc = self.findDefendLoc(self, unitsInVision, self.rallyTarget[0], mapLength, 0, mapLength)
        }
        else {
          bestLoc = self.findDefendLoc(self, unitsInVision, 0, self.defendTarget[0], 0, mapLength);
        }
      }
      else if (self.enemyDirection === 'right') {
        if (self.status === 'rally') {
          bestLoc = self.findDefendLoc(self, unitsInVision, 0, self.rallyTarget[0], 0, mapLength)
        }
        else {
          bestLoc = self.findDefendLoc(self, unitsInVision, self.defendTarget[0], mapLength, 0, mapLength);
        }
        
      }
      else if (self.enemyDirection === 'up') {
        if (self.status === 'rally') {
          bestLoc = self.findDefendLoc(self, unitsInVision, 0, mapLength, self.rallyTarget[1], mapLength)
        }
        else {
          bestLoc = self.findDefendLoc(self, unitsInVision, 0, mapLength, 0, self.defendTarget[1]);
        }
      }
      else if (self.enemyDirection === 'down') {
        if (self.status === 'rally') {
          bestLoc = self.findDefendLoc(self, unitsInVision, 0, mapLength, 0, self.rallyTarget[1])
        }
        else {
          bestLoc = self.findDefendLoc(self, unitsInVision, 0, mapLength, self.defendTarget[1], mapLength);
        }
      }
        self.defendLocChosen = true;
      }
      if (bestLoc !== null) {
        self.finalTarget = bestLoc;
      }
      if (self.status === 'defendOldPos') {
          self.status = 'defend';
        }
    }
  }
  if (self.status === 'searchAndAttack') {
    if (self.knownStructures[otherTeamNum].length){
      self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
    }
    else {
      self.status = 'defend2nd';
    }
  }
  
  if (self.status === 'defend' || self.status === 'attackTarget' || self.status === 'defendSpot' || self.status === 'defend2nd') {
    let enemyPositionsToAvoid = [];
    let friendsNearby = 0;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];

      if (obot.team === otherTeamNum) {
        let distToEnemy = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        let mpr = 16;
        let cpr = 16;
        if (self.status === 'defendSpot') {
          mpr = 25;
          cpr = 49;
        }
        if (obot.unit === SPECS.PREACHER && distToEnemy <= mpr) {
          enemyPositionsToAvoid.push([obot.x, obot.y]);
        }
        else if (obot.unit === SPECS.CRUSADER && distToEnemy <= cpr) {
          enemyPositionsToAvoid.push([obot.x, obot.y]);
        }

      }
      else if (obot.team === self.me.team) {
        if (obot.unit === SPECS.PROPHET || obot.unit === SPECS.CRUSADER || obot.unit === SPECS.PREACHER) {
          friendsNearby += 1;
        }
      }
    }
    if (friendsNearby < 4){
      
      let largestSumDist = null;
      let avoidLocs = [];
      if (enemyPositionsToAvoid.length > 0){
        self.log(`Im trying to kite`);
        self.log(`Prophet sees enemies nearby`)
        let positionsToGoTo = search.circle(self, self.me.x, self.me.y, 4);
        for (let i = 0; i < positionsToGoTo.length; i++) {
          let thisSumDist = 0;
          let pos = positionsToGoTo[i];
          if (search.emptyPos(pos[0], pos[1], robotMap, self.map)){
            for (let j = 0; j < enemyPositionsToAvoid.length; j++) {
              thisSumDist += qmath.dist(pos[0], pos[1], enemyPositionsToAvoid[j][0], enemyPositionsToAvoid[j][1]);
            }
            avoidLocs.push({pos:pos, dist:thisSumDist});
          }
        }
      }
      if (avoidLocs.length > 0) {
        self.log(`Prophet running away from enemy`)
        avoidLocs.sort(function(a,b) {
          return b.dist - a.dist;
        })
        let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
        return {action:self.move(rels.dx,rels.dy)}
      }
    }
  }
  if (self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget' || self.status === 'defendSpot' || self.status === 'rally' || self.status === 'defend2nd') {
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget && distToThisTarget >= 16) {
          leastDistToTarget = distToThisTarget;
          
          isEnemy = true;
          enemyBot = obot;
        }
        
      }
      else {
      }
    }
    if (leastDistToTarget <= 64 && isEnemy === true) {
      let rels = base.rel(self.me.x, self.me.y, enemyBot.x, enemyBot.y);
      if (self.readyAttack()){
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
    }
    
    
    if (self.destroyedCastle === true) {
      self.destroyedCastle = false;
      
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];
      self.status = 'defend';
    }
    
  }
  
  
  if (self.status === 'attackTarget') {
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 82) {
      
    }
    else {
      return '';
    }
    
  }
  else if (self.status === 'goToTarget') {
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy <= 82) {
      self.signal(24585, 100);
    }
  }
  
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  let moveFast = true;
  if (self.moveSpeed === 'slow' || self.status === 'defend' || self.status === 'defendOldPos' || self.status === 'attackTarget' || self.status === 'rally' || self.status === 'defend2nd') {
    moveFast = false;
  }
  if (self.me.turn <= 3) {
    moveFast = true;
  }
  action = self.navigate(self.finalTarget, false, moveFast);
  return {action:action}; 
}


function getIndexAllSpots(self, pos){
  for (let i = 0; i < self.allSpots.length; i++) {
    let p = self.allSpots[i];
    if (p.x === pos[0] && p.y === pos[1]) {
      return i;
    }
  }
  return null;
}
export default {mind}