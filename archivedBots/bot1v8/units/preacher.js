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
    self.status = 'rally';
    self.lastAttackedUnit = null;
    
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    let myCastleLocation = self.knownStructures[self.me.team][0]
    let enemyCastleLocation = self.knownStructures[otherTeamNum][0]
    //DETERMINE RALLY POSITION
    
    //pathing.initializePlanner(self);
    self.setFinalTarget([enemyCastleLocation.x, enemyCastleLocation.y]);
    //self.log(self.path + ': ' + enemyCastleLocation.x + ', ' + enemyCastleLocation.y);
    //check path, and follow it until you are at least a distance away
    let finalNode = [];
    for (let i = 0; i < self.path.length; i+=2) {
      if (qmath.dist(myCastleLocation.x,myCastleLocation.y,self.path[i],self.path[i+1]) >= 10) {
        finalNode = [self.path[i],self.path[i+1]];
        break;
      }
    }
    if (self.path.length === 0) {
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
    self.log(`Rally Point: ${self.rallyTarget}`)
    //self.finalTarget = [exploreTarget[0], exploreTarget[1]];
    
  }
  
  
  let robotsInVision = self.getVisibleRobots();
  
  //SIGNAL PROCESSION
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePreacher(self, msg);
    if(robotsInVision[i].id !== self.me.id){
      //process new target location
      if (msg >= 6 && msg <= 5001) {
        //- 6 for padding
        let newTarget = self.getLocation(msg - 6);
        self.finalTarget = [newTarget.x, newTarget.y];
        self.status = 'searchAndAttack';
        self.allowedToMove = true;
        self.log(`New target: ${self.finalTarget} from message:${msg}`);
      }
      if (msg >= 5002 && msg <= 9997) {
        //-5002 for padding
        
        let enemyCastleLoc = self.getLocation(msg - 5002);
        base.logStructure(self,enemyCastleLoc.x, enemyCastleLoc.y, otherTeamNum, 0);
        self.log(`Received location of enemy castle: ${enemyCastleLoc.x}, ${enemyCastleLoc.y} from message:${msg}`);
      }
      
      if (msg === 5) {
        self.log(`Received ${msg} from ${robotsInVision[i].id}`);
      }
    }
  }
  
  //always update our locations
  base.updateKnownStructures(self);
  /*
  for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
    self.log(`ENEMY Castle at ${self.knownStructures[otherTeamNum][i].x}, ${self.knownStructures[otherTeamNum][i].y}`);
  }
  */
  //defenders and units that are have no final target. If they did, then they must be waiting for a fuel stack to go that target
  if (self.status === 'defend') {
    self.finalTarget = null;
    
    moveApart(self);
  }
  //units rallying go to a rally point sort of, and will end up trying to attack the first known enemy structure
  if (self.status === 'rally'){
    let unitsInVincinity = search.unitsInRadius(self, 36)
    
    
    let distToTarget = qmath.dist(self.me.x, self.me.y, self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y);
    let path2 = [];
    let distToTarget2 = 0;
    if (self.planner !== null){
      distToTarget2 = self.planner.search(self.me.y,self.me.x,self.knownStructures[otherTeamNum][0].y,self.knownStructures[otherTeamNum][0].x,path2);
    }
    else {
      distToTarget2 = qmath.unitDist(self.me.x, self.me.y, self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y)
    }
    //qmath.unitDist(self.me.x, self.me.y, self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y);
    
    //path distance / 2 movement * 12 for fuel cost * 8 for num units
    let fuelNeededForAttack = (distToTarget2/2) * 16 * unitsInVincinity[5].length + 250;
    //self.log(`To attack, we need ${fuelNeededForAttack}`);
    //less fuel is needed if we let preachers move slowly, and then rush in once near target
    
    if (unitsInVincinity[5].length >= 7) {
      if (self.fuel >= fuelNeededForAttack){
        self.status = 'searchAndAttack';
        //once we send the warcry, on average each turn the preachers spend 72 fuel to move
        //Once they start attacking enemies, they spend 15 fuel, so we need to wait until fuel is enough
        self.signal(1,36);//note, this signal will be broadcasted to other units at where this unit is at the end of its turn
        forcedAction = '';
        
        //tell castles they may continue building, karbonite etc.
        //self.castleTalk(7);
      }
      else {
        //tell castles to stop building, stack fuel for attack
        self.castleTalk(6);
      }
    }
    else if (self.me.turn !== 1){
      //self.castleTalk(7);
    }
    //self.log('c:' + self.finalTarget );
    //We force the unit to stay away from each other
    
    //if we are farther from enemy castle than our own castle, recalc.
    let fartherAway = false;
    if (qmath.dist(self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y,self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y) <= qmath.dist(self.me.x, self.me.y,self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y)){
      //self.log(`Im far`);
      fartherAway = true;
    }
    if (self.me.x % 2 === 0 || self.me.y % 2 === 0) {
        let closestDist = 99999;
        let bestLoc = null;
        for (let i = 0; i < gameMap.length; i++) {
          for (let j = 0; j < gameMap[0].length; j++) {
            if (i % 2 === 1 && j % 2 === 1){
              if (search.emptyPos(j, i , robotMap, gameMap)){
                //assuming final target when rallying is the rally targt
                let thisDist = qmath.dist(self.rallyTarget[0], self.rallyTarget[1], j, i);
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
  
  
  //DECISIONS
  
  
  if (self.status === 'searchAndAttack') {
    if (self.knownStructures[otherTeamNum].length > 0){
      self.finalTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
    }
  }
  
  //robot is waiting for enough fuel to start another war charge
  if (self.status === 'waitingForFuelStack') {
    self.log(`Waiting for fuel stack:${self.fuelNeeded}`);
    let unitsInVincinity = search.unitsInRadius(self, 36);
    
    moveApart(self);
    /*
    let path2 = [];
    let distToTarget2 = 0;
    if (self.planner !== null){
      distToTarget2 = self.planner.search(self.me.y,self.me.x,self.finalTarget[1], self.finalTarget[0],path2);
    }
    else {
      distToTarget2 = qmath.unitDist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    }
    
    self.fuelNeeded = (distToTarget2/2) * 12 * 6 + 250;//unitsInVincinity[5].length;
    */
    if (self.fuelNeeded <= self.fuel) {
      self.signal(self.signalToSendAfterFuelIsMet, 36);
      self.status = 'searchAndAttack';
      self.allowedToMove = true;
      forcedAction = '';
      //self.castleTalk(7);
    }
    else {
      //tell castle to pause
      self.allowedToMove = false;
      self.castleTalk(6);
    }
  }
  
  
  if (self.status === 'searchAndAttack' || self.status === 'rally' || self.status === 'defend' || self.status === 'exploreAndAttack' || self.status === 'waitingForFuelStack') {
    //watch for enemies, then chase them
    //call out friends to chase as well?, well enemy might only send scout, so we might get led to the wrong place
    let leastDistToTarget = 99999999;
    let isEnemy = false;
    let attackLoc = {};
    
    let mostUnitsAttacked = -100;
    
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
          let checkPositions = search.circle(self, j, i, 2);
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
    
    let existEnemy = false;
    let enemyToAttack = null;
    for (let i = 0; i < robotsInVision.length; i++) {
      let oVisRobot = robotsInVision[i];
  
      //check if they defined or not, because of some bugs with bc19 i think
      if (oVisRobot.x !== undefined && oVisRobot.y !== undefined){
        let checkPositions = search.circle(self, oVisRobot.x, oVisRobot.y, 2);
        let unitsAttacked = 0;
        if (oVisRobot.id !== self.me.id){
          for (let k = 0; k < checkPositions.length; k++) {
            let checkPos = checkPositions[k];
            if (search.inArr(checkPos[0], checkPos[1], robotMap)){
              //self.log(`Check xy: ${checkPos}`);
              let oRobotId = robotMap[checkPos[1]][checkPos[0]];
              //self.log(`id:${oRobotId}`);
              //ok if hit self
              if (oRobotId > 0) {
                let oRobot = self.getRobot(oRobotId);
                //if other team, add to number of affected enemies
                //Strategy is to hit as many enemies as possible and as little friendlies as possible
                if (oRobot.team !== self.me.team) {
                  unitsAttacked += 1; //enemy team hit
                  existEnemy = true;
                  enemyToAttack = oRobot;
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
          }

          if (mostUnitsAttacked < unitsAttacked && existEnemy === true) {
            attackLoc = {x:oVisRobot.x,y:oVisRobot.y};
            mostUnitsAttacked = unitsAttacked;
            isEnemy = true;
          }
        }
      }
    }
    if (self.lastAttackedUnit !== null) {
      
      //This batch of code determins whether or not a castle was just killed. If so, we make the robot find a new target to run towards, preferably the furthest distance away that likely has a blue enemy, and then tell the other units to go there as well.
      if (self.lastAttackedUnit.unit  === SPECS.CASTLE) {
        self.log(`checking if castle is still there`)
        
        let unitIdThere = robotMap[self.lastAttackedUnit.y][self.lastAttackedUnit.x];
        if (unitIdThere !== self.lastAttackedUnit.id) {
          self.log(`Killed castle`);
          //destroyed the castle, now have all units move elsewhere

          let longestDistance = 0;
          let newLoc = [self.knownStructures[self.me.team][0].x,self.knownStructures[self.me.team][0].y];
          //self.lastAttackedUnit = null;
          //self.status = 'searchAndAttack';
          
          if (self.knownStructures[otherTeamNum].length) {
            let ln = self.knownStructures[otherTeamNum].length;
            newLoc = [self.knownStructures[otherTeamNum][1].x, self.knownStructures[otherTeamNum][1].y];
          }
          else {
            //IMPLEMENT TODO: if there is no next enemy left, go back home and defend
          }
          self.log('Next enemy: ' + newLoc);
          let path2 = [];
          let distToTarget2 = 0;
          if (self.planner !== null){
            distToTarget2 = self.planner.search(self.me.y,self.me.x,newLoc[1], newLoc[0],path2);
          }
          else {
            distToTarget2 = qmath.unitDist(self.me.x, self.me.y, newLoc[0], newLoc[1]);
          }
          let fuelNeededForAttack = (distToTarget2/2) * 16 * 7 + 250;
          self.log(`Just killed castle, need ${fuelNeededForAttack}`);
          let compressedLocationHash = self.compressLocation(newLoc[0], newLoc[1]);
          //padding hash by 6
          self.status = 'waitingForFuelStack';
          self.signalToSendAfterFuelIsMet = 6 + compressedLocationHash;
          self.fuelNeeded = fuelNeededForAttack;
          //self.signal(5 + compressedLocationHash, 36);
          self.finalTarget = newLoc;
          self.allowedToMove = false;
          
          //send signal to tell bots to stop moving and wait for fuel stack
          self.signal(5, 36);
          //self.log(`Initial New target: ${self.finalTarget}`);
          self.lastAttackedUnit = null;
          
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
        self.lastAttackedUnit = enemyToAttack
        action = self.attack(rels.dx,rels.dy)
        return {action:action};
      }
    }
  }
  
  
  
  //PROCESSING FINAL TARGET
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  if (self.allowedToMove === true){
    action = self.navigate(self.finalTarget);
  }
  else {
    action = '';
  }
  return {action:action}; 
}

function moveApart(self) {
  let gameMap = self.map;
  let robotMap = self.getVisibleRobotMap();
  if (self.me.x % 2 === 0 || self.me.y %2 === 0) {
    let closestDist = 99999;
    let bestLoc = null;
    for (let i = 0; i < gameMap.length; i++) {
      for (let j = 0; j < gameMap[0].length; j++) {
        if (i % 2 === 1 && j % 2 === 1){
          if (search.emptyPos(j, i , robotMap, gameMap)){
            let thisDist = qmath.dist(self.me.x, self.me.y, j, i);
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
    }
  }
}


export default {mind}