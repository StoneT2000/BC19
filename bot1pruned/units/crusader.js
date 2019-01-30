import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';

function mind(self){
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  self.log(`Crusader (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let forcedAction = null;
  let robotMap = self.getVisibleRobotMap();
  let fuelMap = self.getFuelMap();
  let mapLength = gameMap.length;
  let karboniteMap = self.getKarboniteMap();
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.useRallyTargetToMakeLattice = true;
    self.defendLocChosen = false;
    let initialized = self.initializeCastleLocations();
    if (initialized){
      let enemyCastle = self.knownStructures[otherTeamNum][0]
      self.status = 'defend';
      self.oldStatus = 'defend';
      let rels = base.relToPos(self.me.x, self.me.y, enemyCastle[0], enemyCastle[1], self);
      self.finalTarget = [self.me.x + rels.dx, self.me.y+rels.dy];
      self.defendTarget = [self.me.x, self.me.y];
    }
    else {
      self.status = 'defend';
      self.oldStatus = 'defend';
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
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
    self.enemyDirection = self.determineEnemyDirection();
  }
  if (self.me.turn === 5) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  let unitsInVision = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessageCrusader(self, msg);
    if (robotsInVision[i].team === self.me.team){
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
      if (msg >= 16392 && msg <= 20487) {
        if (self.status !== 'goToTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'goToTarget';
        let padding = 16392;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy at ${self.finalTarget}`);
      }
      if (msg >= 20488 && msg <= 24583) {
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
        self.log(`Enemy Direction from crusader at ${self.me.x}, ${self.me.y} is ${self.enemyDirection}`);
        }
      }
      else if (msg >= 41292 && msg <= 45387) {
        if (self.status !== 'attackTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'attackTarget';
        
        let padding = 41292;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      }
    
    if (robotsInVision[i].unit === SPECS.CHURCH) {
      unitsInVision[6].push(robotsInVision[i]);
    }
  }
  
  let enemyPositionsToAvoid = [];
  let minDistToPreacher = 49;
  let minDistToCrusader = 49;
  if (self.status === 'searchAndAttack') { 
    minDistToCrusader = 32;
    minDistToPreacher = 32;
  }
  
  base.updateKnownStructures(self);
  if (self.status !== 'rally') {
    self.useRallyTargetToMakeLattice = true;
  }
  if (self.status === 'defend' || self.status === 'defendOldPos' || self.status === 'defendSpot' || self.status === 'rally') {
    
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
      self.status = 'defend';
    }
  }
  
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget' || self.status === 'rally') {
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot = null;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        if (obot.unit === SPECS.CASTLE || obot.unit === SPECS.CHURCH) {
        }
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget) {
          leastDistToTarget = distToThisTarget;

          isEnemy = true;
          enemyBot = obot;
          
        }
        
      }
      else {
      }
    }
    if (enemyBot !== null) {
      if (self.status === 'goToTarget') {
        self.finalTarget = [enemyBot.x, enemyBot.y];
      }
    }
    if (leastDistToTarget <= 16 && isEnemy === true) {
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
    if (distToEnemy >= 60) {
    }
    else {
    }
  }
  if (self.status === 'goToTarget') {
  }
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  
  
  let fast = true;
  if (self.status === 'rally') {
    fast = false;
  }
  action = self.navigate(self.finalTarget, false, fast);
  return {action:action};
  

  
}
function invert(x,y){

}
export default {mind}