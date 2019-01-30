import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import signal from '../signals.js';
import qmath from '../math.js'
import base from '../base.js'
function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  let robotsInVision = self.getVisibleRobots();
  let gameMap = self.map;
  let mapLength = self.map.length;
  let action = '';
  let forcedAction = null;
  let otherTeamNum = (self.me.team + 1) % 2;
  let robotMap = self.getVisibleRobotMap();
  let karboniteMap = self.getKarboniteMap();
  let fuelMap = self.getFuelMap();
  if (self.me.turn === 1){
    self.occupiedMiningLocationsIndices = {}; 
    self.rallyTargets = {};
    self.lastRallySignal = -1;
    self.castleHasScout = false;
    self.myScoutsId = -1;
    self.sentContestableBot = false;
    self.newIndices = [];
    self.finalSignal = false;
    self.minKarbonite = 200;
    self.minFuel = 50;
    let offsetVal = 0;
    self.castleNum = 0;
    if (self.karbonite === 90) {
      offsetVal = 1;
      self.castleNum = 1;
    }
    else if (self.karbonite === 80) {
      offsetVal = 2;
      self.castleNum = 2;
    }
    self.castles = robotsInVision.length - offsetVal;
    self.castleCount = self.castles;
    self.maxScoutingPilgrims = self.castleCount;
    self.currentScoutingPilgrims = 0;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    
    self.stackFuel = false;
    
    self.oppositeCastleDestroyed = false;
    self.pastBuildQueue = [];
    
    let closestKarbonitePos = null;
    let closestKarboniteDist = 999999;
    for (let i = 0; i < mapLength; i++) {
      for (let j = 0; j < mapLength; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'fuel'});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
          self.allSpots.push({x:j, y:i, type:'karbonite'});
          let distToKarb = qmath.dist(j, i, self.me.x, self.me.y);
          if (distToKarb < closestKarboniteDist) {
            closestKarboniteDist = distToKarb
            closestKarbonitePos = [j, i];
          }
        }
      }
    }
    let numFuelSpots = self.fuelSpots.length;
    self.maxPilgrims = Math.ceil((numFuelSpots + self.karboniteSpots.length)/2);
    self.maxHalf = Math.ceil((numFuelSpots + self.karboniteSpots.length)/2);;
    
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
 
    self.contestableSpots = [];

    for (let i = 0; i < self.karboniteSpots.length; i++) {
      let spot = self.karboniteSpots[i];
      let oppositeSpot;
      if (!self.mapIsHorizontal) {
        oppositeSpot = [mapLength - spot.x - 1, spot.y];
      }
      else {
        oppositeSpot = [spot.x, mapLength - spot.y - 1];
      }
      if (ownHalf(self, spot.x, spot.y) && qmath.dist(spot.x, spot.y, oppositeSpot[0], oppositeSpot[1]) <= 64) {
        self.log(`Spot at ${spot.x}, ${spot.y} is contestable`);
        self.contestableSpots.push(spot);
      }
    }
    self.closestContestableSpot = null;
    
    
    
    self.status = 'build';
    self.canBuildPilgrims = true;
    
    self.initialCastleLocationMessages = {};
    
    let locCastleNum = 0;
    self.castleIds = [];
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      if (msg >= 0) {
        self.allUnits[robotsInVision[i].id] = {};
        self.allUnits[robotsInVision[i].id].unit = 0;
        self.allUnits[robotsInVision[i].id].type = 'default';
        locCastleNum +=1;
        self.castleIds.push(robotsInVision[i].id);
        
        self.initialCastleLocationMessages[robotsInVision[i].id] = {};
        self.initialCastleLocationMessages[robotsInVision[i].id].x = -1;
        self.initialCastleLocationMessages[robotsInVision[i].id].y = -1;
      }
      self.sawEnemyLastTurn = false;
      
    }
    
    if (self.closestContestableSpot !== null){
      if (self.castles === 3) {
        if (offsetVal === 0) {
          self.buildQueue.push(2, 2);
        }
        else if (offsetVal === 1){
          self.buildQueue.push(2);
        }
        else if (offsetVal === 2) {
          self.buildQueue.push(2);
        }
      }
      else if (self.castles === 2) {
        if (offsetVal === 0) {
          self.buildQueue.push(2,2);
        }
        else if (offsetVal === 1) {
          self.buildQueue.push(2);
        }
      }
      else if (self.castles === 1) {
        self.buildQueue.push(2,2,2);
      }
    }
    else {
      if (self.castles === 3) {
        if (offsetVal === 0) {
          self.buildQueue.push(2,2);
        }
        else if (offsetVal === 1){
          self.buildQueue.push(2);
        }
        else if (offsetVal === 2) {
          self.buildQueue.push(2);
        }
      }
      else if (self.castles === 2) {
        if (offsetVal === 0) {
          self.buildQueue.push(2,2);
        }
        else if (offsetVal === 1) {
          self.buildQueue.push(2,2);
        }
      }
      else if (self.castles === 1) {
        self.buildQueue.push(2,2,2,2);
      }
    }
    
    
    let enemyCastle = [self.knownStructures[otherTeamNum][0].x,self.knownStructures[otherTeamNum][0].y];
    let allAdjacentPos = search.circle(self, self.me.x, self.me.y, 2);
    let desiredX = enemyCastle[0];
    let desiredY = enemyCastle[1];
    
    let tempPos = [];
    self.buildingAttackUnitPositions = [];
    self.buildingPilgrimPositions = [];
    
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    
    self.buildingAttackUnitPositions = tempPos.map(function(a){
      return a.pos;
    })
    
    tempPos = [];
    desiredX = closestKarbonitePos[0];
    desiredY = closestKarbonitePos[1];
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    self.buildingPilgrimPositions = tempPos.map(function(a){
      return a.pos;
    })
  }
  
  if (self.me.turn <= 3) {
    if (self.me.turn === 1) {
      let xposPadded = self.me.x + 192;
      self.castleTalk(xposPadded);
    }
    else if (self.me.turn === 2){
      let yposPadded = self.me.y + 192;
      self.castleTalk(yposPadded);
    }
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      let botId = robotsInVision[i].id;
      let robotIsCastle = false;
      
      for (let k = 0; k < self.castleIds.length; k++) {
        if (botId === self.castleIds[k]) {
          robotIsCastle = true;
          break;
        }
      }
      if (robotIsCastle){
        
        if (msg >= 192) {
          
          if (self.initialCastleLocationMessages[botId].x === -1){
            self.initialCastleLocationMessages[botId].x = (msg - 192);
          }
          else {
            self.initialCastleLocationMessages[botId].y = (msg - 192);
          }
        }
      }
    }
  }
  let buildEarlyProphet = false;
  let sendEarlyProphetStrat = false;
  if (self.me.turn === 3) {
    sendEarlyProphetStrat = true;
    let buildExtraPilgrim = true;
    self.enemyCastlesSorted = [];
    for (let i = 0; i < self.castleIds.length; i++){
      let castleId = self.castleIds[i];
      let nx = self.initialCastleLocationMessages[castleId].x;
      let ny = self.initialCastleLocationMessages[castleId].y;
      if (nx !== -1 && ny !== -1){
        base.logStructure(self,nx,ny,self.me.team, 0);

        let ex = nx;
        let ey = mapLength - ny - 1;
        let dist = Math.abs(ey - ny);
        if (!self.mapIsHorizontal) {
          ex = mapLength - nx - 1;
          ey = ny;
          dist = Math.abs(ex - nx);
        }
        if (dist <= 31) {
          buildExtraPilgrim = false;
        }
        base.logStructure(self,ex,ey,otherTeamNum, 0);
      }
    }
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      if (msg === 76) {
        sendEarlyProphetStrat = false;
      }
    }
    if (sendEarlyProphetStrat === true){
      let myClosestContestableSpotDist = 99999;
      let otherClosestContestableSpotDist = 99998;
      let bestSpot = null;
      let castleLocs = [];
      for (let i = 1; i < self.knownStructures[self.me.team].length; i++) {
        let ck = self.knownStructures[self.me.team][i];
        castleLocs.push([ck.x, ck.y])
      }
      for (let i = 0; i < self.contestableSpots.length; i++) {
        let spot = self.contestableSpots[i];
        let distTospot = qmath.dist(spot.x, spot.y, self.me.x, self.me.y);
        if (myClosestContestableSpotDist >= distTospot) {
          myClosestContestableSpotDist = distTospot;
          bestSpot = spot;
          //self.closestContestableSpot = bestSpot;
        }
        for (let i = 0; i < castleLocs.length; i++) {
          let cx = castleLocs[i][0];
          let cy = castleLocs[i][1];
          let distTospot2 = qmath.dist(spot.x, spot.y, cx, cy);
          if (otherClosestContestableSpotDist >= distTospot2) {
            otherClosestContestableSpotDist = distTospot2;
          }
        }
      }
      if (myClosestContestableSpotDist <= otherClosestContestableSpotDist) {
        self.castleTalk(76);
        self.closestContestableSpot = bestSpot;
        buildEarlyProphet = true;
      }
    }
    if (buildExtraPilgrim === true) {
      self.buildQueue.push(2,2);
    }
  }
  
  self.status = 'build';
  self.canBuildPilgrims = true;
  self.canBuildPreachers = true;
  self.stackFuel = false;
  self.stackKarbonite = false;
  self.numPilgrimsMiningKarbonite = 0;
  self.numPilgrimsMiningFuel = 0;
  let idsWeCanHear = [];
  
  self.searchQueue = [];
  let cd = 9999999;
  let newTarget = null;
  for (let i = 0; i < self.fuelSpots.length; i++) {
    let nx = self.fuelSpots[i].x;
    let ny = self.fuelSpots[i].y;
    if (safeDeposit(self, nx, ny)){
      let patharr = [];
      let distToThere = 0;
      if (self.planner !== null) {
        distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
      }
      else {
        distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
      }
      self.searchQueue.push({position: [nx,ny], distance: distToThere, type:'fuel'});
    }
  }
  for (let i = 0; i < self.karboniteSpots.length; i++) {
    let nx = self.karboniteSpots[i].x;
    let ny = self.karboniteSpots[i].y;
    let proceed = true;

    if (safeDeposit(self, nx, ny)){
      let patharr = [];
      let distToThere = 0;
      if (self.planner !== null) {
        distToThere = self.planner.search(self.me.y,self.me.x,ny,nx,patharr);
      }
      else {
        distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
      }
      self.searchQueue.push({position: [nx,ny], distance: distToThere, type:'karbonite'});
    }
  }
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    let id = robotsInVision[i].id;
    if (msg >= 77 && self.allUnits[id] !== undefined) {
      if (self.allUnits[id].unit === SPECS.PROPHET || (self.allUnits[id].unit === SPECS.PILGRIM && self.allUnits[id].type === 'miner')) {
        let newInd = msg - 77;
        let oml = self.allSpots[newInd];
        let distToThere = qmath.dist(self.me.x, self.me.y, oml.x, oml.y);
        self.allSpots[newInd].safe = true;
        self.searchQueue.push({position: [oml.x, oml.y], distance: distToThere, type:oml.type});
      }
    }
  }
  let uniqueQueue = [];
  for (let i = 0; i < self.searchQueue.length; i++) {
    let pushThis = true;
    let thisSpot = self.searchQueue[i];
    let checkVal = thisSpot.position;
    for (let j = 0; j < uniqueQueue.length; j++) {
      let uspot = uniqueQueue[j];
      if (uspot.position[0] === checkVal[0] && uspot.position[1] === checkVal[1]) {
        pushThis = false;
        break;
      }
    }
    if (pushThis === true) {
      uniqueQueue.push(thisSpot);
    }
  }
  self.searchQueue = uniqueQueue;
  self.searchQueue.sort(function(a,b){
    return a.distance - b.distance
  });
  self.maxPilgrims = Math.max(self.searchQueue.length, self.maxHalf);

  self.log(`Hey guys, self.searchQueue.length: ${self.searchQueue.length}, max pilgrims: ${self.maxPilgrims}`);

  for (let index in self.occupiedMiningLocationsIndices) {
    let ind = self.occupiedMiningLocationsIndices[index];
    if (self.allSpots[ind].type === 'fuel') {
      self.numPilgrimsMiningFuel += 1;
    }
    else if (self.allSpots[ind].type === 'karbonite'){
      self.numPilgrimsMiningKarbonite += 1; 
    }
  }
  
  let newSearchQueue = [];
  if (self.me.turn > 3){
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      let id = robotsInVision[i].id;
      if (msg >= 77 && self.allUnits[id] !== undefined) {
        if (self.allUnits[id].unit === SPECS.CASTLE || self.allUnits[id].unit === SPECS.CHURCH){
          self.newIndices.push({msg:msg - 77, turn: self.me.turn});
        }

      }
    }
    let newIndicesNew = [];
    for (let i = 0; i < self.newIndices.length; i++) {
      let ab = self.newIndices[i];
      if (self.me.turn - ab.turn <= 1) {
        newIndicesNew.push(ab);
      }
    }
    self.newIndices = newIndicesNew;

  
  
  for (let i = 0; i < self.searchQueue.length; i++) {
    let spos = self.searchQueue[i].position;
    let unoccupied = true;
    for (let index in self.occupiedMiningLocationsIndices) {
      let ind = self.occupiedMiningLocationsIndices[index];
      if (spos[0] === self.allSpots[ind].x && spos[1] === self.allSpots[ind].y) {
        unoccupied = false;
        break;
      }
    }
    if (unoccupied === true) {
      for (let k = 0; k < self.newIndices.length; k++) {
        let ind = self.newIndices[k].msg;
        if (spos[0] === self.allSpots[ind].x && spos[1] === self.allSpots[ind].y) {
          unoccupied = false;
          break;
        }
      }
    }
    if (unoccupied === true) {
      newSearchQueue.push(self.searchQueue[i]);
    }
      
  }
  
  self.searchQueue = newSearchQueue;
  }
  self.searchQueueFuel = self.searchQueue.filter(function (a){
    if (a.type === 'fuel'){
      return true
    }
    else return false
  });
  self.searchQueueKarbonite = self.searchQueue.filter(function (a){
    if (a.type === 'karbonite'){
      return true;
    }
    else return false;
  });

  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    let signalmsg = robotsInVision[i].signal;
    
    idsWeCanHear.push(robotsInVision[i].id);
    
    let orobot = robotsInVision[i];
    let heardId = orobot.id;
    signal.processMessageCastleTalk(self, msg, heardId);
    if (msg >= 0) {
      if (self.allUnits[heardId] === undefined) {
        self.allUnits[heardId] = {};
      }
 

    }
    if (msg >= 77 && msg <= 236) {
      if (self.allUnits[heardId].unit === SPECS.PILGRIM && self.allUnits[heardId].type === 'miner') {
        self.allUnits[heardId].mineLoc = msg - 77;
        self.occupiedMiningLocationsIndices[heardId] = self.allUnits[heardId].mineLoc;

      }
    }
    
    if (msg >= 1){
      if (self.allUnits[heardId].type === 'scout') {
        if (msg >= 7 && msg <= 70) {
          self.rallyTargets[heardId].position[0] = msg - 7;
        }
        else if (msg >= 71 && msg <= 134) {
          self.rallyTargets[heardId].position[1] = msg - 71;
        }
        else if (msg === 6) {
          let rob = self.getRobot(heardId);
          self.log(`just built scout is at ${rob.x}, ${rob.y}`);
          if (rob !== null && qmath.dist(self.me.x, self.me.y, rob.x, rob.y) <= 16) {
            self.log(`Scout ${heardId} is my scout`);
            self.myScoutsId = heardId;
          }
        }
      }
      if (self.allUnits[heardId].type === 'default' || self.allUnits[heardId].type === 'miner'){
        if (msg >= 7 && msg <= 70) {
          let enemyCastlePosDestroyed = msg - 7;
          self.log(`Castle knows that enemy castle: ${enemyCastlePosDestroyed} was destroyed`);

          for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
            if (self.mapIsHorizontal) {
              if (self.knownStructures[otherTeamNum][i].x === enemyCastlePosDestroyed) {
                if (enemyCastlePosDestroyed === self.me.x) {
                  self.log(`Opposite castle destroyed, x:${enemyCastlePosDestroyed}`);
                  self.oppositeCastleDestroyed = true;
                }
                self.knownStructures[otherTeamNum].splice(i,1);

                break;
              }
            }
            else {
              if (self.knownStructures[otherTeamNum][i].y === enemyCastlePosDestroyed) {
                if (enemyCastlePosDestroyed === self.me.y) {
                  self.oppositeCastleDestroyed = true;
                  self.log(`Opposite castle destroyed, y:${enemyCastlePosDestroyed}`);
                }
                self.knownStructures[otherTeamNum].splice(i,1);
                break;
              }
            }
          }
          for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
            self.log(`New known structures: ${self.knownStructures[otherTeamNum][i].x}, ${self.knownStructures[otherTeamNum][i].y}`);
          }
        }
        else if (msg === 71) {
          if (self.karbonite <= 90){
            self.stackKarbonite = true;

            self.buildQueue = [];
          }

          if (self.fuel <= 200) {

            self.stackFuel = true;
            self.buildQueue = [];
          }
        }
        else if (msg === 72 && heardId !== self.me.id) {
          self.status = 'pause';
        }

      }
    }
  }
  for (let tt in self.rallyTargets) {
    let k = self.rallyTargets[tt];
  }
  
  self.castles = 0;
  self.pilgrims = 0;
  self.scouts = 0;
  self.crusaders = 0;
  self.churches = 0;
  self.prophets = 0;
  self.preachers = 0;
  self.churchesThatBuild = 0;
  for (let id in self.allUnits) {
    let alive = false;
    for (let k = 0; k < idsWeCanHear.length; k++) {
      if (idsWeCanHear[k] == id) {
        alive = true;
        break;
      }
    }
    if (alive === true){      
      switch(self.allUnits[id].unit) {
        case 0:
          self.castles += 1;
          break;
        case 1:
          self.churches += 1;
          break;
        case 2:
          
          if (self.allUnits[id].type === 'scout') {
            self.scouts += 1;
          }
          else {
            self.pilgrims += 1;
          }
          break;
        case 3:
          self.crusaders += 1;
          break;
        case 4:
          self.prophets += 1;
          break;
        case 5:
          self.preachers += 1;
          break;
        case 75:
          self.churchesThatBuild += 1;
        default:
          break;
      }
    }
    else {
      delete self.occupiedMiningLocationsIndices[id];
      delete self.allUnits[id];
      delete self.rallyTargets[id];
      
      if (id == self.myScoutsId) {
        self.castleHasScout = false;
        self.myScoutsId = -1;
      }
    }
  }
  let unitsInVincinity = {0:[],1:[],2:[],3:[],4:[],5:[]};
  let farthestUnitDist = {0:0,1:0,2:0,3:0,4:0,5:0};
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.team === self.me.team){
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToUnit <= 100) {
        unitsInVincinity[obot.unit].push(obot);
        if (distToUnit > farthestUnitDist[obot.unit]) {
          farthestUnitDist[obot.unit] = distToUnit;
        }
      }
    }
  }

  
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    let heardId = robotsInVision[i].id;
    let signalmsg = robotsInVision[i].signal;
    if (signalmsg === 4 && robotsInVision[i].team === self.me.team) {
      let queueToCheck = self.searchQueue;
      let pilgrimAdjacentOnFuel = false;
      let pilgrimAdjacentOnKarbonite = false;
      let pilg = robotsInVision[i];
      if (fuelMap[pilg.y][pilg.x] === true) {
        pilgrimAdjacentOnFuel = true;
      }
      else if (karboniteMap[pilg.y][pilg.x] === true) {
        pilgrimAdjacentOnKarbonite = true;
      }
      
      let proceed = true;
      if (self.pilgrims <= self.maxPilgrims){
        if ((self.numPilgrimsMiningFuel < self.fuelSpots.length/2 ) && ((self.karbonite > 100 || self.fuel < self.prophets * 70 + self.pilgrims * 10) || (self.fuel <= 400 + self.churches * 400))){
          self.signal(3,2);
          if (self.searchQueueFuel.length) {
            queueToCheck = self.searchQueueFuel;
          }
          if (pilgrimAdjacentOnFuel) {
            proceed = false;
          }
        }
        else if (self.numPilgrimsMiningKarbonite < self.karboniteSpots.length/2 && self.karbonite <= 100){
          self.signal(2,2);
          if (self.searchQueueKarbonite.length) {
            queueToCheck = self.searchQueueKarbonite;
          }
          if (pilgrimAdjacentOnKarbonite) {
            proceed = false;
          }
        }
        else {
          self.signal(24584, 2);
          if (pilgrimAdjacentOnFuel || pilgrimAdjacentOnKarbonite) {
            proceed = false;
          }
        }
      }
      else {
        self.signal(24584, 2);
      }
      if (queueToCheck.length && proceed === true){
        let padding = 28842;
        let val = getIndexAllSpots(self, queueToCheck[0].position);
        self.signal(padding + val, 2);
        self.castleTalk(77 + val);
      }
      else {
        self.signal(24584, 2);
      }
    }
    if (msg === 135 && self.allUnits[heardId].type === 'scout') {
      if (unitsInVincinity[SPECS.PROPHET].length >= 12) {
        let newRallyTarget = null;
        let bc = self.rallyTargets[self.myScoutsId];
        if (bc !== undefined && bc.position !== undefined) {
          if (bc.position[0] !== null && bc.position[1] !== null){ 
            newRallyTarget = bc.position;
          }
        }

        if (newRallyTarget !== null && self.lastRallySignal < self.me.turn - 5){
          let padding = 29003
          let compressedLocationNum = self.compressLocation(newRallyTarget[0], newRallyTarget[1]);
          self.signal(padding + compressedLocationNum, 64);
          self.lastRallySignal = self.me.turn
        }
      }
    }
  }
  
  
  
  
  let sawEnemyThisTurn = false;
  let sawCrusader = false;
  let nearestEnemyLoc = null
  let closestEnemyDist = 1000;
  let sawProphet = false;
  let sawPreacher = false;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.unit === SPECS.CRUSADER) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    else if (obot.unit === SPECS.PREACHER) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      
    }
    else if (obot.unit === SPECS.PROPHET) {
      let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
    }
    if (obot.team === otherTeamNum) {
      if (obot.unit !== SPECS.PILGRIM){
        let distToUnit = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
        
        if (distToUnit < closestEnemyDist) {
          if (obot.unit === SPECS.PROPHET) {
            sawProphet = true;
          }
          else if (obot.unit === SPECS.CRUSADER) {
            sawCrusader = true;
          }
          else if (obot.unit === SPECS.PREACHER) {
            sawPreacher = true;
          }
          nearestEnemyLoc = {x: obot.x, y: obot.y};
          closestEnemyDist = distToUnit
          sawEnemyThisTurn = true;
        }
      }
      
    }
  }
  
  let preacherAttacks = false;
  let buildScout = false;
  let prophetAttacks = false;
  if (sawEnemyThisTurn === false) {
    if (self.sawEnemyLastTurn === true) {
      let range = 64;
      range = Math.min(Math.max(Math.pow(Math.ceil(Math.sqrt(Math.max(farthestUnitDist[SPECS.PROPHET], farthestUnitDist[SPECS.PREACHER]))), 2), 4),64);
      self.signal(16391, range);
    }
  }
  if (self.castleHasScout === true) {
    self.minKarbonite = 900;
    self.minFuel = 200;
  }
  else {
    self.minKarbonite = 200;
    self.minFuel = 50;
  }
  if (self.castles > 1){
    if (sawEnemyThisTurn === false && self.me.turn > 4 && self.stackKarbonite === false && self.stackFuel === false) {

      if (self.pilgrims <= self.maxPilgrims && self.karbonite >= 100) {
        self.buildQueue = [2];
      }
      else if (self.karbonite >= self.minKarbonite && self.fuel > (self.prophets + self.preachers) * self.minFuel){

        if ((unitsInVincinity[SPECS.PROPHET].length <= self.prophets/(self.castles) || self.karbonite > self.minKarbonite + 90) && self.status !== 'pause') {
          self.buildQueue = [4];
          if (self.prophets > 15 * self.crusaders) {
            self.buildQueue = [3];
          }
        }
        if (unitsInVincinity[SPECS.PROPHET].length >= 11 && self.oppositeCastleDestroyed === false && self.castleHasScout === true) {
        }
        
        else if (self.castleHasScout === false && unitsInVincinity[SPECS.PROPHET].length >= 11) {
          buildScout = true;
          self.buildQueue = [2];
        }
        
      }
      self.sawEnemyLastTurn = false;

    }
    else if (sawEnemyThisTurn === true){
      let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
      let padding = 12294;
      if (sawProphet === true) {
        padding = 16392;
      }
      let range = 64;
      range = Math.min(Math.max(Math.pow(Math.ceil(Math.sqrt(Math.max(farthestUnitDist[SPECS.PROPHET], farthestUnitDist[SPECS.PREACHER]))), 2), 4),64);
      self.signal(padding + compressedLocationHash, range);
      self.sawEnemyLastTurn = true;

      self.status = 'build';

      if (self.me.turn > 0) {
        if (sawCrusader === true) {
          if (unitsInVincinity[SPECS.PREACHER].length < 1){
            self.buildQueue.unshift(5);
          }
          else {
            self.buildQueue.unshift(4);
          }
        }
        else if (sawPreacher === true) {
          if (unitsInVincinity[SPECS.PROPHET].length < 1){
            self.buildQueue.unshift(4);
          }
          else if (unitsInVincinity[SPECS.PREACHER].length < 1){
            self.buildQueue.unshift(5);
          }
          else if (self.fuel >= unitsInVincinity[SPECS.PROPHET].length * 75 + 125){
            self.log(`enough ammo, build another prophet`)
            self.buildQueue.unshift(4);
          }
        }
        else if (self.fuel >= 200){
          self.buildQueue.unshift(4);
        }
      }
    }
    else if (sawEnemyThisTurn === false) {
      self.sawEnemyLastTurn = false;
    }
  }
  else {
    if (sawEnemyThisTurn === false && self.me.turn > 4 && self.stackKarbonite === false && self.stackFuel === false) {
      if (self.sawEnemyLastTurn === true) {
        self.signal(16391, 64);
        self.buildQueue = [];
      }
      let numProphetsInQueue = 0;
      self.buildQueue.forEach(function(a){
        if (a === 4)  {
          numProphetsInQueue += 1;
        }
      });

      if (self.pilgrims <= self.maxPilgrims && self.karbonite >= 100) {
        self.buildQueue = [2];
      }
      else if ((self.karbonite >= self.minKarbonite && self.fuel > (self.prophets + self.preachers) * self.minFuel)){
        self.buildQueue = [4];
        if (self.prophets > 15 * self.crusaders) {
            self.buildQueue = [3];
          }
        if (unitsInVincinity[SPECS.PROPHET].length >= 11 && self.oppositeCastleDestroyed === false && self.castleHasScout === true) {
        }
        else if (self.castleHasScout === false && unitsInVincinity[SPECS.PROPHET].length >= 11) {
          buildScout = true;
          self.buildQueue = [2];
        }
      }



      self.sawEnemyLastTurn = false;
    }
    else if (sawEnemyThisTurn === true){
      let compressedLocationHash = self.compressLocation(nearestEnemyLoc.x, nearestEnemyLoc.y);
      let padding = 12294;
      if (sawProphet === true) {
        padding = 16392;
      }
      let range = 64;
      range = Math.min(Math.max(Math.pow(Math.ceil(Math.sqrt(Math.max(farthestUnitDist[SPECS.PROPHET], farthestUnitDist[SPECS.PREACHER]))), 2), 4),64);
      self.signal(padding + compressedLocationHash, range);
      self.sawEnemyLastTurn = true;
      self.status = 'build';
      if (self.me.turn > 0){
        if (sawCrusader === true) {
          if (unitsInVincinity[SPECS.PREACHER].length < 1){
            self.buildQueue.unshift(5);
          }
          else {
            self.buildQueue.unshift(4);
          }
        }
        else if (sawPreacher === true) {
          if (unitsInVincinity[SPECS.PROPHET].length < 1){
            self.buildQueue.unshift(4);
          }
          else if (unitsInVincinity[SPECS.PREACHER].length < 1){
            self.buildQueue.unshift(5);
          }
          else if (self.fuel >= unitsInVincinity[SPECS.PROPHET].length * 75 + 125){
            self.buildQueue.unshift(4);
          }
        }
        else if (self.fuel >= 200){
          self.buildQueue.unshift(4);
        }
      }
    }
    else if (sawEnemyThisTurn === false) {
      self.sawEnemyLastTurn = false;
    }
  }
  
  if (self.me.turn >= 920 && self.castles < self.castleCount && self.finalSignal === false) {
    let targetLoc = self.knownStructures[otherTeamNum][0];
    let compressedLocationHash = self.compressLocation(targetLoc.x, targetLoc.y);
    let padding = 20488;
    self.finalSignal = true;
    self.signal (padding + compressedLocationHash, 100);
  }
  else if (self.me.turn >= 920 && self.fuel >= 1000) {
    self.buildQueue = [3];
  }
  if (((self.fuel <= self.preachers * 50 + self.prophets * 60) || self.fuel <= 100) && sawEnemyThisTurn === false) {
    self.status = 'pause';
  }
  if (self.status === 'build') {
    if (buildEarlyProphet === true) {
      self.buildQueue.unshift(4);
      self.log(`using early strat`)
    }
    if (self.buildQueue[0] !== -1){
      let reverse = false;
      let adjacentPos = [];
      if (self.buildQueue[0] === 2){
        adjacentPos = self.buildingPilgrimPositions
        
        let checkQueue = self.searchQueue;
        if (self.searchQueueKarbonite.length) {
          checkQueue = self.searchQueueKarbonite;
        }
        if (checkQueue.length){
          let tpos = checkQueue[0].position;
          let adjacentPosDist = adjacentPos.map(function(a){
            return {pos:a, dist: qmath.dist(a[0], a[1], tpos[0], tpos[1])}
          });
          adjacentPosDist.sort(function(a,b){
            return a.dist - b.dist;
          })
          adjacentPos = adjacentPosDist.map(function(a){return a.pos});
        }
      }
      else {
        adjacentPos = self.buildingAttackUnitPositions;
      }
      
      if (self.buildQueue[0] === 4 && sawEnemyThisTurn) {
        reverse = true;
      }
      if (reverse === false) {
        for (let i = 0; i < adjacentPos.length; i++) {
          let checkPos = adjacentPos[i];
          if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

            if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
              let unit = self.buildQueue.shift();
              
              if (self.me.turn === 3 && sendEarlyProphetStrat === true && self.closestContestableSpot !== null) {
                let padding = 24586;
                
                let compressedLocNum = self.compressLocation(self.closestContestableSpot.x,self.closestContestableSpot.y);
                let val = getIndexAllSpots(self, [self.closestContestableSpot.x,self.closestContestableSpot.y]);
                self.signal(padding + compressedLocNum,  2);
                self.castleTalk(77 + val);
              }
              
              if (unit === 2 && self.searchQueue.length && self.me.turn !== 3 && buildScout === false) {
                
                if (self.me.turn > 3){
                  let queueToCheck = self.searchQueue;
                  if (self.searchQueueKarbonite.length) {
                    queueToCheck = self.searchQueueKarbonite;
                  }
                  let padding = 28682;
                  let val = getIndexAllSpots(self, queueToCheck[0].position);
                  if (self.me.turn !== 2){
                    self.signal(padding + val, 2);

                    self.castleTalk(77 + val);
                  }
                }
                else {
                  self.signal(2, 2);
                }
              }
              else if (unit === 2 && buildScout === true) {
                self.signal(29002,2);
                self.castleHasScout = true;
              }
              if ((unit === 5 && preacherAttacks === true) || unit === 3 || (unit === 4 && prophetAttacks === true)) {
                let newRallyTarget = null;
                
                let bc = self.rallyTargets[self.myScoutsId];
                if (bc !== undefined) {
                  if (bc.position[0] !== null && bc.position[1] !== null){ 
                    newRallyTarget = bc.position;
                  }
                }
                
                
                if (newRallyTarget !== null){
                  let padding = 29003
                  let compressedLocationNum = self.compressLocation(newRallyTarget[0], newRallyTarget[1]);
                  
                }
              }
              self.pastBuildQueue.push(unit)
              if (self.pastBuildQueue.length >= 10) {
                self.pastBuildQueue.shift();
              }
              let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
              action = self.buildUnit(unit, rels.dx, rels.dy);
              return {action:action};
            }
          }

        }
      }
      else if (reverse === true) {
        for (let i = adjacentPos.length - 1; i >= 0; i--) {
          let checkPos = adjacentPos[i];
          if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

            if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
              let unit = self.buildQueue.shift();
              self.pastBuildQueue.push(unit)
              if (self.pastBuildQueue.length >= 10) {
                self.pastBuildQueue.shift();
              }
              let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
              action = self.buildUnit(unit, rels.dx, rels.dy);
              return {action:action};
            }
          }
        }
      }
    }
    else {
      self.buildQueue.shift();
    }
  }
  
  if (self.status === 'pause'){
    
  }
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  
  let closestEnemy = null;
  let closestDist = 99999;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    if (obot.team !== self.me.team) {
      let distToBot = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      if (distToBot < closestDist && distToBot <= 64) {
        closestDist = distToBot;
        closestEnemy = obot;
      }
    }
  }
  if (closestEnemy !== null) {
    let rels = base.rel(self.me.x, self.me.y, closestEnemy.x, closestEnemy.y);
    return {action: self.attack(rels.dx,rels.dy)};
  }
  
  
  return {action: '', status: 'build', response:''};
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
function enoughResourcesToBuild(self, unitType) {
  let fuelCost = SPECS.UNITS[unitType].CONSTRUCTION_FUEL;
  let karbCost = SPECS.UNITS[unitType].CONSTRUCTION_KARBONITE;
  if (fuelCost <= self.fuel) {
    if (karbCost <= self.karbonite) {
      return true;
    }
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
function getIndexAllSpots(self, pos){
  for (let i = 0; i < self.allSpots.length; i++) {
    let p = self.allSpots[i];
    if (p.x === pos[0] && p.y === pos[1]) {
      return i;
    }
  }
  return null;
}
export default {mind}