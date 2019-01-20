import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';
function mind(self) {
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)]
  
  self.log(`Round: ${self.globalTurn}; Pilgrim (${self.me.x}, ${self.me.y}); Status: ${self.status}; ${self.me.time}ms left`);
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();
  //we can improve the speed here by using bfs
  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  let gameMap = self.map;
  
  let forcedAction = null;
  //INITIALIZATION
  self.globalTurn += 1;
  if (self.me.turn === 1) {
    //for pilgrims, search first
    self.searchQueue = [];
    self.statusBeforeReturn = '';
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
    self.searchAny = false;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    let initialized = self.initializeCastleLocations();
    if (initialized){
      self.originalCastleLocation = [self.knownStructures[self.me.team][0].x, self.knownStructures[self.me.team][0].y]
      //let castleRobot = self.getRobot(robotMap[self.knownStructures[self.me.team][0].y][self.knownStructures[self.me.team][0].y]);
      self.globalTurn = initialized.turn;
      self.globalTurn += 1;
    }
    else {
      //pilgrim isnt built by castle, defaults to mining the closest thing it sees
      self.status = 'searchForAnyDeposit';
      self.churchBuilt = true;
      self.searchAny = true;
    }
    
    if (self.globalTurn >= 50) {
      self.status = 'searchForAnyDeposit';
    }
    
    self.target = [self.me.x,self.me.y];
    self.finalTarget = [self.me.x, self.me.y];
    if (!self.mapIsHorizontal) {
      self.halfPoint = gameMap[0].length/2;
      if (self.me.x < gameMap[0].length/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }
      self.log(`Half x: ${self.halfPoint}, i'm on lower half:${self.lowerHalf}`);
    }
    else {
      self.halfPoint = gameMap.length/2;
      if (self.me.y < gameMap.length/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }
      self.log(`Half y: ${self.halfPoint}, i'm on lower half:${self.lowerHalf}`);
    }
    
    //self.log(`I'm on my own half? ${which}`);
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
      else if (obot.unit === SPECS.PREACHER && distToEnemy <= 64) {
        enemyPositionsToAvoid.push([obot.x, obot.y]);
      }
      else if (obot.unit === SPECS.CRUSADER && distToEnemy <= 36) {
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
    self.status = 'goingToAnyDeposit';
    return {action:self.move(rels.dx,rels.dy)}
  }
  
  //if robot is going to deposit but it is taken up, go to next deposit location in queue, otherwise re-search that queue
  if (self.status === 'goingToKarbDeposit' || self.status === 'goingToFuelDeposit' || self.status === 'goingToAnyDeposit') {
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0){
      if (self.status === 'goingToKarbDeposit'){
        //self.status = 'searchForKarbDeposit';
        self.castleTalk(73);
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
        }
        else {
          //self.log(`Spot Taken: ${self.finalTarget}`)
          let nextLoc = self.searchQueue.pop().position;
          //self.log(`switching to ${nextLoc}`);
          self.finalTarget = nextLoc;
          
        }
      }
      else if (self.status === 'goingToFuelDeposit'){
        self.castleTalk(74);
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
          
        }
        else {
          let nextLoc = self.searchQueue.pop().position;
          self.finalTarget = nextLoc;
        }
      }
      else if (self.churchBuilt === true || self.searchAny === true || self.status === 'goingToAnyDeposit') {
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
        }
        else {
          let nextLoc = self.searchQueue.pop().position;
          self.log(`Spot Taken: ${self.finalTarget}, switching to ${nextLoc}`);
          self.finalTarget = nextLoc;
        }
      }
    }
  }
  //search for deposit, set new finalTarget and store it to self.searchQueue
  if (self.status === 'searchForKarbDeposit' || self.status === 'searchForFuelDeposit') {
    //perform search for closest deposit
    let newTarget = null;
    let cd = 9999990;
    if (self.status === 'searchForFuelDeposit'){
    
      for (let i = 0; i < self.fuelSpots.length; i++) {
        let nx = self.fuelSpots[i].x;
        let ny = self.fuelSpots[i].y;
        if ((robotMap[ny][nx] <= 0 || robotMap[ny][nx] === self.me.id) && safeDeposit(self, nx, ny)){
          let patharr = [];
          let distToThere = 0;
          if (self.planner !== null) {
            distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
          }
          else {
            distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
          }
          self.searchQueue.push({position: [nx,ny], distance: distToThere});
        }
      }
      
      //IMPROVEMENT< we should dynamically sort this queue, using unshift and push will possibly be faster.
      self.searchQueue.sort(function(a,b){
        return b.distance - a.distance
      });
      if (self.searchQueue.length > 0){
        self.status = 'goingToFuelDeposit';
        self.finalTarget = self.searchQueue.pop().position;
      }
    }
    if (self.status === 'searchForKarbDeposit'){
      self.searchQueue = [];
      for (let i = 0; i < self.karboniteSpots.length; i++) {
        let nx = self.karboniteSpots[i].x;
        let ny = self.karboniteSpots[i].y;
        let proceed = true;

        if ((robotMap[ny][nx] <= 0 || robotMap[ny][nx] === self.me.id) && safeDeposit(self, nx, ny)){
          let patharr = [];
          let distToThere = 0;
          if (self.planner !== null) {
            distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
          }
          else {
            distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
          }
          self.searchQueue.push({position: [nx,ny], distance: distToThere});
        }
      }
      self.searchQueue.sort(function(a,b){
        return b.distance - a.distance
      });
     
      if (self.searchQueue.length > 0){
        self.status = 'goingToKarbDeposit'
        self.finalTarget = self.searchQueue.pop().position;
      }
    }    
  }

  if (self.status === 'searchForAnyDeposit') {
    self.searchQueue = [];
    let cd = 9999999;
    let newTarget = null;
    for (let i = 0; i < self.fuelSpots.length; i++) {
      let nx = self.fuelSpots[i].x;
      let ny = self.fuelSpots[i].y;
      if ((robotMap[ny][nx] <= 0 || robotMap[ny][nx] === self.me.id) && safeDeposit(self, nx, ny)){
        let patharr = [];
        let distToThere = 0;
        if (self.planner !== null) {
          distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
        }
        else {
          distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
        }
        self.searchQueue.push({position: [nx,ny], distance: distToThere});
      }
    }
    for (let i = 0; i < self.karboniteSpots.length; i++) {
      let nx = self.karboniteSpots[i].x;
      let ny = self.karboniteSpots[i].y;
      let proceed = true;

      if ((robotMap[ny][nx] <= 0 || robotMap[ny][nx] === self.me.id) && safeDeposit(self, nx, ny)){
        let patharr = [];
        let distToThere = 0;
        if (self.planner !== null) {
          distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
        }
        else {
          distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
        }
        self.searchQueue.push({position: [nx,ny], distance: distToThere});
      }
    }
    self.searchQueue.sort(function(a,b){
      return b.distance - a.distance
    });
    
    if (self.searchQueue.length > 0){
      self.finalTarget = self.searchQueue.pop().position;
      self.status = 'goingToAnyDeposit';
      self.log(`Going to ${self.finalTarget}`);
    }
  }
  
  
  //if we are tyring to build, return iff structure is near
  if (((self.me.fuel >= 100 || self.me.karbonite >= 20) || self.status === 'return') && self.status !== 'building') {
    //send karbo
    if (self.status === 'mineKarb' || self.status === 'mineFuel') {
      self.statusBeforeReturn = self.status;
    }
    
    //we continue to tell castles taht this unit was mining karbonite to prevent castles from accidentally assigning pilgrims to mine a spot already taken up
    if (self.statusBeforeReturn === 'mineKarb') {
      self.castleTalk(73);
    }
    else if (self.statusBeforeReturn === 'mineFuel') {
      self.castleTalk(74);
    }
    let bestTarget = search.findNearestStructure(self);
    self.finalTarget = [bestTarget.x, bestTarget.y];
    self.status = 'return';

    let currRels = base.rel(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
    if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
      
      self.status = 'searchForAnyDeposit';
      /*
      if (self.fuel <= 100) {
        self.status = 'searchForFuelDeposit';
      }
      else {
        self.status = 'searchForKarbDeposit';
      }
      */
      self.signal(4,2);
      action = self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel);
      return {action:action}; 
    }
  }
  
  
  if (self.status === 'goingToKarbDeposit' || self.status === 'goingToFuelDeposit' || self.status === 'goingToAnyDeposit') {
    //check if karb deposit has no churches around
    let checkPositions = search.circle(self, self.finalTarget[0], self.finalTarget[1], 2);
    let proceed = false;
    for (let i = 0; i < checkPositions.length; i++) {
      let pos = checkPositions[i];
      let robotThere = self.getRobot(robotMap[pos[1]][pos[0]]);
      if ((robotThere !== null && (robotThere.unit !== SPECS.CHURCH || robotThere.unit !== SPECS.CASTLE)) || robotThere === null) {
        proceed = true;
        //means that karbonite has no buildings near it
      }
    }
    if (proceed == true) {
      if (self.me.turn > 1){
        //make sure we don't confuddle the signal for counting units
        self.log(`Pilgrim might build`)
        self.castleTalk(71);
      }
    }
  }
  
  //building status means the robot is trying to reach a build location, and build on there
  if (self.status === 'mineKarb' || self.status === 'mineFuel') {
    //check surrouding for structure
    let checkPositions = search.circle(self, self.me.x, self.me.y, 2);
    let nearestStruct = search.findNearestStructure(self);
    let distToNearestStruct = qmath.dist(self.me.x, self.me.y, nearestStruct.x, nearestStruct.y);
    if (distToNearestStruct > 4){
      let proceed = true;
      for (let i = 0 ; i < checkPositions.length; i++) {
        let pos = checkPositions[i];
        let robotThere = self.getRobot(robotMap[pos[1]][pos[0]]);
        if ((robotThere !== null && (robotThere.unit === SPECS.CHURCH || robotThere.unit === SPECS.CASTLE))) {
          proceed = false;
        }
      }
      if (proceed === true) {
        //look for best position
        let maxDeposits = 0;
        let buildLoc = null;
        for (let i = 0 ; i < checkPositions.length; i++) {
          let pos = checkPositions[i];
          let robotThere = self.getRobot(robotMap[pos[1]][pos[0]]);
          let numDepo = numberOfDeposits(self, pos[0], pos[1], true);
          
          if (robotThere === null && fuelMap[pos[1]][pos[0]] === false && karboniteMap[pos[1]][pos[0]] === false && gameMap[pos[1]][pos[0]] === true) {
            
            if (maxDeposits < numDepo) {
              maxDeposits = numDepo;
              buildLoc = pos;
            }
          }
          if (numDepo === 9) {
            buildLoc = pos;
            maxDeposits = numDepo;
          }
        }
        if (buildLoc !== null) {
          self.status = 'building';
          self.buildTarget = buildLoc;
          self.finalTarget = [self.me.x, self.me.y];
        }
      }
    }
  }
  if (self.status === 'building') {
    if (self.me.turn > 1){
      //make sure we don't confuddle the signal for counting units
      self.castleTalk(71);
    }
    let robotThere = self.getRobot(robotMap[self.buildTarget[1]][self.buildTarget[0]]);
    if (robotThere !== null && (robotThere.unit === SPECS.CHURCH)){
      self.status = 'searchForAnyDeposit';
      self.log(`Church built already`);
    }
    else {
      if (self.me.x === self.finalTarget[0] && self.me.y === self.finalTarget[1]) {
        let rels = base.rel(self.me.x, self.me.y, self.buildTarget[0], self.buildTarget[1]);
        self.log(`TRIED TO BUILD: ${rels.dx}, ${rels.dy}`);
        
        if (self.fuel >= 200 && self.karbonite >= 50){
          self.status = 'searchForAnyDeposit';
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
    }
  }
  
  //forever mine
  if (karboniteMap[self.me.y][self.me.x] === true && (self.status === 'goingToKarbDeposit' || self.status === 'mineKarb' || self.status === 'building' || self.status === 'goingToAnyDeposit')) {
    action = self.mine();
    if (self.status !== 'building') {
    
      self.status = 'mineKarb';
      //tel castles i'm mining karb, not building
      if (self.globalTurn > 3){
        self.castleTalk(73)
      }
    }
    return {action:action}; 
  }
  else if (fuelMap[self.me.y][self.me.x] === true && (self.status === 'goingToFuelDeposit' || self.status === 'mineFuel' || self.status === 'goingToAnyDeposit')) {
    action = self.mine();
    if (self.status !== 'building') {
      self.status = 'mineFuel';
      if (self.globalTurn > 3){
        self.castleTalk(74)
      }
    }
    return {action:action}; 
  }
  
  //When mining, check if building a church nearby is a good idea or not
  
  
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  action = self.navigate(self.finalTarget);
  return {action:action};

  //return self.move(0,0);
}

function numberOfDeposits(self, nx, ny, adjacentStructure = false) {
  let checkPositions = search.circle(self, nx, ny, 2);
  let numDeposits = 0;
  let robotMap = self.getVisibleRobotMap()
  let fuelMap = self.getFuelMap();
  let karbMap = self.getKarboniteMap();
  for (let i = 0; i < checkPositions.length; i++) {
    let cx = checkPositions[i][0];
    let cy = checkPositions[i][1];
    if (fuelMap[cy][cx] === true || karbMap[cy][cx] === true) {
      
      if (adjacentStructure === false){
        numDeposits +=1;
      }
      else {
        let checkPositions2 = search.circle(self, cx, cy, 2);
        let validDeposit = true;
        for (let k = 0; k < checkPositions2.length; k++) {
          let bx = checkPositions2[k][0];
          let by = checkPositions2[k][1];
          let robotThere = self.getRobot(robotMap[by][bx]);
          if (robotThere === null) {

          }
          else if (robotThere.team === self.me.team && (robotThere.unit === SPECS.CASTLE || robotThere.unit === SPECS.CHURCH)){
            validDeposit = false;
          }
        }
        if (validDeposit === true) {
          numDeposits +=1;
        }
     }
    }
  }
  return numDeposits;
}


//returns true if the deposit is safe enough to go to
function safeDeposit(self, nx, ny) {
  if (ownHalf(self, nx, ny)) {
    return true;
  }
  //check if nx, ny is in vision
  let robotMap = self.getVisibleRobotMap();
  let unitsInVincinity = search.unitsInRadius(self, 9, self.me.team, nx, ny);
  if (unitsInVincinity[SPECS.PROPHET].length + unitsInVincinity[SPECS.PREACHER].length >= 1) {
    return true;
  }
  let nearestStruct = search.findNearestStructure(self);
  if (qmath.dist(nx, ny, nearestStruct.x, nearestStruct.y) <= 9) {
    return true;
  }
  return false;
}

function ownHalf(self, nx, ny) {
  let gameMap = self.map;
  //self.log()
  if (!self.mapIsHorizontal) {
    if (self.lowerHalf) {
      if (nx < gameMap[0].length/2) {
        //self.log(`X:${nx}, ${ny} is on our half`)
        return true;
      }
    }
    else {
      if (nx >= gameMap[0].length/2) {
        //self.log(`X:${nx}, ${ny} is on our half`)
        return true;
      }
    }
  }
  else {
    if (self.lowerHalf) {
      if (ny < gameMap.length/2) {
        //self.log(`Y:${nx}, ${ny} is on our half`)
        return true;
      }
    }
    else {
      if (ny >= gameMap.length/2) {
        //self.log(`Y:${nx}, ${ny} is on our half`)
        return true;
      }
    }
  }
  return false;
}


export default {mind}