import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';
function mind(self) {
  
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();

  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  let gameMap = self.map;
  let mapLength = self.map.length;

  let forcedAction = null;
  self.globalTurn += 1;
  if (self.me.turn === 1) {
    self.searchQueue = [];
    
    self.lastWarCry = -100;
    self.miningIndex = -1;
    self.lastChainTurn = -1;
    self.statusBeforeReturn = '';
    self.status = 'searchForKarbDeposit';
    self.status = 'waitingForCommand';
    self.onFrontLine = false;
    self.firstTimeScouting = true;
    self.frontLineScoutingTarget = {x: 0, y: 0};
    self.occupiedHalf = null;
    self.castleTalk(self.me.unit);
    
    for (let i = 0; i < mapLength; i++) {
      for (let j = 0; j < mapLength; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'fuel'});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'karbonite'});
        }
      }
    }
    self.churchBuilt = false;
    self.searchAny = false;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    let initialized = self.initializeCastleLocations();
    if (initialized){
      self.originalCastleLocation = [self.knownStructures[self.me.team][0].x, self.knownStructures[self.me.team][0].y]
      self.globalTurn = initialized.turn;
      if (initialized.signal === 29002) {
        self.status = 'frontLineScout';
        self.castleTalk(6);
      }
      
      self.globalTurn += 1;
    }
    else {
      self.status = 'searchForAnyDeposit';
      self.churchBuilt = true;
      self.searchAny = true;
    }
    
    self.target = [self.me.x,self.me.y];
    self.finalTarget = [self.me.x, self.me.y];
    if (!self.mapIsHorizontal) {
      self.halfPoint = mapLength/2;
      if (self.me.x < mapLength/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }

    }
    else {
      self.halfPoint = mapLength/2;
      if (self.me.y < mapLength/2){
        self.lowerHalf = true;
        
        
      }
      else {
        self.lowerHalf = false;
      }
    }
  }
  if (self.me.turn === 5) {
    self.log('Trying to plan');
    pathing.initializePlanner(self);
    self.setFinalTarget(self.finalTarget);
  }
  
  let robotsInVision = self.getVisibleRobots();
  for (let i = 0; i < robotsInVision.length; i++) {
    if (robotsInVision[i].team === self.me.team) {
      let msg = robotsInVision[i].signal;
      let heardId = robotsInVision[i].id;
      signal.processMessagePilgrim(self, msg);
      if (msg >= 24586 && msg <= 28681 && self.status !== 'frontLineScout'){
        self.status = 'goingToDeposit';
        let padding = 24586;
        
        let targetLoc = self.getLocation(msg - padding);
        self.finalTarget = [targetLoc.x, targetLoc.y];
        self.miningIndex = getIndexAllSpots(self, self.finalTarget)
        
        let checkPositions = search.circle(self, self.finalTarget[0], self.finalTarget[1], 2);
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
        }
        
        self.log(`Preparing to mine spot at ${self.finalTarget}, build at ${self.buildTarget}`);
      }
      else if (msg < 28842 && msg >= 28682 && self.status === 'waitingForCommand' && self.miningIndex === -1 && self.status !== 'frontLineScout') {
        let padding = 28682;
        let indice = msg - padding;
        self.status = 'goingToDeposit';
        self.miningIndex = indice;
        self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
      }
      else if (msg < 29002 && msg >= 28842 && self.status === 'waitingForCommand' && self.status !== 'frontLineScout') {
        let padding = 28842;
        let indice = msg - padding;
        self.status = 'goingToDeposit';
        let currentSpot = self.allSpots[self.miningIndex];
        let currentResource = currentSpot.type;
        let newResource = self.allSpots[indice].type;
        
        if (currentResource === newResource && qmath.dist(currentSpot.x, currentSpot.y, self.me.x, self.me.y) === 0) {
        }
        else {
          self.miningIndex = indice;
        }
        
        self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
      }     
      else if (msg >= 33099 && msg <= 41290) {
        
        let padding = 33099;
        if (msg >= 37195) {
          padding = 37195;
        }
        let enemyPos = self.getLocation(msg-padding);
        base.logStructure(self, enemyPos.x, enemyPos.y, otherTeamNum, 0);
        let ox = enemyPos.x;
        let oy = enemyPos.y;
        if (self.mapIsHorizontal) {
          oy = mapLength - oy - 1;
        }
        else {
          ox = mapLength - ox - 1;
        }
        base.logStructure(self, ox, oy, self.me.team, 0);
        self.enemyDirection = self.determineEnemyDirection(ox, oy);
        
        if (self.mapIsHorizontal) {
          if (oy <= mapLength/2 && self.me.y > mapLength/2) {
            self.lowerHalf = !self.lowerHalf
          }
          else if (oy >= mapLength/2 && self.me.y < mapLength/2) {
            self.lowerHalf = !self.lowerHalf
          }
        }
        else {
          if (ox <= mapLength/2 && self.me.x > mapLength/2) {
            self.lowerHalf = !self.lowerHalf
          }
          else if (ox >= mapLength/2 && self.me.x < mapLength/2) {
            self.lowerHalf = !self.lowerHalf
          }
        }
        if (padding === 37195){
          if (self.status !== 'frontLineScout') {
            self.status = 'chainedPilgrim';
          }

          if (self.karbonite > 400 && self.fuel > 6100){
            if (self.knownStructures[otherTeamNum].length) {
              let nx = self.knownStructures[otherTeamNum][0].x;
              let ny = self.knownStructures[otherTeamNum][0].y;
              let msg2 = self.compressLocation(nx, ny);
              let padding2 = 37195;
              
              let adjacentPos = search.circle(self, self.me.x, self.me.y, 2);
              let adjacentPosDist = adjacentPos.map(function (a) {
                return {pos: a, dist: qmath.dist(a[0], a[1], nx, ny)}
              });
              adjacentPosDist.sort(function (a, b) {
                return a.dist - b.dist;
              })
              adjacentPos = adjacentPosDist.map(function (a) {
                return a.pos
              });
              for (let i = 0; i < adjacentPos.length; i++) {
                let checkPos = adjacentPos[i];
                if(canBuild(self, checkPos[0], checkPos[1], robotMap, gameMap)){
                  let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
                  self.signal(padding2 + msg2, 4);
                  return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)};

                }
              }
            }

          }
        }
        
        
      }
      else if (msg ===  41291 && heardId !== self.me.id) {
        if (self.status === 'chainedPilgrim'){
          self.signal(41291, 4);
          //self.status = 'moveaway';
          self.status = 'searchForAnyDeposit';
          
        }
        if (self.status === 'frontLineScout') {
          
        }
      }
      else if(msg >= 41292 && msg <= 45387) {
      }
    }
  }

  if (self.status === 'waitingForCommand') {
    self.status = 'goingToDeposit';
    if (self.me.turn !== 1) {
      self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
    }
    self.status = 'searchForAnyDeposit';
  }
  else if (self.status === 'frontLineScout') {
    if (self.firstTimeScouting) {
      self.frontLineScoutingTarget = [self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y];
      self.finalTarget = self.frontLineScoutingTarget;
    }
  }
  if (self.status === 'moveaway') {
    let possiblePos = search.circle(self, self.me.x, self.me.y, 2);
    for (let k = 0; k < possiblePos.length; k++) {
      let ppos = possiblePos[k];
      
    }
  }

  if (self.status === 'frontLineScout' && self.me.turn > 1) {
    if (self.onFrontLine === true) {
      if (self.me.turn % 3 === 0) {
        self.castleTalk(71 + self.me.y);
      }
      else if (self.me.turn % 3 === 1){
        self.castleTalk(7 + self.me.x);
      }
      else {
        self.castleTalk(135);
      }
    }
    else {
      if (self.me.turn % 2 === 0) { 
        self.castleTalk(71 + self.me.y);
      }
      else {
        self.castleTalk(7 + self.me.x);
      }
    }
  }
  
  let unitsInVincinity = search.unitsInRadius(self, 64);
  if (self.status === 'frontLineScout' ) {
    if (unitsInVincinity[SPECS.PREACHER].length + unitsInVincinity[SPECS.CRUSADER].length > 10 && self.me.turn - self.lastWarCry > 10) {
      self.lastWarCry = self.me.turn;
    }
  }
  
  let farthestdist;
  let enemyPositionsToAvoid = [];
  self.onFrontLine = false;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.team === otherTeamNum) {
      let distToEnemy = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      
      if (((distToEnemy > 64 && obot.unit !== SPECS.PREACHER) || (distToEnemy >= 36 && obot.unit === SPECS.PREACHER)) && distToEnemy <= 100 && obot.unit !== SPECS.PILGRIM) {
        self.onFrontLine = true;
        if (self.status === 'frontLineScout' ){
          self.finalTarget = [self.me.x, self.me.y];
          if (self.onFrontLine === true) {
            if (self.knownStructures[otherTeamNum].length) {
              let nx = self.knownStructures[otherTeamNum][0].x;
              let ny = self.knownStructures[otherTeamNum][0].y;
              let msg2 = self.compressLocation(nx, ny);
              let padding2 = 37195;
              if (self.karbonite >= 800 && self.fuel >= 10000 && self.lastChainTurn < self.me.turn - 2 && unitsInVincinity[SPECS.PROPHET].length > 6) {
                
                let adjacentPos = search.circle(self, self.me.x, self.me.y, 2);
                let adjacentPosDist = adjacentPos.map(function (a) {
                  return {pos: a, dist: qmath.dist(a[0], a[1], nx, ny)};
                });
                adjacentPosDist.sort(function (a, b) {
                  return a.dist - b.dist;
                })
                adjacentPos = adjacentPosDist.map(function (a) {
                  return a.pos
                });
                for (let i = 0; i < adjacentPos.length; i++) {
                  let checkPos = adjacentPos[i];
                  let robotThere = robotMap[checkPos[1]][checkPos[0]];
                  if (robotThere !== null && robotThere.unit === SPECS.CHURCH && robotThere.team === self.me.team) {
                    self.signal(padding2 + msg2, 4);
                    break;
                  }
                  else if (canBuild(self, checkPos[0], checkPos[1], robotMap, gameMap)){
                    let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
                    self.signal(padding2 + msg2, 4);
                    self.lastChainTurn = self.me.turn;
                    return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)};
                    
                  }
                }
                
              }
            }
          }
          
        }
        else {
          forcedAction = '';
        }
      } 
      else {
        self.log(`Pilgrim ${self.me.id} is not in a safe position!`);
        if (self.status === 'frontLineScout' && distToEnemy <= 100) {
        }
        if (obot.unit === SPECS.PROPHET && distToEnemy < 100) {
          enemyPositionsToAvoid.push([obot.x, obot.y, SPECS.PROPHET]);
        }
        else if (obot.unit === SPECS.PREACHER && distToEnemy <= 64) {
          enemyPositionsToAvoid.push([obot.x, obot.y, SPECS.PREACHER]);
        }
        else if (obot.unit === SPECS.CRUSADER && distToEnemy <= 64) {
          enemyPositionsToAvoid.push([obot.x, obot.y, SPECS.CRUSADER]);
        }
        else if (obot.unit === SPECS.CHURCH && distToEnemy < 80) {
          enemyPositionsToAvoid.push([obot.x, obot.y, SPECS.CHURCH]);
        }
        else if (obot.unit === SPECS.CASTLE && distToEnemy < 100) {
          enemyPositionsToAvoid.push([obot.x, obot.y, SPECS.CASTLE]);
        }
      }
    }
  }

  let avoidLocs = [];
  if (enemyPositionsToAvoid.length > 0){
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
    avoidLocs.sort(function(a,b) {
      return b.dist - a.dist;
    });
    let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
    if (self.status !== 'frontLineScout') {
      self.status = 'searchForAnyDeposit';
    }
    
    let stop = false;
    for (let i = 0; i < enemyPositionsToAvoid.length; i++) {
      let dist = qmath.dist(avoidLocs[0].pos[0], avoidLocs[0].pos[1], enemyPositionsToAvoid[i][0], enemyPositionsToAvoid[i][1]);
      if (enemyPositionsToAvoid[i][2] !== SPECS.PILGRIM) {
        if (enemyPositionsToAvoid[i][2] === SPECS.PREACHER) {
          if (dist <= 36) {
            stop = true;
          }
        }
        else {
          if (dist <= 64) {
            stop = true;
          }
        }
      }
    }

    if (!stop) {
      return {action:self.move(rels.dx,rels.dy)}
    } 
    else {
      forcedAction = '';
    }
  }
  if (self.status === 'goingToKarbDeposit' || self.status === 'goingToFuelDeposit' || self.status === 'goingToAnyDeposit') {
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0){
      if (self.status === 'goingToKarbDeposit'){
        self.miningIndex = getIndexAllSpots(self, self.finalTarget);
        self.castleTalk(self.miningIndex + 77);
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
        }
        else {
          let nextLoc = self.searchQueue.pop().position;
          self.finalTarget = nextLoc;
          self.miningIndex = getIndexAllSpots(self, self.finalTarget);
          self.castleTalk(self.miningIndex + 77);
        }
      }
      else if (self.status === 'goingToFuelDeposit'){
        self.miningIndex = getIndexAllSpots(self, self.finalTarget);
        self.castleTalk(self.miningIndex + 77);
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
          
        }
        else {
          let nextLoc = self.searchQueue.pop().position;
          self.finalTarget = nextLoc;
          self.miningIndex = getIndexAllSpots(self, self.finalTarget);
          self.castleTalk(self.miningIndex + 77);
        }
      }
      else if (self.churchBuilt === true || self.searchAny === true || self.status === 'goingToAnyDeposit') {
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
        }
        else {
          let nextLoc = self.searchQueue.pop().position;
          self.finalTarget = nextLoc;
          self.miningIndex = getIndexAllSpots(self, self.finalTarget);
          self.castleTalk(self.miningIndex + 77);
        }
      }
    }
    else {
      self.miningIndex = getIndexAllSpots(self, self.finalTarget);
      self.castleTalk(self.miningIndex + 77);
    }
  }
  
  if (self.status === 'goingToDeposit') {
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0 && qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]) <= 2){
      self.status = 'searchForAnyDeposit';
    }
  }
  
  if (self.status === 'searchForKarbDeposit' || self.status === 'searchForFuelDeposit') {
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
        self.status = 'goingToKarbDeposit';
        self.finalTarget = self.searchQueue.pop().position;
      }
    }    
  }

  if (self.status === 'searchForAnyDeposit') {
    self.searchQueue = [];
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
      self.miningIndex = getIndexAllSpots(self, self.finalTarget);
    }
  }
  
  if (((self.me.fuel >= 100 || self.me.karbonite >= 20) || self.status === 'return')) {
    let bestTarget = search.findNearestStructure(self);
    let proceedToReturn = true;
    if (self.status === 'building') {
      if (qmath.dist(bestTarget.x, bestTarget.y, self.me.x, self.me.y) > 100) {
        proceedToReturn = false;
      }
    }
    if (proceedToReturn) {
      if (self.status === 'mineKarb' || self.status === 'mineFuel') {
        self.statusBeforeReturn = self.status;
      }
      if (self.statusBeforeReturn === 'mineKarb') {
      }
      else if (self.statusBeforeReturn === 'mineFuel') {
      }
      
      self.finalTarget = [bestTarget.x, bestTarget.y];
      self.status = 'return';

      let currRels = base.rel(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]);
      if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
        if (bestTarget.unit === SPECS.CASTLE){
          self.status = 'waitingForCommand';
          self.signal(4,2);
          self.castleTalk(0);
        }
        else if (bestTarget.unit === SPECS.CHURCH) {
          self.status = 'goingToDeposit';
          self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
        }
        
        action = self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel);
        return {action:action}; 
      }
    }
  }
  
  
  if (self.status === 'goingToDeposit') {
    let checkPositions = search.circle(self, self.finalTarget[0], self.finalTarget[1], 2);
    let proceed = false;
    
    if (self.me.turn > 1) {
      self.castleTalk(self.miningIndex + 77);
    }
    
    for (let i = 0; i < checkPositions.length; i++) {
      let pos = checkPositions[i];
      let robotThere = self.getRobot(robotMap[pos[1]][pos[0]]);
      if ((robotThere !== null && (robotThere.unit !== SPECS.CHURCH || robotThere.unit !== SPECS.CASTLE)) || robotThere === null) {
        proceed = true;
      }
    }
    if (proceed == true) {
      if (self.me.turn > 1){
      }
    }
    
  }
  
  if (self.status === 'mineKarb' || self.status === 'mineFuel') {
    let checkPositions = search.circle(self, self.me.x, self.me.y, 2);
    let nearestStruct = search.findNearestStructure(self);
    let distToNearestStruct = qmath.dist(self.me.x, self.me.y, nearestStruct.x, nearestStruct.y);
    
    let minDist = 4;
    if (self.globalTurn <= 50){
      minDist = 10;
    }
    if (distToNearestStruct > minDist){
      let proceed = true;
      for (let i = 0 ; i < checkPositions.length; i++) {
        let pos = checkPositions[i];
        let robotThere = self.getRobot(robotMap[pos[1]][pos[0]]);
        if ((robotThere !== null && (robotThere.unit === SPECS.CHURCH || robotThere.unit === SPECS.CASTLE))) {
          proceed = false;
        }
      }
      if (proceed === true) {
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
      self.castleTalk(self.miningIndex + 77);
    }
    let robotThere = self.getRobot(robotMap[self.buildTarget[1]][self.buildTarget[0]]);
    if (robotThere !== null && (robotThere.unit === SPECS.CHURCH)){
      self.status = 'goingToDeposit';
    }
    else {
      if (self.me.x === self.finalTarget[0] && self.me.y === self.finalTarget[1]) {
        let rels = base.rel(self.me.x, self.me.y, self.buildTarget[0], self.buildTarget[1]);
        
        if (self.fuel + self.me.fuel >= 300 && self.karbonite + self.me.karbonite >= 75){
          self.status = 'goingToDeposit';

          if (self.knownStructures[otherTeamNum].length) {
            let nx = self.knownStructures[otherTeamNum][0].x;
            let ny = self.knownStructures[otherTeamNum][0].y;
            let msg = self.compressLocation(nx, ny);
            let padding = 33099;
            self.signal(padding + msg, 2);
          }

          return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)}
        }
        else {
        }
      }
      else {
        action = self.navigate(self.finalTarget);
        return {action:action};
      }
      let pilgrimOnFinalTarget = self.getRobot(robotMap[self.finalTarget[1]][self.finalTarget[0]]);
      if (pilgrimOnFinalTarget !== null && pilgrimOnFinalTarget.team === self.me.team && pilgrimOnFinalTarget.unit === SPECS.PILGRIM && self.me.id !== pilgrimOnFinalTarget.id){
          self.status = 'goingToDeposit';
      }
    }
  }
  if (self.status === 'goingToDeposit'){
    if (qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]) === 0) {
      self.status = 'mineHere';
    }
  }
  
  if (karboniteMap[self.me.y][self.me.x] === true && (self.status === 'mineHere' || self.status === 'goingToKarbDeposit' || self.status === 'mineKarb' || self.status === 'building' || self.status === 'goingToAnyDeposit')) {
    action = self.mine();
    self.miningIndex = getIndexAllSpots(self, [self.me.x, self.me.y]);
    if (self.status !== 'building') {
      
      self.status = 'mineKarb';
      if (self.me.turn > 1){
        self.castleTalk(self.miningIndex + 77);
      }
    }
    return {action:action}; 
  }
  else if (fuelMap[self.me.y][self.me.x] === true && (self.status === 'mineHere' || self.status === 'goingToFuelDeposit' || self.status === 'mineFuel' || self.status === 'goingToAnyDeposit' || self.status === 'building')) {
    action = self.mine();
    self.miningIndex = getIndexAllSpots(self, [self.me.x, self.me.y]);
    if (self.status !== 'building') {
      self.status = 'mineFuel';
      if (self.me.turn > 1){
        self.castleTalk(self.miningIndex + 77);
      }
    }
    return {action:action}; 
  }
  
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  action = self.navigate(self.finalTarget);
  
  return {action:action};
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


function safeDeposit(self, nx, ny) {
  if (ownHalf(self, nx, ny)) {
    return true;
  }
  let robotMap = self.getVisibleRobotMap();
  let unitsInVincinity = search.unitsInRadius(self, 64, self.me.team, nx, ny);
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
  let mapLength = gameMap.length;
  //self.log()
  if (!self.mapIsHorizontal) {
    if (self.lowerHalf) {
      if (nx < gameMap[0].length/2) {
        return true;
      }
    }
    else {
      if (nx >= gameMap[0].length/2) {
        return true;
      }
    }
  }
  else {
    if (self.lowerHalf) {
      if (ny < mapLength/2) {
        return true;
      }
    }
    else {
      if (ny >= mapLength/2) {
        return true;
      }
    }
  }
  return false;
}
function canBuild(self, xpos, ypos, robotMap, passableMap) {
  if (search.inArr(xpos,ypos,robotMap)) {
    if (robotMap[ypos][xpos] === 0) {
      if (passableMap[ypos][xpos] === true){
        return true;
      }
    }
  }
  return false;
}
function getIndexAllSpots(self, pos){
  for (let i = 0; i < self.allSpots.length; i++) {
    let p = self.allSpots[i];
    if (p.x === pos[0] && p.y === pos[1]) {
      return i;
    }
  }
  return false;
}
export default {mind}