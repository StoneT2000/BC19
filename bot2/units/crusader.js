import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';

function mind(self){
  let target = self.target;
  let gameMap = self.map;
  
  //self.log(`Crusader (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
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
    

    target = exploreTarget;
    self.status = 'searchAndAttack';
  }
  
  let robotsInVision = self.getVisibleRobots();
  //process signals
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    //self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
    //signal.processMessageCrusader(self, msg);
  }
  
  if (self.status === 'rally') {
    return {action:'', status:'searchAndAttack', target: target};
  }

  
  if (self.status === 'searchAndAttack') {
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
          //self.castleTalk()
        }
        
        
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget) {
          leastDistToTarget = distToThisTarget;
          target = [obot.x, obot.y];
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
      let rels = base.rel(self.me.x, self.me.y, target[0], target[1]);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        if (enemyBot.health <= 10) {
          //enemy bot killed
          //finish attack by returning attack move and then set target to nothing, forcing bot do something else whilst searching for enemies
          return {action:self.attack(rels.dx,rels.dy), status:'searchAndAttack', target:[]}; //[Math.floor(Math.random()*gameMap[0].length),Math.floor(Math.random()*gameMap.length)]
        }
        return {action:self.attack(rels.dx,rels.dy), status:'searchAndAttack', target: target};
      }
      else {
        return {action:'', status:'searchAndAttack', target: target};
      }
      //if (enemyBot.health)
      
      
    }
    
  }
  if (target.length > 0 && self.status === 'searchAndAttack'){
    let distToTarget = qmath.dist(self.me.x, self.me.y, target[0], target[1]);
    if (distToTarget <= 2){
      target = [Math.floor(Math.random()*gameMap[0].length),Math.floor(Math.random()*gameMap.length)]
    }
    let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
    if (self.canMove(rels.dx, rels.dy)){
      return {action:self.move(rels.dx,rels.dy), status:'searchAndAttack', target: target};
    }
    else {
      return {action:'', status:'searchAndAttack', target: target};
    }
  }
  
  //self.log(`Randomly moving`)
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)]
  return {action: self.move(...choice), status: 'searchAndAttack', target: []};
  

  
}
function invert(x,y){

}
export default {mind}