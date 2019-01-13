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
  
  let robotMap = self.getVisibleRobotMap();
  
  self.log(`Preacher (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  
  //INITIALIZATION
  if (self.me.turn === 1) {
    self.castleTalk(self.me.unit);
    
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'rally';
    
    let exploreTarget = [gameMap[0].length - self.me.x - 1, gameMap.length - self.me.y - 1];
    if (search.horizontalSymmetry(gameMap)) {
      exploreTarget = [self.me.x, gameMap.length - self.me.y - 1];
    }
    else {
      exploreTarget = [gameMap[0].length - self.me.x - 1, self.me.y];
    }
    self.knownStructures[otherTeamNum].push({x:exploreTarget[0], y:exploreTarget[1], unit: 0});

    let rels = base.relToPos(self.me.x, self.me.y, exploreTarget[0], exploreTarget[1], self);
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
    signal.processMessagePreacher(self, msg);
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
      self.signal(1,9);//note, this signal will be broadcasted to other units at where this unit is at the end of its turn
      forcedAction = '';
    }
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
    let attackLoc = {};
    
    let mostUnitsAttacked = 0;
    
    //search through all locations we can hit
    //IMPROVE: Don't need to search through whole map, just search within vision
    
    //Code for choosing attack with AOE if robot is allowed to attack empty spaces, which isn't the case ATM, listen for dev updates on this
    /* 
    for (let i = 0; i < robotMap.length; i++) {
      for (let j = 0; j < robotMap[i].length; j++) {
        if (robotMap[i][j] >= 0) {
          
          //i = y value, j =  value;
          //let oRobot = self.getRobot(oRobotId);
          //location in vision and attackble because preacher vision = attack radius
          //check units that will get hit, maximize damage
          let checkPositions = search.circle(j, i, 2);
          let unitsAttacked = 0;
          for (let k = 0; k < checkPositions.length; k++) {
            let checkPos = checkPositions[k];
            let oRobotId = robotMap[checkPos[1]][checkPos[0]];
            if (oRobotId > 0) {
              let oRobot = self.getRobot(oRobotId);
              //if other team, add to number of affected enemies
              //Strategy is to hit as many enemies as possible and as little friendlies as possible
              if (oRobot.team !== self.me.team) {
                unitsAttacked += 1; //enemy team hit
              }
              else {
                unitsAttacked -= 1;
              }
              
            }
          }
          if (mostUnitsAttacked < unitsAttacked) {
            attackLoc = {x:j,y:i};
            mostUnitsAttacked = unitsAttacked;
            isEnemy = true;
          }
        }
      }
    }
    */
    
    for (let i = 0; i < robotsInVision.length; i++) {
      let oVisRobot = robotsInVision[i];
      let checkPositions = search.circle(oVisRobot.x, oVisRobot.y, 2);
      let unitsAttacked = 0;
      if (oVisRobot.id !== self.me.id){
        for (let k = 0; k < checkPositions.length; k++) {
          let checkPos = checkPositions[k];
          let oRobotId = robotMap[checkPos[1]][checkPos[0]];

          //ok if hit self
          if (oRobotId > 0) {
            let oRobot = self.getRobot(oRobotId);
            //if other team, add to number of affected enemies
            //Strategy is to hit as many enemies as possible and as little friendlies as possible
            if (oRobot.team !== self.me.team) {
              unitsAttacked += 1; //enemy team hit

            }
            else {
              if (oRobotId === self.me.id) {

              }
              else {
                unitsAttacked -= 1;
              }
            }

          }
        }

        if (mostUnitsAttacked < unitsAttacked) {
          attackLoc = {x:oVisRobot.x,y:oVisRobot.y};
          mostUnitsAttacked = unitsAttacked;
          isEnemy = true;
        }
      }
    }
    
    //enemy nearby, attack it?
    if (isEnemy === true) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, attackLoc.x, attackLoc.y);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      self.log(`Preacher Attacks ${rels.dx},${rels.dy}`);
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