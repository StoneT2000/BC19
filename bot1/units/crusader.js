import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';

function mind(self){
  let target = self.target;
  let gameMap = self.map;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  self.log(`Crusader (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
    
  //INITIALIZATION
  if (self.status === 'justBuilt') {
    //broadcast your unit number for castles to add to their count of units
    self.castleTalk(self.me.unit);
    
    let exploreTarget = [gameMap[0].length - self.me.x - 1, gameMap.length - self.me.y - 1];
    if (search.horizontalSymmetry(gameMap)) {
      exploreTarget = [self.me.x, gameMap.length - self.me.y - 1];
    }
    else {
      exploreTarget = [gameMap[0].length - self.me.x - 1, self.me.y];
    }
    
    self.knownStructures[otherTeamNum].push({x:exploreTarget[0], y:exploreTarget[1], unit: 0});
    //let rels = base.relToPos(self.me.x, self.me.y, exploreTarget[0], exploreTarget[1], self);
    //rally means crusader goes to a rally point
    self.status = 'rally';
    self.target = [self.me.x,self.me.y];
    self.finalTarget = [self.me.x, self.me.y];
    //return {action:'', status:'rally', target: exploreTarget};
  }
  if (self.me.turn === 3) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    //self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
    signal.processMessageCrusader(self, msg);
  }
  
  //DECISION MAKING
  if (self.status === 'rally') {
    self.finalTarget = [self.me.x, self.me.y];
  }
  //NOTE; We reset target each time
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
  self.setFinalTarget(self.finalTarget);
  if (self.path.length > 0) {
    //if sub target almost reached

    let distLeftToSubTarget = qmath.dist(self.me.x, self.me.y, self.target[0], self.target[1]);
    //self.log(`Dist left: ${distLeftToSubTarget}`);
    if (distLeftToSubTarget <= 1){
      //self.log(`Pilgrim has new sub target`)
      //set new sub target
      self.target[1] = self.path.shift();
      self.target[0] = self.path.shift();
    }
  }
  if (self.target) {
    //self.log(`Path: ${self.path}`);
    let rels = base.relToPos(self.me.x, self.me.y, self.target[0], self.target[1], self);
    //self.log(`Target: ${self.target[0]}, ${self.target[1]}, dx:${rels.dx}, dy:${rels.dy}`)
    if (rels.dx === 0 && rels.dy === 0) {
      action = ''
    }
    else {
      action = self.move(rels.dx, rels.dy);    
    }
  }
  return {action:action}; 
  

  
}
function invert(x,y){

}
export default {mind}