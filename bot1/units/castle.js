import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import signal from '../signals.js';
import qmath from '../math.js'
import base from '../base.js'
// unit number: 0=Castle, 1=Church, 2=Pilgrim, 3=Crusader, 4=Prophet, 5=Preacher
function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  let gameMap = self.map;
  let mapLength = self.map.length;
  let action = '';
  let forcedAction = null;
  let otherTeamNum = (self.me.team + 1) % 2;
  let robotMap = self.getVisibleRobotMap();
  let karboniteMap = self.getKarboniteMap();
  let fuelMap = self.getFuelMap();
  //Initialization code for the castle
  if (self.me.turn === 1){
    //CALCULATING HOW MANY INITIAL CASTLES WE HAVE
    //self.castleTalk(255);
    self.occupiedMiningLocationsIndices = {}; 
    //all the indicesof mining locations in self.allSpots that currently have a unit moving towards it, mining on it, or trying to build on it.
    //It is updated through self.allUnits[id].mineLoc. Pilgrim only changes mineLoc if they die (the object is gone), or if received new signal when it is on return mode
    
    self.rallyTargets = {};//keys are the id of the robots that are scouts. rallyTargets[id].position = rally target/position of that scout
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
    //we can also detemrine the offset val by looking at how many castle talk messages of 0 this castle gets.
    //if we all build turn 1, castle 1 gets 3 messages, castle 2 gets 4 messages, castle 3 gets 5 messages.
    
    //self.log(`We have ${robotsInVision.length - offsetVal} castles`);
    self.castles = robotsInVision.length - offsetVal;
    self.castleCount = self.castles;
    self.maxScoutingPilgrims = self.castleCount;
    self.currentScoutingPilgrims = 0;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    
    self.stackFuel = false;
    
    self.oppositeCastleDestroyed = false; //doesn't seem to be used
    
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
    
    
    //From fuelspot and karbonite spot locations, locate the closest contestable resource deposit.
    //Contestable CRITERIA
    //Resource spot is contestable if it is within r^2 of 64 of the same resource deposit on the other half
    self.contestableSpots = [];
    /*
    for (let i = 0; i < self.fuelSpots.length; i++) {
      let spot = self.fuelSpots[i];
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
    */
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
    
    //Here, we initialize self.AllUnits to contain ids of all the castles
    let locCastleNum = 0;
    //we store castle ids here to check if id of robot sending msg in castle talk is an castle or not
    self.castleIds = [];
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      //self.log(`Received from ${robotsInVision[i].id} castle msg: ${msg}`);
      
      //because we receive castle information first, locCastleNum < self.castles makes sure the messages received are just castles sending 0's or alive signals
      if (msg >= 0) {
        self.allUnits[robotsInVision[i].id] = {};
        self.allUnits[robotsInVision[i].id].unit = 0;
        self.allUnits[robotsInVision[i].id].type = 'default';
        locCastleNum +=1;
        self.castleIds.push(robotsInVision[i].id);
        
        //initialize location messages objects
        self.initialCastleLocationMessages[robotsInVision[i].id] = {};
        self.initialCastleLocationMessages[robotsInVision[i].id].x = -1;
        self.initialCastleLocationMessages[robotsInVision[i].id].y = -1;
        //self.log(`${self.initialCastleLocationMessages[robotsInVision[i].id].x}`);
      }
      
      //SPECIAL MICRO MANAGE TO SEND CASTLE LOCATION BY TURN 1
      
      //SEND OUR X LOCATION TO OTHER CASTLES!
      
      
      //IN TURN 1 WE PROCESS CASTLE TALK AS FOLLOWS
      //MSG contains X POSITION OF FRIENDLY CASTLE PADDED by 191. 192 -> x:0, 193-> x:1,..., 255-> x:63;
      self.sawEnemyLastTurn = false;
      
    }
    
    //INITIAL BUILDING STRATEGIES
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
    //here we prioritize building directions
    let allAdjacentPos = search.circle(self, self.me.x, self.me.y, 2);
    let desiredX = enemyCastle[0];
    let desiredY = enemyCastle[1];
    
    let tempPos = [];
    self.buildingAttackUnitPositions = [];
    self.buildingPilgrimPositions = [];
    
    //find best building spots for building attacking unit
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    //sort by shortest distance to enemy
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    
    self.buildingAttackUnitPositions = tempPos.map(function(a){
      return a.pos;
    })
    //self.log('Attack build pos: '+ self.buildingAttackUnitPositions);
    
    tempPos = [];
    desiredX = closestKarbonitePos[0];
    desiredY = closestKarbonitePos[1];
    for (let i = 0; i < allAdjacentPos.length; i++) {
      if (allAdjacentPos[i][0] !== self.me.x || allAdjacentPos[i][1] !== self.me.y){
        tempPos.push({pos:allAdjacentPos[i], dist:qmath.dist(allAdjacentPos[i][0], allAdjacentPos[i][1], desiredX, desiredY)});
      }
    }
    //sort by shortest distance to karbonite
    tempPos.sort(function(a,b){
      return a.dist - b.dist;
    });
    self.buildingPilgrimPositions = tempPos.map(function(a){
      return a.pos;
    })
    //self.log('Pilgrim build pos: ' + self.buildingPilgrimPositions);
    
    
    
    
  }
  //CODE FOR DETERMINING FRIENDLY CASTLE LOCATIONS!
  
  if (self.me.turn <= 3) {
    if (self.me.turn === 1) {
      let xposPadded = self.me.x + 192;
      //self.log(`Said X: ${xposPadded}`);
      self.castleTalk(xposPadded);
    }
    else if (self.me.turn === 2){
      let yposPadded = self.me.y + 192;
      self.castleTalk(yposPadded);
      //self.log(`Said y: ${yposPadded}`);
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
            //self.log(`Received x pos from castle-${botId}  msg: ${msg}=${msg-192}`);
            self.initialCastleLocationMessages[botId].x = (msg - 192);
          }
          else {
            //self.log(`Received y pos from castle-${botId}  msg: ${msg}=${msg-192}`);
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
    //STORE A SORTED ENEEMY LOCATION ARRAY
    self.enemyCastlesSorted = [];
    for (let i = 0; i < self.castleIds.length; i++){
      let castleId = self.castleIds[i];
      let nx = self.initialCastleLocationMessages[castleId].x;
      let ny = self.initialCastleLocationMessages[castleId].y;
      if (nx !== -1 && ny !== -1){
        //self.log(`Castle Location Data Received for castle-${castleId}: ${self.initialCastleLocationMessages[castleId].x}, ${self.initialCastleLocationMessages[castleId].y}`);

        //NOW STORE ALL ENEMY CASTLE LOCATION DATA AND ALL FRIENDLY CASTLE LOC DATA

        //LOG FRIENDLY
        base.logStructure(self,nx,ny,self.me.team, 0);

        //LOG ENEMY
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
    //figure out which castle is best sutied for sending an early prophet
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      if (msg === 76) {
        sendEarlyProphetStrat = false;
      }
    }
    if (sendEarlyProphetStrat === true){
      self.log(`checking if we are good castle to send prophet`)
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
        self.log(`we are good castle to send prophet`)
        self.closestContestableSpot = bestSpot;
        buildEarlyProphet = true;
      }
    }
    if (buildExtraPilgrim === true) {
      self.buildQueue.push(2,2);
    }
  }
  
  //BY DEFAULT CASTLE ALWAYS BUILDS UNLESS TOLD OTHERWISE:
  self.status = 'build';
  self.canBuildPilgrims = true;
  self.canBuildPreachers = true;
  self.stackFuel = false;
  self.stackKarbonite = false;
  self.numPilgrimsMiningKarbonite = 0;
  self.numPilgrimsMiningFuel = 0;
  let idsWeCanHear = [];
  
  //initialize priority queue of mining locations
  self.searchQueue = [];
  //THIS IS FOR FINDING ALL POSSIBLE MINING LOCATIONS AND STORING THEM
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
  //then we add more based on castle talked positions from prophets
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    let id = robotsInVision[i].id;
    if (msg >= 77 && self.allUnits[id] !== undefined) {
      //self.log(`Unit Type: ${self.allUnits[id].unit}, id: ${id}`);
      if (self.allUnits[id].unit === SPECS.PROPHET || (self.allUnits[id].unit === SPECS.PILGRIM && self.allUnits[id].type === 'miner')) {
        let newInd = msg - 77;
        let oml = self.allSpots[newInd];
        let distToThere = qmath.dist(self.me.x, self.me.y, oml.x, oml.y);
        //self.log(`Heard that ${oml.x}, ${oml.y} is open (${oml.type} from ${self.allUnits[id].unit})`);

        //let newSafeSpot = {x: oml.x, y: oml.y, safe: true};
        self.allSpots[newInd].safe = true; // IN THE FUTURE WATCH OUT FOR UNDEFINED!!!
        self.searchQueue.push({position: [oml.x, oml.y], distance: distToThere, type:oml.type});
      }
    }
  }
  //make sure we dont have the same positions in searchQueue
  let uniqueQueue = [];
  for (let i = 0; i < self.searchQueue.length; i++) {
    //check to submit
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
      //self.log(`spot: ${thisSpot.position}`);
    }
  }
  self.searchQueue = uniqueQueue;
  self.searchQueue.sort(function(a,b){
    return a.distance - b.distance
  });
  //self.log(`Avaible spots: ${self.searchQueue.length}`);
  self.maxPilgrims = Math.max(self.searchQueue.length, self.maxHalf);
  //self.log(`Safe spots:${self.searchQueue.length}`);
  //COUNTING NUMBER OF UNITS PLANNING TO OR ALREADY MINING FUEL OR KARB.

  // COOL BEANS
  self.log(`Hey guys, self.searchQueue.length: ${self.searchQueue.length}, max pilgrims: ${self.maxPilgrims}`);

  for (let index in self.occupiedMiningLocationsIndices) {
    let ind = self.occupiedMiningLocationsIndices[index];
    //self.log(`Occupied positions of ${index}: (${self.allSpots[ind].x}, ${self.allSpots[ind].y})`);
    if (self.allSpots[ind].type === 'fuel') {
      self.numPilgrimsMiningFuel += 1;
    }
    else if (self.allSpots[ind].type === 'karbonite'){
      self.numPilgrimsMiningKarbonite += 1; 
    }
  }
  
  //then filter out the searchQueue for unoccupied mining locations
  let newSearchQueue = [];
  //we do this insane micro thing before turn 3...
  if (self.me.turn > 3){
    for (let i = 0; i < robotsInVision.length; i++) {
      let msg = robotsInVision[i].castle_talk;
      let id = robotsInVision[i].id;
      if (msg >= 77 && self.allUnits[id] !== undefined) {
        //figuring out locations of new pilgrims that will go to that castles tell us, these messages stay there for 2 rounds
        if (self.allUnits[id].unit === SPECS.CASTLE || self.allUnits[id].unit === SPECS.CHURCH){
          //self.log(`castle-id: ${id}; msg: ${msg}; turn:${self.me.turn}`);
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
      //searched position is occupied
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

  //self.log(`Safe fuel spots:${self.searchQueueFuel.length}`);
  //self.log(`Safe karb spots:${self.searchQueueKarbonite.length}`);
  
  //THIS IS FOR PROCESSING ALL MESSAGES
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk; //msg through castle talk
    let signalmsg = robotsInVision[i].signal; //msg through normal signalling
    
    idsWeCanHear.push(robotsInVision[i].id);
    
    let orobot = robotsInVision[i];
    let heardId = orobot.id;
    signal.processMessageCastleTalk(self, msg, heardId); //process 6>=msg>=1
    //self.log(`Heard ${msg} from ${heardId}`);
    //if msg is >= 7, it must be from a unit with a known unit type already
    if (msg >= 0) {
      if (self.allUnits[heardId] === undefined) {
        self.allUnits[heardId] = {};
      }
 

    }
    // 77 <= msg <= 236 is for pilgrims to tell castle which spot its mining
    if (msg >= 77 && msg <= 236) {
      //self.log(`${heardId} said ${msg} and is type: ${self.allUnits[heardId].type}`);
      if (self.allUnits[heardId].unit === SPECS.PILGRIM && self.allUnits[heardId].type === 'miner') {
        //update the known mining locations. Stored into self object for access of previous turn data. Important as pilgrims willl send some other signals as well
        self.allUnits[heardId].mineLoc = msg - 77;
        //self.log(`Pilgrim - ${heardId} mines at ${self.allSpots[msg - 77].x},${self.allSpots[msg - 77].y}: msg: ${msg}`);
        self.occupiedMiningLocationsIndices[heardId] = self.allUnits[heardId].mineLoc;

      }
    }
    
    //if a message is received, work on it
    if (msg >= 1){
      if (self.allUnits[heardId].type === 'scout') {
        //self.log(`Scout msg: ${msg}`);
        if (msg >= 7 && msg <= 70) {
          //x position of scout;
          self.rallyTargets[heardId].position[0] = msg - 7;
        }
        else if (msg >= 71 && msg <= 134) {
          //y position of scout, padded of course
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

          //TODO, create a better hash from enemy castle position, that is more likely to be correct
          for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
            if (self.mapIsHorizontal) {
              //check xpos for almost unique castle identifier;
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
          //unused?
          if (self.karbonite <= 90){
            self.stackKarbonite = true;
            //self.canBuildPilgrims = false;

            self.buildQueue = [];
          }

          if (self.fuel <= 200) {

            self.stackFuel = true;
            self.buildQueue = [];
          }
        }
        else if (msg === 72 && heardId !== self.me.id) {
          //this castle doesn't have priority to build
          self.status = 'pause';
          self.log(`Caslte won't build`);
        }

        //vvv UNUSED!
        else if (msg === 73) {
          //self.numPilgrimsMiningKarbonite += 1;
          //self.log(`pilgrim is mining at ${self.allUnits[heardId].mineLoc}: ${heardId} `);
        }
        else if (msg === 74) {
          //self.numPilgrimsMiningFuel += 1;
          //self.log(`pilgrim is mining at ${self.allUnits[heardId].mineLoc}: ${heardId} `);
        }

      }
    }
  }
  for (let tt in self.rallyTargets) {
    let k = self.rallyTargets[tt];
    //self.log(`Rally targets: ${k.position}`);
  }
  
  //Count units
  self.castles = 0;
  self.pilgrims = 0;
  self.scouts = 0;
  self.crusaders = 0;
  self.churches = 0;
  self.prophets = 0;
  self.preachers = 0;
  self.churchesThatBuild = 0;
  //out of all last turns self.allUnits and the additional units added after processing signals, check which ones are still 
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
      //if dead, clear out some things
      //self.log(`Unit ${id}, type: ${self.allUnits[id].unit} died; Scout id: ${self.myScoutsId}`);
      delete self.occupiedMiningLocationsIndices[id];
      delete self.allUnits[id];
      delete self.rallyTargets[id];
      
      /* DONT CHANGE TO === BECAUSE FOR SOME DUMB REASON ID IS A STRING NOT A NUMBER?!?!?!?!*/
      if (id == self.myScoutsId) {
        //our scout died
        self.log(`Our scout ${id} died`);
        self.castleHasScout = false;
        self.myScoutsId = -1;
      }
    }
  }
  
  
  //ACCURATE numbers as of the end of the last round
  self.log(`Round ${self.me.turn}: Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches + self.churchesThatBuild}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}, Prophets: ${self.prophets}, Preachers: ${self.preachers}, Fuel:${self.fuel}, Karbonite: ${self.karbonite}; MiningFuel:${self.numPilgrimsMiningFuel}; MiningKarb:${self.numPilgrimsMiningKarbonite}; Scouts: ${self.scouts} ${self.me.time} ms left`);
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

  //Commands code:
  //Here, castles give commands to surrounding units?
  //Give commands to rally units to attack a known castle
  //Give commands to pilgrims who then relay the message to other units?
  
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk;
    let heardId = robotsInVision[i].id;
    let signalmsg = robotsInVision[i].signal;
    if (signalmsg === 4 && robotsInVision[i].team === self.me.team) {
      //pilgrim is nearby, assign it new mining status if needed. Alow it to mine anything if we have enough pilgrims
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
      //if pilgrim is on a resource tile when giving the resources, we allow the pilgrim to continue mining on that spot even though it si recorded as occupied (in previous round), continue minig there if designation is any or the same resource type.
      
      let proceed = true;
      if (self.pilgrims <= self.maxPilgrims){
        if ((self.numPilgrimsMiningFuel < self.fuelSpots.length/2 ) && ((self.karbonite > 100 || self.fuel < self.prophets * 70 + self.pilgrims * 10) || (self.fuel <= 400 + self.churches * 400))){
          // Can self.fuelSpots.length be replaced for numFuelSpots (assuming no change?)
          //self.log(`Castle tried to tell nearby pilgrims to mine fuel`);
          self.signal(3,2);
          if (self.searchQueueFuel.length) {
            queueToCheck = self.searchQueueFuel;
          }
          if (pilgrimAdjacentOnFuel) {
            proceed = false;
          }
        }
        else if (self.numPilgrimsMiningKarbonite < self.karboniteSpots.length/2 && self.karbonite <= 100){
          //self.log(`Castle tried to tell nearby pilgrims to mine karb`);
          self.signal(2,2);
          if (self.searchQueueKarbonite.length) {
            queueToCheck = self.searchQueueKarbonite;
          }
          if (pilgrimAdjacentOnKarbonite) {
            proceed = false;
          }
        }
        else {
          //self.log(`Castle tried to tell nearby pilgrims to mine anything`)
          self.signal(24584, 2);
          if (pilgrimAdjacentOnFuel || pilgrimAdjacentOnKarbonite) {
            proceed = false;
          }
        }
      }
      else {
        //self.log(`told ${robotsInVision[i].id} to mine anything as we have enough pilgrims`);
        self.signal(24584, 2);
      }
      if (queueToCheck.length && proceed === true){
        let padding = 28842; //send signal to a bot that was already built
        let val = getIndexAllSpots(self, queueToCheck[0].position);
        //self.log(`Castle told new pilgrim to go mine ${queueToCheck[0].position} = ${val}`);
        //signal to unit new mining location
        self.signal(padding + val, 2);
        //signal to all other castles that location
        self.castleTalk(77 + val);
      }
      else {
        //no places to mine? mine anything
        //self.log(`told ${robotsInVision[i].id} to mine anything there are no safe spots left`);
        self.signal(24584, 2);
      }
    }
    if (msg === 135 && self.allUnits[heardId].type === 'scout') {
      if (unitsInVincinity[SPECS.PROPHET].length >= 12) {
        let newRallyTarget = null;
        //go to our own rally target
        let bc = self.rallyTargets[self.myScoutsId];
        if (bc !== undefined && bc.position !== undefined) {
          if (bc.position[0] !== null && bc.position[1] !== null){ 
            newRallyTarget = bc.position;
          }
        }

        if (newRallyTarget !== null && self.lastRallySignal < self.me.turn - 5){
          let padding = 29003
          //reduce the number of times this signal is sent later
          let compressedLocationNum = self.compressLocation(newRallyTarget[0], newRallyTarget[1]);
          self.signal(padding + compressedLocationNum, 64);
          self.lastRallySignal = self.me.turn
          //return '';
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
      //sees enemy unit, send our units to defend spot
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
  
  //code for determing when castle sends its local army out.
  //let unitsInVincinity = search.unitsInRadius(self, 100);


  
  //determine if we want to move our archer defence up to front line
  
  
  
  
  
  //BUILDING DECISION CODE. DYNAMIC PART
  
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
        self.buildQueue.push[2];
      }
      else if (self.karbonite >= self.minKarbonite && self.fuel > (self.prophets + self.preachers) * self.minFuel){

        if ((unitsInVincinity[SPECS.PROPHET].length <= self.prophets/(self.castles) || self.karbonite > self.minKarbonite + 90) && self.status !== 'pause') {
          //we do minKarbonite +90 to treat edge cases when casltes double count some prophets in their vincinity, so this forces the castle to build anyway.
          //self.castleTalk(72);
          self.buildQueue = [4];
          if (self.prophets > 15 * self.crusaders) {
            self.buildQueue = [3];
          }
        }
        //IMPROVEMNTNTTNT
        if (unitsInVincinity[SPECS.PROPHET].length >= 11 && self.oppositeCastleDestroyed === false && self.castleHasScout === true) {
          //if in past 10 turns we built 3 crusaders, build 1 preacher
          /*
          let numCrusadersPast10 = 0;
          let numPreachersPast10 = 0;
          for (let k = 0; k < self.pastBuildQueue.length; k++) {
            let ud = self.pastBuildQueue[k];
            if (ud === 3) {
              numCrusadersPast10 += 1;
            }
            else if (ud === 5) {
              numPreachersPast10 += 1;
            }
          }
          if (numPreachersPast10 <= 1){
            self.buildQueue = [5];
            prophetAttacks = true;
            preacherAttacks = true;
          }
          else if (numCrusadersPast10 === 0 || numCrusadersPast10/numPreachersPast10 < 3){
            self.buildQueue = [3];
            
          }
          else {
            self.buildQueue = [5];
            prophetAttacks = true;
            preacherAttacks = true;
          }
          */
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
      //send only as far as we need. Max of 64 because we only process signals from units we know are our own team
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


  //1 castle code
  else {
    if (sawEnemyThisTurn === false && self.me.turn > 4 && self.stackKarbonite === false && self.stackFuel === false) {
      if (self.sawEnemyLastTurn === true) {
        //saw enenemy last turn, now we don't see
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
        //self.log(`${unitsInVincinity[SPECS.PROPHET].length} prop near, opp destroyed: ${self.oppositeCastleDestroyed}`)
        if (unitsInVincinity[SPECS.PROPHET].length >= 11 && self.oppositeCastleDestroyed === false && self.castleHasScout === true) {
          /*
          let numCrusadersPast10 = 0;
          let numPreachersPast10 = 0;
          for (let k = 0; k < self.pastBuildQueue.length; k++) {
            let ud = self.pastBuildQueue[k];
            if (ud === 3) {
              numCrusadersPast10 += 1;
            }
            else if (ud === 5) {
              numPreachersPast10 += 1;
            }
          }
          if (numPreachersPast10 <= 1){
            self.buildQueue = [5,4];
            preacherAttacks = true;
            prophetAttacks = true;
          }
          else if (numCrusadersPast10 === 0 || numCrusadersPast10/numPreachersPast10 < 4){
            self.buildQueue = [3];
            
          }
          else {
            self.buildQueue = [5,4];
            prophetAttacks = true;
            preacherAttacks = true;
          }
          */
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
      //self.log(`Sent range : ${range}`);
      self.signal(padding + compressedLocationHash, range);
      self.sawEnemyLastTurn = true;
      //spam mages if we dont have any, otherwise prophets!
      //let unitsInVincinity = search.unitsInRadius(self, 36);
      self.status = 'build';
      //we start building up prophets after their rush is done
      //dont build if we have so little fuel as there is no point
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
            //self.log(`enough ammo, build another prophet`)
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
  
  //if its turn 900, and we have lost at least one castle, go at enemey
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
  

  
  //BUILDING CODE
  //only build if we have sufficient fuel for our units to perform attack manuevers
  if (((self.fuel <= self.preachers * 50 + self.prophets * 60) || self.fuel <= 100) && sawEnemyThisTurn === false) {
    self.status = 'pause';
  }
  if (self.status === 'build') {
    if (buildEarlyProphet === true) {
      self.buildQueue.unshift(4);
      self.log(`using early strat`)
    }
    //self.log(`BuildQueue: ${self.buildQueue}`)
    if (self.buildQueue[0] !== -1){
      let reverse = false;
      let adjacentPos = [];//search.circle(self, self.me.x, self.me.y, 2);
      if (self.buildQueue[0] === 2){
        adjacentPos = self.buildingPilgrimPositions
        
        //sort adjacent positions by distance to checkQueue
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
        //if we build a prophet and we saw an enemy, force the prophet to build far away.
        //self.log(`Reverse prophet`)
        reverse = true;
      }
      if (reverse === false) {
        for (let i = 0; i < adjacentPos.length; i++) {
          let checkPos = adjacentPos[i];
          if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

            if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
              //build the first unit put into the build queue
              let unit = self.buildQueue.shift(); //remove that unit
              
              //HIGHLY SPECIFIC CODE DONT TOUCH? FOR EARLY PROPHET STRAT
              if (self.me.turn === 3 && sendEarlyProphetStrat === true && self.closestContestableSpot !== null) {
                //tell first 2 units, probably a prophet and pilgrim, to go this spot
                let padding = 24586;
                
                let compressedLocNum = self.compressLocation(self.closestContestableSpot.x,self.closestContestableSpot.y);
                let val = getIndexAllSpots(self, [self.closestContestableSpot.x,self.closestContestableSpot.y]);
                //self.log(`Castle told new pilgrim to go early mine ${self.closestContestableSpot.x}, ${self.closestContestableSpot.y} = ${val}`);
                self.signal(padding + compressedLocNum,  2);
                //let padding = 28682;
                //self.signal(padding + val, 2);
                self.castleTalk(77 + val);
              }
              
              //GENERAL CODE FOR NEW PILGRIMS
              if (unit === 2 && self.searchQueue.length && self.me.turn !== 3 && buildScout === false) {
                
                if (self.me.turn > 3){
                  let queueToCheck = self.searchQueue;
                  if (self.searchQueueKarbonite.length) {
                    //default pick up karbo...
                    queueToCheck = self.searchQueueKarbonite;
                  }
                  let padding = 28682;
                  let val = getIndexAllSpots(self, queueToCheck[0].position);
                  if (self.me.turn !== 2){
                    //self.log(`Castle told new pilgrim to go mine ${queueToCheck[0].position} = ${val}`);
                    //signal to unit new mining location
                    self.signal(padding + val, 2);
                    //signal to all other castles that location

                    self.castleTalk(77 + val);
                  }
                }
                else {
                  //TELL NEW PILGRIM TO MINE ANYWHERE!
                  self.signal(2, 2);
                }
              }
              else if (unit === 2 && buildScout === true) {
                self.signal(29002,2);
                self.castleHasScout = true;
              }
              if ((unit === 5 && preacherAttacks === true) || unit === 3 || (unit === 4 && prophetAttacks === true)) {
                //signal to preacher the rally location
                //find closest rally taget
                /*
                let closestRallyTarget = null;
                let closestDist = 99999;
                
                for (let ab in self.rallyTargets) {
                  let bc = self.rallyTargets[ab];
                  if (bc.position[0] !== null && bc.position[1] !== null){
                    self.log(`Rally Target: ${bc.position[0]}, ${bc.position[1]}`);
                    let thisDist = qmath.dist(self.me.x, self.me.y, bc.position[0], bc.position[1])
                    if (thisDist < closestDist) {
                      closestDist = thisDist;
                      closestRallyTarget = bc.position;
                    }
                  }
                }
                */
                let newRallyTarget = null;
                //go to our own rally target
                
                let bc = self.rallyTargets[self.myScoutsId];
                if (bc !== undefined) {
                  if (bc.position[0] !== null && bc.position[1] !== null){ 
                    newRallyTarget = bc.position;
                  }
                }
                
                
                if (newRallyTarget !== null){
                  let padding = 29003
                  let compressedLocationNum = self.compressLocation(newRallyTarget[0], newRallyTarget[1]);
                  //self.signal(padding + compressedLocationNum, 2);
                  
                }
              }
              //if we are naturally building a prophet not because of incoming enemies, and it is after we decide on that early strategy, send prophet to closest contestable spot. We should instead actually just have the prophet that is going to the contestable spot that is on defendSpot mode to send thru castle talk if they made it there or not.
              /*
              if (self.me.turn > 3 && sawEnemyThisTurn === false && self.closestContestableSpot !== null && self.sentContestableBot === false) {
                let padding = 24586;
                let compressedLocNum = self.compressLocation(self.closestContestableSpot.x,self.closestContestableSpot.y);
                self.sentContestableBot = true;
                self.signal(padding + compressedLocNum,  2);
              }
              */
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
              //build the first unit put into the build queue
              let unit = self.buildQueue.shift(); //remove that unit
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
  
  //if status is pause, that means we are stacking fuel, so send signal to nearby pilgrims to mine fuel
  if (self.status === 'pause'){
    
  }
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  
  //ATTACK IF WE AREN'T BUILDING
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

//returns true if unit can build on that location
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
  //check if nx, ny is in vision
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
      if (ny < mapLength/2) {
        //self.log(`Y:${nx}, ${ny} is on our half`)
        return true;
      }
    }
    else {
      if (ny >= mapLength/2) {
        //self.log(`Y:${nx}, ${ny} is on our half`)
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