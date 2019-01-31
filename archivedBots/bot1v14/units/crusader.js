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
  let karboniteMap = self.getKarboniteMap();
  //INITIALIZATION
  if (self.me.turn === 1) {
    //broadcast your unit number for castles to add to their count of units
    self.castleTalk(self.me.unit);
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    let initialized = self.initializeCastleLocations();
    if (initialized){
      let enemyCastle = self.knownStructures[otherTeamNum][0]
      //rally means crusader goes to a rally point
      self.status = 'rally';

      let rels = base.relToPos(self.me.x, self.me.y, enemyCastle[0], enemyCastle[1], self);
      self.finalTarget = [self.me.x + rels.dx, self.me.y+rels.dy];
      self.defendTarget = [self.me.x, self.me.y];
    }
    else {
      //set defending target
      self.status = 'defend';
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
  }
  if (self.me.turn === 3) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    //self.log(`Received from ${robotsInVision[i].id}  msg: ${msg}`);
    signal.processMessageCrusader(self, msg);
    if (msg >= 12294 && msg <= 16389) {
      self.status = 'attackTarget';
      let padding = 12294;
      let targetLoc = self.getLocation(msg - padding);
      self.finalTarget = [targetLoc.x, targetLoc.y];
      self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      //final target is wherever is max dist from final target
    }
  }
  base.updateKnownStructures(self);
  //DECISION MAKING
  if (self.status === 'rally') {
    //self.finalTarget = [self.me.x, self.me.y];
  }
  if (self.status === 'rally'){
    let crusadersInVincinity = [];
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      if (obot.unit === SPECS.CRUSADER) {
        let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToUnit <= 9) {
          crusadersInVincinity.push(obot);
        }
      }
    }
    if (crusadersInVincinity.length >= 3) {
      self.status = 'searchAndAttack';
      self.signal(1,9);
      forcedAction = '';
    }
  }
  if (self.status === 'defend') {
    //follow lattice structure
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true) {
        let closestDist = 99999;
        let bestLoc = null;
        for (let i = 0; i < gameMap.length; i++) {
          for (let j = 0; j < gameMap[0].length; j++) {
            if (i % 2 !== j % 2 ){
              if (search.emptyPos(j, i , robotMap, gameMap) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
                //assuming final target when rallying is the rally targt
                let thisDist = qmath.dist(self.defendTarget[0], self.defendTarget[1], j, i);
                if (thisDist < closestDist) {
                  closestDist = thisDist;
                  bestLoc = [j, i];
                }
              }
            }
          }
        }
        if (bestLoc !== null) {
          self.finalTarget = bestLoc;
          self.log('New location near rally point :' + self.finalTarget);
        }
    }
  }
  if (self.status === 'searchAndAttack') {
    self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
  }
  
  //at any time
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot;
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
  }
  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 60) {
      //stay put
    }
    else {
      return '';
    }
  }
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  action = self.navigate(self.finalTarget);
  return {action:action};
  

  
}
function invert(x,y){

}
export default {mind}