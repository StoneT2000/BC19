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
  let forcedAction = null;
  self.log(`Prophet (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let robotMap = self.getVisibleRobotMap();
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  //INITIALIZATION
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.initializeCastleLocations();
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'defend';
    self.rallyTarget = [self.me.x, self.me.y];
    self.defendTarget = [self.me.x, self.me.y]
  }
  if (self.me.turn === 3) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  //self.status = 'defend';
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessageProphet(self, msg);
    if (msg >= 6 && msg <= 4101) {
      let newTarget = self.getLocation(msg - 6);
      self.finalTarget = [newTarget.x, newTarget.y];
      self.status = 'searchAndAttack';
    }
    if (msg >= 4102 && msg <= 8197) {
      let padding = 4102;
      let targetLoc = self.getLocation(msg - padding);
      base.logStructure(self, targetLoc.x, targetLoc.y, otherTeamNum, SPECS.CASTLE);
      self.log(`Enemey caslte received at ${targetLoc.x}, ${targetLoc.y}`);
    }
    if (msg >= 12294 && msg <= 16389) {
      self.status = 'attackTarget';
      let padding = 12294;
      let targetLoc = self.getLocation(msg - padding);
      self.finalTarget = [targetLoc.x, targetLoc.y];
      self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      //final target is wherever is max dist from final target
    }
    if (msg >= 16392 && msg <= 20487) {
      self.status = 'goToTarget';
      let padding = 16392;
      let targetLoc = self.getLocation(msg - padding);
      self.finalTarget = [targetLoc.x, targetLoc.y];
      self.log(`Preparing to attack enemy at ${self.finalTarget}`);
    }
  }
  //each turn, we update our local self.knownStructures list.
  //it also sets self.destroyedCastle to true if the castle that it knew about is no longer there anymore
  base.updateKnownStructures(self);
  
  
  //DECISIONS
  if (self.status === 'defend') {
    //follow lattice structure
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true) {
        let closestDist = 99999;
        let bestLoc = null;
        let nearestStructure = search.findNearestStructure(self);

        for (let i = 0; i < gameMap.length; i++) {
          for (let j = 0; j < gameMap[0].length; j++) {
            if (i % 2 !== j % 2 ){
              if (search.emptyPos(j, i , robotMap, gameMap, false) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
                //assuming final target when rallying is the rally targt
                let distToStructure = qmath.dist(j, i, nearestStructure.x, nearestStructure.y);
                if (distToStructure > 2){
                  let thisDist = qmath.dist(self.defendTarget[0], self.defendTarget[1], j, i);
                  if (thisDist < closestDist) {
                    closestDist = thisDist;
                    bestLoc = [j, i];
                  }
                }
              }
            }
          }
        }
        if (bestLoc !== null) {
          self.finalTarget = bestLoc;
          self.log('New location near defend point :' + self.finalTarget);
        }
    }
  }
  if (self.status === 'attackTarget') {
    
  }
  if (self.status === 'searchAndAttack') {
    if (self.knownStructures[otherTeamNum].length > 0){
      
      self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
    }
  }
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let leastDistToStructure = 99999;
    let enemyBot = null;
    let closestStructure = null;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (obot.unit !== SPECS.CASTLE && obot.unit !== SPECS.PILGRIM){
          
          if (distToThisTarget < leastDistToTarget && distToThisTarget >= 16) {
            leastDistToTarget = distToThisTarget;

            isEnemy = true;
            enemyBot = obot;
          }
        }
        else if (obot.unit === SPECS.CASTLE) {
          if (distToThisTarget < leastDistToStructure && distToThisTarget >= 16){
            leastDistToStructure = distToThisTarget;
            isEnemy = true;
            closestStructure = obot;
          }
        }
        
      }
      else {
      }
    }
    //enemy nearby, attack it?
    if ((leastDistToTarget <= 64 || leastDistToStructure <= 64) && isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let botToAttack = enemyBot;
      if (enemyBot === null) {
        botToAttack = closestStructure;
      }
      let rels = base.rel(self.me.x, self.me.y, botToAttack.x, botToAttack.y);
      self.log(`Prophet Attacks ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
    }
    
    
    if (self.destroyedCastle === true) {
      self.destroyedCastle = false;
      //go back home
      
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];
      newLoc = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
      self.log('Destroyed castle, now going to: ' + newLoc);
      self.status = 'searchAndAttack';
    }
    
  }
  
  
  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 82) {
      //stay put
    }
    else {
      return '';
    }
    
  }
  /* TODO: RESERVE A NEW SET OF SIGNALS FOR SENDING BOT TO FIGHT CASTLE. RESERVE A SET OF SIGNALS for SENDING BOT TO DEFEND AAGINST PROPHET
  if (self.status === 'goToTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 100) {
      //stay put
    }
    else {
      return '';
    }
  }
  */
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  let moveFast = true;
  action = self.navigate(self.finalTarget, false, moveFast);
  return {action:action}; 
}

export default {mind}