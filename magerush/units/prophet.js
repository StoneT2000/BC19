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

  //INITIALIZATION
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    self.status = 'defend';
    self.initializeCastleLocations();
    self.finalTarget = [self.me.x, self.me.y];
  }
  if (self.me.turn === 3) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessageProphet(self, msg);
  }
  
  //DECISIONS
  if (self.status === 'searchAndAttack') {
    self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
  }
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend') {
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
        if (distToThisTarget < leastDistToTarget && distToThisTarget >= 16) {
          leastDistToTarget = distToThisTarget;
          
          if (self.status === 'rally' || self.status === 'defend') {
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
      }
    }
    //enemy nearby, attack it?
    if (leastDistToTarget <= 64 && isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, enemyBot.x, enemyBot.y);
      self.log(`Prophet Attacks ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
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

export default {mind}