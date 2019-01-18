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
  let otherTeamNum = (self.me.team + 1) % 2;
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
    self.churchBuilt = false;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    let initialized = self.initializeCastleLocations();
    if (initialized){
      self.originalCastleLocation = [self.knownStructures[self.me.team][0].x, self.knownStructures[self.me.team][0].y]
    }
    else {
      //pilgrim isnt built by castle, defaults to mining the closest thing it sees
      self.status = 'searchForAnyDeposit';
      self.churchBuilt = true;
      self.searchAny = true;
    }
    
    self.target = [self.me.x,self.me.y];
    self.finalTarget = [self.me.x, self.me.y];
  }
  
  //initializing planner
  if (self.me.turn === 5) {
    self.log('Trying to plan');
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
    //self.status = 'searchForKarbDeposit';
  }
  
  //SIGNAL PROCESSION
  let robotsInVision = self.getVisibleRobots();
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].signal;
    signal.processMessagePilgrim(self, msg);
  }

  //DECISION MAKING
  
  //regardless, pilgrim tries to stay out of shooting range
  let farthestdist;
  let enemyPositionsToAvoid = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    
    //find position that is the farthest away from all enemies
    if (obot.team === otherTeamNum) {
      let distToEnemy = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (obot.unit === SPECS.PROPHET && distToEnemy <= 80) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      else if (obot.unit === SPECS.PREACHER && distToEnemy <= 36) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      
    }
  }
  let largestSumDist = null;
  let avoidLocs = [];
  if (enemyPositionsToAvoid.length > 0){
    self.log(`Pilgrim sees enemies nearby`)
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
    self.log(`Pilgrim running away from enemy`)
    avoidLocs.sort(function(a,b) {
      return b.dist - a.dist;
    })
    let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
    return {action:self.move(rels.dx,rels.dy)}
  }
  
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
      if (self.churchBuilt === true || self.searchAny === true) {
        self.status = 'searchForAnyDeposit';
      }
    }
  }
  //search for deposit, set new finalTarget and set path
  if (self.status === 'searchForKarbDeposit' || self.status === 'searchForFuelDeposit') {
    //perform search for closest deposit
    let newTarget = null;
    let cd = 9999990;
    if (self.status === 'searchForFuelDeposit' || self.status === 'searchForAnyDeposit'){
    
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
      self.finalTarget = [newTarget[0],newTarget[1]];
    }
    if (self.status === 'searchForKarbDeposit' || self.status === 'searchForAnyDeposit'){
      for (let i = 0; i < self.karboniteSpots.length; i++) {
        let nx = self.karboniteSpots[i].x;
        let ny = self.karboniteSpots[i].y;
        let proceed = true;

        if (robotMap[ny][nx] <= 0 || robotMap[ny][nx] === self.me.id){
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
      if (newTarget !== null){
        self.status = 'goingToKarbDeposit'
        if (self.karbonite >= 0) {
          let nearestStructure = search.findNearestStructure(self);
          self.log(`nearest struct is ${nearestStructure.x}, ${nearestStructure.y}, karb target is ${newTarget}`);
          if (qmath.dist(newTarget[0], newTarget[1],nearestStructure.x, nearestStructure.y) > 10) {
            //if far enough, try to build church there
            self.status = 'building';
            //search all around karb deposit
            let mostDeposits = 0;
            let buildLoc = null;
            let positionsAroundDeposit = search.circle(self, newTarget[0], newTarget[1], 2);
            for (let k = 0; k < positionsAroundDeposit.length; k++) {
              let px = positionsAroundDeposit[k][0];
              let py = positionsAroundDeposit[k][1];
              if (fuelMap[py][px] === false && karboniteMap[py][px] === false) {
                let numDepositsHere = numberOfDeposits(self, px, py);
                if (numDepositsHere > mostDeposits) {
                  mostDeposits = numDepositsHere;
                  buildLoc = [px, py];
                }
              }
            }
            if (buildLoc !== null) {
              self.buildTarget = buildLoc;

            }
            else {
              self.status = 'goingToKarbDeposit';
            }
          }
          else {
            self.status = 'goingToKarbDeposit';
          }
        }
        self.finalTarget = [newTarget[0],newTarget[1]];
      }
    }
    if (self.status === 'searchForAnyDeposit') {
    }
    
    
  }

  if (((self.me.fuel >= 100 || self.me.karbonite >= 20) || self.status === 'return') && self.status !== 'building') {
    //send karbo
    let bestTarget = search.findNearestStructure(self);
    self.finalTarget = [bestTarget.x, bestTarget.y];
    self.status = 'return';

    let currRels = base.rel(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
      self.status = 'searchForKarbDeposit';
      if (self.fuel <= 100) {
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
  
  if (self.status === 'searchForBuildLocation') {
    self.castleTalk(6);
    let newTarget = null;
    let moveTarget = null;
    let cd = 9999990;
    for (let i = 0; i < self.fuelSpots.length; i++) {
      let nx = self.fuelSpots[i].x;
      let ny = self.fuelSpots[i].y;
      if (qmath.dist(self.me.x, self.me.y, nx, ny) >= 10){
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
          moveTarget = [nx, ny];
          //newTarget = [nx,ny];
          let mostSpots = 0;
          let checkPositions = search.circle(self, nx, ny, 2);
          for (let k = 0; k < checkPositions.length; k++) {
            let checkPos = checkPositions[k];
            if (fuelMap[checkPos[1]][checkPos[0]] === false && fuelMap[checkPos[1]][checkPos[0]] === false) {
              let positionsAround = search.circle(self, checkPos[0], checkPos[1], 2);
              let spotsHere = 0;
              for (let j = 0; j < positionsAround.length; j++) {
                let px = positionsAround[j][0];
                let py = positionsAround[j][1];
                if (fuelMap[py][px] === true || karboniteMap[py][px] === true) {
                  spotsHere += 1;
                }
              }
              if (spotsHere > mostSpots) {
                newTarget = [checkPos[0], checkPos[1]];
                mostSpots = spotsHere;
              }
            }
          }
          
        }
      }
    }
    self.buildTarget = null;
    if (newTarget !== null){
      self.buildTarget = newTarget;
      self.finalTarget = moveTarget;
      self.status = 'building';
    }
    else {
      
    }
    self.log(`Trying to build at ${self.buildTarget}`)
  }
  if (self.status === 'building') {
    if (self.me.turn > 1){
      //make sure we don't confuddle the signal for counting units
      self.castleTalk(71);
    }
    let robotThere = self.getRobot(robotMap[self.buildTarget[1]][self.buildTarget[0]]);
    if (robotThere !== null && (robotThere.unit === SPECS.CHURCH)){
      self.status = 'searchForKarbDeposit';
      self.log(`Church built already`);
    }
    else {
      if (self.me.x === self.finalTarget[0] && self.me.y === self.finalTarget[1]) {
        let rels = base.rel(self.me.x, self.me.y, self.buildTarget[0], self.buildTarget[1]);
        self.log(`TRIED TO BUILD: ${rels.dx}, ${rels.dy}`);
        if (self.fuel >= 200 && self.karbonite + self.me.karbonite >= 50){
          if (self.fuel <= 100){
            self.status = 'searchForFuelDeposit';
          }
          else {
            self.status = 'searchForKarbDeposit';
          }
          return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)}
        }
        else {
          self.log(`NOT ENOUGH RESOURCES: fuel:${self.fuel}; karb: ${self.karbonite}`);
        }
      }
      //dont stand on the build target, leave it if the final target has a pilgrim on it already
      let pilgrimOnFinalTarget = self.getRobot(robotMap[self.finalTarget[1]][self.finalTarget[0]]);
      if (pilgrimOnFinalTarget !== null && pilgrimOnFinalTarget.team === self.me.team && pilgrimOnFinalTarget.unit === SPECS.PILGRIM && self.me.id !== pilgrimOnFinalTarget.id){
        self.log(`already a unit building there`);
          self.status = 'searchForFuelDeposit';
      }
      /*
      self.log(`Checking`)
      let pilgrimOnFinalTarget = self.getRobot(robotMap[self.finalTarget[1]][self.finalTarget[0]]);
      if (pilgrimOnFinalTarget !== null && pilgrimOnFinalTarget.team === self.me.team && pilgrimOnFinalTarget.unit === SPECS.PILGRIM){
        if (self.me.x === self.buildTarget[0] && self.me.y === self.buildTarget[1]) {
          let leavePositions = search.circle(self, self.me.x, self.me.y, 2);
          for (let i = 0; i < leavePositions.length; i++) {
            let pos = leavePositions[i];
            let orobot = self.getRobot(robotMap[pos[1]][pos[0]]);
            if (orobot === null && gameMap[pos[1]][pos[0]] === true) {
              self.log(`Moved away from build target`)
              let rels = base.rel(self.me.x, self.me.y, pos[0], pos[1]);
              return {action:self.move(rels.dx, rels.dy)};
            }
          }
        }
      }
      */
    }
  }
  //forever mine
  if (karboniteMap[self.me.y][self.me.x] === true && (self.status === 'goingToKarbDeposit' || self.status === 'mine' || self.status === 'building')) {
    action = self.mine();
    if (self.status !== 'building') {
    
      self.status = 'mine';
    }
    return {action:action}; 
  }
  else if (fuelMap[self.me.y][self.me.x] === true && (self.status === 'goingToFuelDeposit' || self.status === 'mine')) {
    action = self.mine();
    if (self.status !== 'building') {
    
      self.status = 'mine';
    }
    //self.build(SPECS.CHURCH, 0, 1);
    //ADD CHURCH CODE
    return {action:action}; 
  }
  else 
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  action = self.navigate(self.finalTarget);
  return {action:action};

  //return self.move(0,0);
}

function numberOfDeposits(self, nx, ny) {
  let checkPositions = search.circle(self, nx, ny, 2);
  let numDeposits = 0;
  let fuelMap = self.getFuelMap();
  let karbMap = self.getKarboniteMap();
  for (let i = 0; i < checkPositions.length; i++) {
    let cx = checkPositions[i][0];
    let cy = checkPositions[i][1];
    if (fuelMap[cy][cx] === true || karbMap[cy][cx] === true) {
      numDeposits += 1;
    }
  }
  return numDeposits;
}

export default {mind}