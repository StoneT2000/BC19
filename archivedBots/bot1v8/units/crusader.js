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
  //INITIALIZATION
  if (self.me.turn === 1) {
    //broadcast your unit number for castles to add to their count of units
    self.castleTalk(self.me.unit);
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    let enemyCastle = self.knownStructures[otherTeamNum][0]
    //rally means crusader goes to a rally point
    self.status = 'rally';

    let rels = base.relToPos(self.me.x, self.me.y, enemyCastle[0], enemyCastle[1], self);
    self.finalTarget = [self.me.x + rels.dx, self.me.y+rels.dy];
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
  }
  
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
  
  if (self.status === 'searchAndAttack') {
    self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
  }
  
  //at any time
  if (self.status === 'searchAndAttack' || self.status === 'rally') {
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
          
          if (self.status === 'rally') {
            //if rallying, don't reset target
          }
          else {
            self.finalTarget = [obot.x, obot.y];
          }
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
        if (enemyBot.health <= 10) {
          //enemy bot killed
          //finish attack by returning attack move and then set target to nothing, forcing bot do something else whilst searching for enemies
          action = self.attack(rels.dx,rels.dy)
          return {action:action};
        }
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
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