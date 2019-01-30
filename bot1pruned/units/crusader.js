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
  //INITIALIZATION
  if (self.me.turn === 1) {
    //broadcast your unit number for castles to add to their count of units
    self.castleTalk(self.me.unit);
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.useRallyTargetToMakeLattice = true;
    self.defendLocChosen = false;
    let initialized = self.initializeCastleLocations();
    if (initialized){
      let enemyCastle = self.knownStructures[otherTeamNum][0]
      //rally means crusader goes to a rally point
      self.status = 'defend';
      self.oldStatus = 'defend';
      let rels = base.relToPos(self.me.x, self.me.y, enemyCastle[0], enemyCastle[1], self);
      self.finalTarget = [self.me.x + rels.dx, self.me.y+rels.dy];
      self.defendTarget = [self.me.x, self.me.y];
    }
    else {
      //set defending target
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
  //SIGNAL PROCESSION
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
        //final target is wherever is max dist from final target
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
      // Transfer location of enemy location
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
  
  //avoidance code
  
  let enemyPositionsToAvoid = [];
  let minDistToPreacher = 49; //distance such that crusader moving max distance is not in range of preacher attack
  let minDistToCrusader = 49;
  if (self.status === 'searchAndAttack') { 
    minDistToCrusader = 32;
    minDistToPreacher = 32;
  }
  /*
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    
    //find position that is the farthest away from all enemies
    if (obot.team === otherTeamNum) {
      let distToEnemy = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      
      if (obot.unit === SPECS.PREACHER && distToEnemy <= minDistToPreacher) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      else if (obot.unit === SPECS.CRUSADER && distToEnemy <= minDistToCrusader) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      
    }
  }
  let avoidLocs = [];
  if (self.status === 'searchAndAttack') {
    if (enemyPositionsToAvoid.length > 0){
      self.log(`Crusader sees enemies nearby`)
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
      //FORCE A MOVE AWAY
      self.log(`Crusader running away from enemy`)
      avoidLocs.sort(function(a,b) {
        return b.dist - a.dist;
      })
      let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
      //search for previous deposit?
      self.status = 'searchAndAttack';
      return {action:self.move(rels.dx,rels.dy)}
    }
  }
  */
  
  base.updateKnownStructures(self);
  //DECISION MAKING
  if (self.status !== 'rally') {
    self.useRallyTargetToMakeLattice = true;
  }
  if (self.status === 'defend' || self.status === 'defendOldPos' || self.status === 'defendSpot' || self.status === 'rally') {
    //follow lattice structure
    
    let nearestStructure = search.findNearestStructure(self);
    let distToStructureFromMe = qmath.dist(self.me.x, self.me.y, nearestStructure.x, nearestStructure.y);
    
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0 && robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id) {
      self.defendLocChosen = false;
    }
    //if status === defendOldPos, we force unit to reposition itself.
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
  
  //at any time
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget' || self.status === 'rally') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot = null;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        //if bot sees enemy structures, log it, and send to castle
        if (obot.unit === SPECS.CASTLE || obot.unit === SPECS.CHURCH) {
          //base.logStructure(self, obot);
        }
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget) {
          leastDistToTarget = distToThisTarget;

          isEnemy = true;
          enemyBot = obot;
          
        }
        
      }
      else {
        
          //self.log(`Crusader see's our own castle`);
        
      }
    }
    if (enemyBot !== null) {
      if (self.status === 'goToTarget') {
        self.finalTarget = [enemyBot.x, enemyBot.y];
      }
    }
    //enemy nearby, attack it?
    if (leastDistToTarget <= 16 && isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, enemyBot.x, enemyBot.y);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
    }
    if (self.destroyedCastle === true) {
      self.destroyedCastle = false;
      //go back home
      
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];
      self.log('Destroyed castle, now going to: ' + newLoc);
      self.status = 'defend';
    }
  }
  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 60) {
      //stay put
    }
    else {
      //return '';
    }
  }
  if (self.status === 'goToTarget') {
  }
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  
  //crusader should rush slower and then speed up when in range. Don't rush if u see enemey crusaders
  
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