import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';
import attack from '../attack.js';



function mind(self){
  let gameMap = self.map;
  let mapLength = self.map.length;
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  
  let forcedAction = null;
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  let robotMap = self.getVisibleRobotMap();
  
  self.log(`Preacher (${self.me.x}, ${self.me.y}); Status: ${self.status}; Final Target: ${self.finalTarget}`);
  //STRATS:
  //3 preacher defence. build a pilgrim then 3 preachers
  
  
  //INITIALIZATION
  if (self.me.turn === 5) {
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  if (self.me.turn === 1) {
    
    self.castleTalk(self.me.unit);
    self.allowedToMove = true;
    self.finalTarget = [self.me.x, self.me.y];
    self.status = 'defend';
    self.oldStatus = 'defend';
    self.lastAttackedUnit = null;
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    let initializedCastles = self.initializeCastleLocations();
    self.log(`initialized castles: ${initializedCastles}`);
    if (initializedCastles){
      let myCastleLocation = self.knownStructures[self.me.team][0]
      let enemyCastleLocation = self.knownStructures[otherTeamNum][0]
      //DETERMINE RALLY POSITION

      //pathing.initializePlanner(self);
      self.setFinalTarget([enemyCastleLocation.x, enemyCastleLocation.y]);
      //self.log(self.path + ': ' + enemyCastleLocation.x + ', ' + enemyCastleLocation.y);
      //check path, and follow it until you are at least a distance away
      let finalNode = [];
      let selfPathLength = self.path.length;
      for (let i = 0; i < selfPathLength; i+=2) {
        if (qmath.dist(myCastleLocation.x,myCastleLocation.y,self.path[i],self.path[i+1]) >= 10) {
          finalNode = [self.path[i],self.path[i+1]];
          break;
        }
      }
      if (selfPathLength === 0) {
        finalNode = [enemyCastleLocation.x, enemyCastleLocation.y];
      }
      //self.log('First here:' + finalNode);
      let rels = base.relToPos(self.me.x, self.me.y, finalNode[0], finalNode[1], self);
      //self.log(rels);
      let rels2 = base.relToPos(self.me.x + rels.dx, self.me.y+rels.dy, finalNode[0], finalNode[1], self);
      let rels3 = base.relToPos(self.me.x + rels.dx + rels2.dx, self.me.y+rels.dy + rels2.dy, finalNode[0], finalNode[1], self);
      let relsx = self.me.x + rels.dx + rels2.dx + rels3.x
      /*
      pathing.initializePlanner(self);
      self.setFinalTarget(exploreTarget[0],exploreTarget[1]);
      let path = [];
      planner.search(self.me.y,self.me.x,self.finalTarget[1],self.finalTarget[0],path);
      self.log(path);
      */


      self.rallyTarget = [self.me.x + rels.dx + rels2.dx, self.me.y + rels.dy + rels2.dy];

      self.finalTarget = [self.me.x + rels.dx + rels2.dx, self.me.y + rels.dy + rels2.dy];
      //self.rallyTarget = [self.me.x, self.me.y];
      //self.finalTarget = [self.me.x, self.me.y];
      self.log(`Rally Point: ${self.rallyTarget}`)
      self.defendTarget = self.rallyTarget;
    }
    else {
      //set defending target
      self.status = 'defend';
      self.oldStatus = 'defend';
      self.defendTarget = [self.me.x, self.me.y];
      self.finalTarget = [self.me.x, self.me.y];
    }
    
    self.origStructureLoc = null;
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
    
    //self.finalTarget = [exploreTarget[0], exploreTarget[1]];
    
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  let unitsInVision = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePreacher(self, msg);
    if(robotsInVision[i].id !== self.me.id){
      //process new target location
      if (msg >= 12294 && msg <= 16389) {
        if (self.status !== 'attackTarget') {
          //if setting new status, old status gets updated.
          self.oldStatus = self.status;
        }
        self.status = 'attackTarget';
        let padding = 12294;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to defend against enemy at ${self.finalTarget}`);
      }
      else if (msg >= 16392 && msg <= 20487) {
        if (self.status !== 'goToTarget') {
          self.oldStatus = self.status;
        }
        self.status = 'goToTarget';
        
        let padding = 16392;
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.log(`Preparing to attack enemy at ${self.finalTarget}`);
      }
      else if (msg >= 20488 && msg <= 24583) {
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
      else if (msg >= 29003 && msg <= 33098) {
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
      if (msg === 5) {
        self.log(`Received ${msg} from ${robotsInVision[i].id}`);
      }
      
    }
    if (robotsInVision[i].unit === SPECS.CHURCH) {
      unitsInVision[6].push(robotsInVision[i]);
    }
  }
  
  //always update our locations and send death of enemy castle signal if possible
  base.updateKnownStructures(self);

  let nearestStructure = search.findNearestStructure(self);
  let distToStructureFromMe = qmath.dist(self.me.x, self.me.y, nearestStructure.x, nearestStructure.y);
  //defenders and units that are have no final target. If they did, then they must be waiting for a fuel stack to go that target
  if (self.status === 'defend' || self.status === 'defendOldPos') {
    //SPEED IMPROVEMENT USING BFS.
    if ((self.me.x % 2 === 1 && self.me.y % 2 === 1 ) || (self.me.x % 2 === 0 && self.me.y % 2 === 0) || fuelMap[self.me.y][self.me.x] === true || karboniteMap[self.me.y][self.me.x] === true || distToStructureFromMe <= 2 || self.status === 'defendOldPos') {
      let closestDist = 99999;
      let bestLoc = null;
      let nearestStructure = search.findNearestStructure(self);
      for (let i = 0; i < mapLength; i++) {
        for (let j = 0; j < mapLength; j++) {
          if (i % 2 !== j % 2){
            //position can also not be next to structure
            if ((search.emptyPos(j, i , robotMap, gameMap, false) || self.me.id === robotMap[i][j]) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
              //assuming final target when rallying is the rally targt
             
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
  if (self.status === 'searchAndAttack') {
    if (self.knownStructures[otherTeamNum].length){
      self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
    }
    else {
      self.status = 'defend';
    }
  }
  //DECISIONS
  
  if (self.status === 'attackTarget') {
    
  }
  if (self.status === 'goToTarget') {
    
  }
  if (self.status === 'defend' || self.status === 'attackTarget' || self.status === 'goToTarget' || self.status === 'searchAndAttack') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    
    let attackLoc = attack.attackNearestAOE(self);
    
    
    //check if castle is destroyed
    if (self.destroyedCastle === true) {
      self.log(`Killed castle`);
      self.destroyedCastle = false;
      //CASTLE DESTROYED!

      //destroyed the castle, now have all units move elsewhere

      let longestDistance = 0;
      let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];

      self.log(`Destroyed castle, now going to ${newLoc}`);
      let compressedLocationHash = self.compressLocation(newLoc[0], newLoc[1]);
      //padding hash by 6
      self.status = 'defend';



    }
    //enemy nearby, attack it?
    if (attackLoc !== null) {
      //let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let rels = base.rel(self.me.x, self.me.y, attackLoc.x, attackLoc.y);
      //self.log(`Attack ${rels.dx},${rels.dy}`);
      self.log(`Preacher Attacks ${rels.dx},${rels.dy}`);
      if (self.readyAttack()){
        //self.lastAttackedUnit = robotToAttack
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
    }
  }

  if (self.status === 'attackTarget') {
    //finaltarget is enemy target pos.
    /*
    let distToEnemy = qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (distToEnemy >= 50) {
      
    }
    else {
      //stay put
      return '';
    }
    */
  }
  if (self.status === 'goToTarget') {
    
  }
  
  //PROCESSING FINAL TARGET
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  if (self.allowedToMove === true){
    let avoidFriends = false;
    let moveFast = true;
    if (self.status === 'attackTarget'){
      //avoidFriends = true;
    }
    if (self.me.turn <= 3 && self.status === 'defend') {
      //initially, allow bot to move freely if its not attackinga
      avoidFriends = false;
    }
    if (self.status === 'rally') {
      moveFast = false;
    }
    self.log(`STAUS:${self.status}`);
    action = self.navigate(self.finalTarget, avoidFriends, moveFast);
  }
  else {
    action = '';
  }
  return {action:action};
}

export default {mind}