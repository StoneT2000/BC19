import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';

function mind(self){
  let gameMap = self.map;
  let mapLength = self.map.length;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  let forcedAction = null;
  self.log(`Prophet (${self.me.x}, ${self.me.y}); Status: ${self.status}; ${self.me.time} ms left`);
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
    self.moveSpeed = 'fast';
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
  }
  if (self.me.turn === 5) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  let robotsInVision = self.getVisibleRobots();
  
  //self.status = 'defend';
  
  //SIGNAL PROCESSION
  let seeMage = false;
  let closestMage = null;
  let closestMageDistance = 99999;
  let unitsInVision = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    if (robotsInVision[i].team === self.me.team){
      signal.processMessageProphet(self, msg);
      if (msg >= 12294 && msg <= 24583){
        if (msg >= 12294 && msg <= 16389) {
          //self.status = 'attackTarget';
          //current status should be defend
          //this signal means we see an enemy that is other than a prophet
          //thus, we stay still
          let padding = 12294;
          let targetLoc = self.getLocation(msg - padding);
          //self.finalTarget = [targetLoc.x, targetLoc.y];
          self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
          //final target is wherever is max dist from final target
        }
        if (msg >= 16392 && msg <= 20487) {
          self.status = 'attackTarget';
          //seeing an enemey prophet means we try to engage it
          let padding = 16392;
          let targetLoc = self.getLocation(msg - padding);
          self.finalTarget = [targetLoc.x, targetLoc.y];
          self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
        }
        if (msg >= 20488 && msg <= 24583) {
          self.status = 'goToTarget';
          let padding = 20488;
          self.moveSpeed = 'slow';
          let targetLoc = self.getLocation(msg - padding);
          self.finalTarget = [targetLoc.x, targetLoc.y];
          self.log(`Preparing to attack enemey castle at ${self.finalTarget}`);
          base.logStructure(self,self.finalTarget[0], self.finalTarget[1], otherTeamNum, 0);
        }

      }
    }
    if (robotsInVision[i].unit === SPECS.PREACHER && robotsInVision[i].team === otherTeamNum) {
      seeMage = true;
      let distToEnemy = qmath.dist(self.me.x, self.me.y, robotsInVision[i].x, robotsInVision[i].y);
      if (distToEnemy < closestMageDistance) {
        closestMageDistance = distToEnemy;
        closestMage = robotsInVision[i];
      }
    }
    else if (robotsInVision[i].unit === SPECS.CHURCH) {
      unitsInVision[6].push(robotsInVision[i]);
    }
  }
  //each turn, we update our local self.knownStructures list.
  //it also sets self.destroyedCastle to true if the castle that it knew about is no longer there anymore
  base.updateKnownStructures(self);
  
  
  //DECISIONS
  if (self.status === 'attackTarget') {
    if(seeMage === true && self.me.turn <= 50){
      //kite mages if its early game
      let distToEnemy = qmath.dist(self.me.x, self.me.y, closestMage.x, closestMage.y);
      if (distToEnemy <= 16) {
        let rels = self.avoidEnemyLocations([[closestMage.x, closestMage.y]]);
        if (rels !== null) {
          return {action:self.move(rels.dx,rels.dy)} 
        }
        else {
          
        }
      }
      
      
    }
    
  }
  
  
  if (self.status === 'defend' || self.status === 'defendOldPos') {
    //follow lattice structure
    
    let nearestStructure = search.findNearestStructure(self);
    let distToStructureFromMe = qmath.dist(self.me.x, self.me.y, nearestStructure.x, nearestStructure.y);
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true || distToStructureFromMe <= 2 || self.status === 'defendOldPos') {
        
        let closestDist = 99999;
        let bestLoc = null;
        

        for (let i = 0; i < mapLength; i++) {
          for (let j = 0; j < mapLength; j++) {
            if (i % 2 !== j % 2 ){
              if ((search.emptyPos(j, i , robotMap, gameMap, false) || self.me.id === robotMap[i][j]) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
                let nearestStructureHere = search.findNearestStructureHere(self, j, i, unitsInVision[6]);
                let distToStructure = qmath.dist(j, i, nearestStructureHere.x, nearestStructureHere.y);
                if (distToStructure > 2){
                  let tgt = [self.me.x, self.me.y]
                  if (self.status === 'defendOldPos') {
                    tgt = self.defendTarget;
                  }
                  let thisDist = qmath.dist(tgt[0], tgt[1], j, i);
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
      if (self.status === 'defendOldPos') {
          self.status = 'defend';
        }
    }
  }
  if (self.status === 'attackTarget') {
    
  }
  if (self.status === 'defend' || self.status === 'attackTarget') {
    //if defending, and not evenough friends nearby, perform kite manuevers
    let enemyPositionsToAvoid = [];
    let friendsNearby = 0;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];

      //find position that is the farthest away from all enemies
      if (obot.team === otherTeamNum) {
        let distToEnemy = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        /*
        if (obot.unit === SPECS.PROPHET && distToEnemy <= 80) {
          enemyPositionsToAvoid.push([obot.x, obot.y]);
        }
        */
        if (obot.unit === SPECS.PREACHER && distToEnemy <= 16) {
          enemyPositionsToAvoid.push([obot.x, obot.y]);
        }
        else if (obot.unit === SPECS.CRUSADER && distToEnemy <= 16) {
          enemyPositionsToAvoid.push([obot.x, obot.y]);
        }

      }
      else if (obot.team === self.me.team) {
        if (obot.unit === SPECS.PROPHET || obot.unit === SPECS.CRUSADER || obot.unit === SPECS.PREACHER) {
          friendsNearby += 1;
        }
      }
    }
    if (friendsNearby < 4){
      
      let largestSumDist = null;
      let avoidLocs = [];
      if (enemyPositionsToAvoid.length > 0){
        self.log(`Im trying to kite`);
        self.log(`Prophet sees enemies nearby`)
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
        self.log(`Prophet running away from enemy`)
        avoidLocs.sort(function(a,b) {
          return b.dist - a.dist;
        })
        let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
        return {action:self.move(rels.dx,rels.dy)}
      }
    }
  }
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let enemyBot;
    for (let i = 0; i < robotsInVision.length; i++) {
      let obot = robotsInVision[i];
      
      if (obot.team !== self.me.team) {
        
        let distToThisTarget = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        if (distToThisTarget < leastDistToTarget && distToThisTarget >= 16) {
          leastDistToTarget = distToThisTarget;
          
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
    if (distToEnemy >= 82) {
      
    }
    else {
      //stay put
      return '';
    }
    
  }
  else if (self.status === 'goToTarget') {
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy <= 82) {
      self.moveSpeed = 'fast';
      self.signal(24585, 100);
    }
  }
  
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  let moveFast = true;
  if (self.moveSpeed === 'slow' || self.status === 'defend' || self.status === 'defendOldPos' || self.status === 'attackTarget') {
    moveFast = false;
  }
  if (self.me.turn <= 3) {
    moveFast = true;
  }
  action = self.navigate(self.finalTarget, false, moveFast);
  return {action:action}; 
}

export default {mind}