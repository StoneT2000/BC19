import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';
import attack from '../attack.js';



function mind(self){
  let gameMap = self.map;
  let mapLength = self.map.length;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  
  let forcedAction = null;
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  let robotMap = self.getVisibleRobotMap();
  
  if (self.me.turn === 5) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  if (self.me.turn === 1) {
    self.useRallyTargetToMakeLattice = true;
    self.defendLocChosen = false;
    self.castleTalk(self.me.unit);
    self.allowedToMove = true;
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'defend';
    self.oldStatus = 'defend';
    self.lastAttackedUnit = null;
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    let initializedCastles = self.initializeCastleLocations();
    if (initializedCastles){
      self.status = 'defend';
      self.oldStatus = 'defend';
      self.rallyTarget = [self.me.x, self.me.y];
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
    else {
      self.status = 'defend';
      self.oldStatus = 'defend';
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
    self.enemyDirection = self.determineEnemyDirection();
    
    
    self.origStructureLoc = null;
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
    
    
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  let unitsInVision = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePreacher(self, msg);
    if(robotsInVision[i].team === self.me.team && robotsInVision[i].id !== self.me.id){
      if (msg >= 12294 && msg <= 16389) {
        if (self.status !== 'attackTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'attackTarget';
        let padding = 12294;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      }
      else if (msg >= 16392 && msg <= 20487) {
        if (self.status !== 'goToTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'goToTarget';
        
        let padding = 16392;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy at ${self.finalTarget}`);
      }
      else if (msg >= 20488 && msg <= 24583) {
        if (self.status !== 'goToTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'goToTarget';
        
        let padding = 20488;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy castle at ${self.finalTarget}`);
        base.logStructure(self,self.finalTarget[0], self.finalTarget[1], otherTeamNum, 0);
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
        self.log(`Preparing to rally at ${self.finalTarget}`);
      }
      else if (msg >= 41292 && msg <= 45387) {
        if (self.status !== 'goToTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'goToTarget';
        let padding = 41292;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy at ${self.finalTarget}`);
      }
      if (msg === 5) {
        self.log(`Received ${msg} from ${robotsInVision[i].id}`);
      }
      
    }
    if (robotsInVision[i].unit === SPECS.CHURCH) {
      unitsInVision[6].push(robotsInVision[i]);
    }
    if (robotsInVision[i].team === self.me.team) {
      if (msg >= 33099 && msg <= 37194) {
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
        self.log(`Enemy Direction from preacher at ${self.me.x}, ${self.me.y} is ${self.enemyDirection}`);
      }
    }
  }
  
  base.updateKnownStructures(self);

  if (self.status !== 'rally') {
    self.useRallyTargetToMakeLattice = true;
  }
  
  let nearestStructure = search.findNearestStructure(self);
  let distToStructureFromMe = qmath.dist(self.me.x, self.me.y, nearestStructure.x, nearestStructure.y);
  if (robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0 && robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id) {
    self.defendLocChosen = false;
  }
  if (self.status === 'defend' || self.status === 'defendOldPos' || self.status === 'rally') {
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true || distToStructureFromMe <= 2 || self.status === 'defendOldPos') {
      let bestLoc = null;
      if (self.defendLocChosen === false){
        self.log(`Choosing new defend loc`)
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
        self.log('New location near defend point :' + self.finalTarget);
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
      self.status = 'defend';
    }
  }
  //DECISIONS
  
  if (self.status === 'attackTarget') {
    
  }
  if (self.status === 'goToTarget') {
    
  }
  if (self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget' || self.status === 'searchAndAttack') {
    
    let attackLoc = attack.attackNearestAOE(self);
    
    
    if (self.destroyedCastle === true) {
      self.log(`Killed castle`);
      self.destroyedCastle = false;

      let longestDistance = 0;
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];

      self.log(`Destroyed castle, now going to ${newLoc}`);
      let compressedLocationHash = self.compressLocation(newLoc[0], newLoc[1]);
      self.status = 'defend';



    }
    if (attackLoc !== null) {
      let rels = base.rel(self.me.x, self.me.y, attackLoc.x, attackLoc.y);
      self.log(`Preacher Attacks ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
    }
  }

  if (self.status === 'attackTarget') {
  }
  if (self.status === 'goToTarget') {
    
  }
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  if (self.allowedToMove === true){
    let avoidFriends = false;
    let moveFast = true;
    if (self.status === 'attackTarget'){
    }
    if (self.me.turn <= 3 && self.status === 'defend') {
      avoidFriends = false;
    }
    if (self.status === 'rally') {
      moveFast = false;
    }
    self.log(`STAUS:${self.status}`);
    action = self.navigate(self.finalTarget, avoidFriends, moveFast);
  }
  else {
    action = '';
  }
  return {action:action};
}

export default {mind}