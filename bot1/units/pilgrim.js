import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';
function mind(self) {
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)]
  
  self.log(`Pilgrim (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();
  //we can improve the speed here by using bfs
  
  let action = '';
  let gameMap = self.map;
  
  let forcedAction = null;
  
  //INITIALIZATION
  if (self.me.turn === 1) {
    //for pilgrims, search first
    self.status = 'searchForKarbDeposit';
    
    //self.log(`${self.knownStructures[self.me.team][0].x}`);
    /*
    let castleId = robotMap[origCastleLoc[1]][origCastleLoc[0]];
    let castleSignal = self.getRobot(castleId).signal;
    self.log(`Signal from born castle-${castleId}: ${castleSignal}`)
    */
    self.castleTalk(self.me.unit);
    
    for (let i = 0; i < fuelMap.length; i++) {
      for (let j = 0; j < fuelMap[0].length; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
        }
      }
    }
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    self.initializeCastleLocations();
    
    
    
    self.target = [self.me.x,self.me.y];
    self.finalTarget = [self.me.x, self.me.y];
  }
  
  //initializing planner
  if (self.me.turn === 5) {
    self.log('Trying to plan');
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
    self.status = 'searchForKarbDeposit';
  }
  
  //SIGNAL PROCESSION
  let robotsInVision = self.getVisibleRobots();
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePilgrim(self, msg);
  }

  //DECISION MAKING
  
  //if robot is going to deposit but it is taken up, search for new deposit loc.
  if (self.status === 'goingToKarbDeposit' || self.status === 'goingToFuelDeposit') {
    //self.log(`Robotmap at 11,11 ${robotMap[self.finalTarget[1]][self.finalTarget[0]]}`)
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0){
      if (self.status === 'goingToKarbDeposit'){
        self.status = 'searchForKarbDeposit';
      }
      else {
        self.status = 'searchForFuelDeposit';
      }
    }
  }
  //search for deposit, set new finalTarget and set path
  if (self.status === 'searchForKarbDeposit' || self.status === 'searchForFuelDeposit') {
    //perform search for closest deposit
    let newTarget;
    let cd = 9999990;
    if (self.status === 'searchForFuelDeposit'){
    
      for (let i = 0; i < self.fuelSpots.length; i++) {
        let nx = self.fuelSpots[i].x;
        let ny = self.fuelSpots[i].y;
        if (robotMap[ny][nx] <= 0){
          let patharr = [];
          let distToThere = 0;
          if (self.planner !== null) {
            distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
          }
          else {
            distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
          }

          if (distToThere < cd) {
            cd = distToThere;
            newTarget = [nx,ny];
          }
        }
      }
      self.status = 'goingToFuelDeposit';
    }
    if (self.status === 'searchForKarbDeposit'){
      for (let i = 0; i < self.karboniteSpots.length; i++) {
        let nx = self.karboniteSpots[i].x;
        let ny = self.karboniteSpots[i].y;
        if (robotMap[ny][nx] <= 0){
          let patharr = [];
          let distToThere = 0;
          if (self.planner !== null) {
            distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
          }
          else {
            distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
          }
          if (distToThere < cd) {
            cd = distToThere;
            newTarget = [nx,ny];
          }
        }
      }
      self.status = 'goingToKarbDeposit';
    }
    
    self.finalTarget = [newTarget[0],newTarget[1]];
  }

  if ((self.me.fuel >= 100 || self.me.karbonite >= 20) || self.status === 'return') {
    //send karbo
    let bestTarget = search.findNearestStructure(self);
    self.finalTarget = [bestTarget.x, bestTarget.y];
    self.status = 'return';

    let currRels = base.rel(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
      self.status = 'searchForKarbDeposit';
      if (self.fuel <= 100 || self.karbonite >= 100) {
        self.status = 'searchForFuelDeposit';
      }
      else {
        self.status = 'searchForKarbDeposit';
      }
      self.signal(4,2);
      action = self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel);
      return {action:action}; 
    }
  }
  
  //forever mine
  if (fuelMap[self.me.y][self.me.x] === true && (self.status === 'goingToFuelDeposit' || self.status === 'mine')) {
    action = self.mine();
    self.status = 'mine';
    return {action:action}; 
  }
  else if (karboniteMap[self.me.y][self.me.x] === true && (self.status === 'goingToKarbDeposit' || self.status === 'mine')) {
    action = self.mine();
    self.status = 'mine';
    return {action:action}; 
  }
  
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  action = self.navigate(self.finalTarget);
  return {action:action};

  //return self.move(0,0);
}

export default {mind}