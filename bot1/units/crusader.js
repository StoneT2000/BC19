import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';


function mind(self){
  let target = self.target;
  self.log(`Crusader (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  if (self.status === 'justBuilt') {
    let exploreTarget = [self.me.y, self.me.x];
    let rels = base.relToPos(self.me.x, self.me.y, exploreTarget[0], exploreTarget[1], self);
    return {action:self.move(rels.dx,rels.dy), status:'searchAndAttack', target: exploreTarget};
  }
  let robotsInVision = self.getVisibleRobots();
  if (self.status === 'searchAndAttack') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      if (obot.team !== self.me.team) {
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget) {
          leastDistToTarget = distToThisTarget;
          target = [obot.x, obot.y];
          isEnemy = true;
        }
        
      }
    }
    //adjacent
    if (leastDistToTarget <= 4 && isEnemy === true) {
      let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      self.log(`Attack`)
      return {action:self.attack(rels.dx,rels.dy), status:'searchAndAttack', target: target};
    }
    
     
  }
  if (target){
    let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
    return {action:self.move(rels.dx,rels.dy), status:'searchAndAttack', target: target};
  }
  
  
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)]
  return {action: self.move(...choice), status: 'searchAndAttack', target: []};
  
}
function invert(x,y){

}
export default {mind}