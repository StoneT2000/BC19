import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import signal from '../signals.js';
import qmath from '../math.js'
import base from '../base.js'
function mind(self) {
  let robotsMapInVision = self.getVisibleRobotMap();
  let passableMap = self.getPassableMap();
  //these 2d maps have it like map[y][x]...
  let robotsInVision = self.getVisibleRobots();
  let gameMap = self.map;
  let action = '';
  let forcedAction = null;
  let otherTeamNum = (self.me.team + 1) % 2;
  
  //Initialization code for the castle
  if (self.me.turn === 1){
    //CALCULATING HOW MANY INITIAL CASTLES WE HAVE
    //self.castleTalk(255);
    let offsetVal = 0;
    if (self.karbonite === 70) {
      offsetVal = 1;
    }
    else if (self.karbonite === 40) {
      offsetVal = 2;
    }
    //we can also detemrine the offset val by looking at how many castle talk messages of 0 this castle gets.
    //if we all build turn 1, castle 1 gets 3 messages, castle 2 gets 4 messages, castle 3 gets 5 messages.
    
    //self.log(`We have ${robotsInVision.length - offsetVal} castles`);
    self.castles = robotsInVision.length - offsetVal;
    self.castleCount = self.castles;
    self.mapIsHorizontal = search.horizontalSymmetry(gameMap);
    
    self.initializeCastleLocations();
    
    self.stackFuel = false;
    
    self.oppositeCastleDestroyed = false; //doesn't seem to be used
    
    let fuelMap = self.getFuelMap();
    let karboniteMap = self.getKarboniteMap();
    let closestKarbonitePos = null;
    let closestKarboniteDist = 999999;
    for (let i = 0; i < fuelMap.length; i++) {
      for (let j = 0; j < fuelMap[0].length; j++) {
        if (fuelMap[i][j] === true){
          self.fuelSpots.push({x:j, y:i});
        }
        if (karboniteMap[i][j] === true){
          self.karboniteSpots.push({x:j, y:i});
          let distToKarb = qmath.dist(j, i, self.me.x, self.me.y);
          if (distToKarb < closestKarboniteDist) {
            closestKarboniteDist = distToKarb
            closestKarbonitePos = [j, i];
          }
        }
      }
    }
    let numFuelSpots = self.fuelSpots.length;
    self.maxPilgrims = Math.ceil((self.fuelSpots.length + self.karboniteSpots.length)/2);
    
    
    
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
        self.allUnits[robotsInVision[i].id] = 0;
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
    //only first castle builds pilgrim in 3 preacher defence strategy
    if (self.castles === 3) {
      //only first castle builds pilgrim in 3 preacher defence strategy
      if (offsetVal === 0) {
        self.buildQueue.push(5,5,5,5,5,5,5);
      }
      else if (offsetVal === 1){
        //self.buildQueue.push(2);
      }
      else if (offsetVal === 2) {
        //self.buildQueue.push(2);
      }
    }
    else if (self.castles === 2) {
      if (offsetVal === 0) {
        self.buildQueue.push(5,5,5,5,5,5,5);
      }
      else if (offsetVal === 1) {
        //self.buildQueue.push(2);
      }
    }
    else if (self.castles === 1) {
      self.buildQueue.push(5,5,5,5,5,5,5);
      //self.buildQueue.push(5,4,3,3,3,2);
      //self.buildQueue.push(2,4,4,4);
      //defending against 4 archers seems to need 4 archer defence
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
    self.log('Attack build pos: '+ self.buildingAttackUnitPositions);
    
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
    self.log('Pilgrim build pos: ' + self.buildingPilgrimPositions);
    
    
    
    
  }
  //CODE FOR DETERMINING FRIENDLY CASTLE LOCATIONS!
  
  if (self.me.turn <= 3) {
    if (self.me.turn === 1) {
      let xposPadded = self.me.x + 192;
       self.log(`Said X: ${xposPadded}`);
      self.castleTalk(xposPadded);
    }
    else if (self.me.turn === 2){
      let yposPadded = self.me.y + 192;
      self.castleTalk(yposPadded);
      self.log(`Said y: ${yposPadded}`);
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
            self.log(`Received x pos from castle-${botId}  msg: ${msg}=${msg-192}`);
            self.initialCastleLocationMessages[botId].x = (msg - 192);
          }
          else {
            self.log(`Received y pos from castle-${botId}  msg: ${msg}=${msg-192}`);
            self.initialCastleLocationMessages[botId].y = (msg - 192);
          }
        }

      }
    }
  }

  if (self.me.turn === 3) {
    
    //STORE A SORTED ENEEMY LOCATION ARRAY
    self.enemyCastlesSorted = [];
    for (let i = 0; i < self.castleIds.length; i++){
      let castleId = self.castleIds[i];
      let nx = self.initialCastleLocationMessages[castleId].x;
      let ny = self.initialCastleLocationMessages[castleId].y;
      if (nx !== -1 && ny !== -1){
        self.log(`Castle Location Data Received for castle-${castleId}: ${self.initialCastleLocationMessages[castleId].x}, ${self.initialCastleLocationMessages[castleId].y}`);

        //NOW STORE ALL ENEMY CASTLE LOCATION DATA AND ALL FRIENDLY CASTLE LOC DATA

        //LOG FRIENDLY
        base.logStructure(self,nx,ny,self.me.team, 0);

        //LOG ENEMY
        let ex = nx;
        let ey = self.map.length - ny - 1;

        if (!self.mapIsHorizontal) {
          ex = self.map[0].length - nx - 1;
          ey = ny;
        }
        base.logStructure(self,ex,ey,otherTeamNum, 0);
      }
    }
    for (let i = 0; i < self.knownStructures[self.me.team].length; i++) {
      //self.log(`Castle at ${self.knownStructures[self.me.team][i].x}, ${self.knownStructures[self.me.team][i].y}`);
    }
    for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
      //self.log(`ENEMY Castle at ${self.knownStructures[otherTeamNum][i].x}, ${self.knownStructures[otherTeamNum][i].y}`);
      self.enemyCastlesSorted.push(self.knownStructures[otherTeamNum][i]);
    }
    self.enemyCastlesSorted.sort(function(a,b){
      return a.x - b.x;
    })
    for (let i = 0; i < self.enemyCastlesSorted.length; i++){
      self.log(`Enemy Castle: ${i}, at ${self.enemyCastlesSorted[i].x}, ${self.enemyCastlesSorted[i].y}`);
      for (let k = 0; k < self.knownStructures[otherTeamNum].length; k++) {
        let kx = self.knownStructures[otherTeamNum][k].x
        let ky = self.knownStructures[otherTeamNum][k].y;
        if (kx === self.enemyCastlesSorted[i].x && ky === self.enemyCastlesSorted[i].y) {
          self.knownStructures[otherTeamNum][k].index = i;
        }
      }
    }
    self.knownStructures[otherTeamNum].forEach(function(a){
      self.log(`Index for ${a.x}, ${a.y}: ${a.index}`)
    })
    
  }
  
  
  //BY DEFAULT CASTLE ALWAYS BUILDS UNLESS TOLD OTHERWISE:
  self.status = 'build';
  self.canBuildPilgrims = true;
  self.canBuildPreachers = true;
  self.stackFuel = false;
  self.stackKarbonite = false;
  
  let idsWeCanHear = [];
  for (let i = 0; i < robotsInVision.length; i++) {
    let msg = robotsInVision[i].castle_talk; //msg through castle talk
    let signalmsg = robotsInVision[i].signal; //msg through normal signalling
    
    idsWeCanHear.push(robotsInVision[i].id);
    
    let orobot = robotsInVision[i];
    let heardId = orobot.id;
    signal.processMessageCastleTalk(self, msg, robotsInVision[i].id);
    if (signalmsg === 4) {
      //pilgrim is nearby, assign it new mining stuff if needed
      if (self.me.turn <= 50) {
        if (self.status === 'pause' || (self.fuel <= self.preachers * 60 + self.prophets * 70) || self.stackFuel === true) {
          self.log(`Castle tried to tell nearby pilgrims to mine fuel`);
          self.signal(3,2)
        }
      }
      else {
        self.log(`Castle tried to tell nearby pilgrims to mine anything`)
        self.signal(24584, 2);
      }
    }
    
    if (msg >= 7 && msg <= 70) {
      let enemyCastlePosDestroyed = msg - 7;
      self.log(`Castle knows that enemy castle: ${enemyCastlePosDestroyed} was destroyed`);
      
      //TODO, create a better hash from enemy castle position, that is more likely to be correct
      for (let i = 0; i < self.knownStructures[otherTeamNum].length; i++) {
        if (self.mapIsHorizontal) {
          //check xpos for almost unique castle identifier;
          if (self.knownStructures[otherTeamNum][i].x === enemyCastlePosDestroyed) {
            if (enemyCastlePosDestroyed === gameMap[0].length - self.me.x - 1) {
              self.log(`Opposite castle destroyed`);
              self.oppositeCastleDestroyed = true;
            }
            self.knownStructures[otherTeamNum].splice(i,1);
            
            break;
          }
        }
        else {
          if (self.knownStructures[otherTeamNum][i].y === enemyCastlePosDestroyed) {
            if (enemyCastlePosDestroyed === gameMap.length - self.me.y - 1) {
              self.oppositeCastleDestroyed = true;
              self.log(`Opposite castle destroyed`);
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
      //dont allow pilgrims to be built
      if (self.karbonite <= 50){
        self.stackKarbonite = true;
        //self.canBuildPilgrims = false;
        self.log(`stacking karbo`);
        self.buildQueue = [];
      }
    }
    else if (msg === 72 && heardId !== self.me.id) {
      //this castle doesn't have priority to build
      self.status = 'pause';
      self.log(`Caslte won't build`);
    }
    
    
  }
  
  
  //Count units
  self.castles = 0;
  self.pilgrims = 0;
  self.crusaders = 0;
  self.churches = 0;
  self.prophets = 0;
  self.preachers = 0;
  
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
      switch(self.allUnits[id]) {
        case 0:
          self.castles += 1;
          break;
        case 1:
          self.churches += 1;
          break;
        case 2:
          self.pilgrims += 1;
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
        default:
          break;
      }
    }
  }
  
  
  //ACCURATE numbers as of the end of the last round
  self.log(`Round ${self.me.turn}: Castle (${self.me.x}, ${self.me.y}); Status: ${self.status}; Castles:${self.castles}, Churches: ${self.churches}, Pilgrims: ${self.pilgrims}, Crusaders: ${self.crusaders}, Prophets: ${self.prophets}, Preachers: ${self.preachers}, Fuel:${self.fuel}, Karbonite: ${self.karbonite}`);
  
  //Commands code:
  //Here, castles give commands to surrounding units?
  //Give commands to rally units to attack a known castle
  //Give commands to pilgrims who then relay the message to other units?
  
  
  let sawEnemyThisTurn = false;
  let nearestEnemyLoc = null
  let closestEnemyDist = 1000;
  let sawProphet = false;
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
          nearestEnemyLoc = {x: obot.x, y: obot.y};
          closestEnemyDist = distToUnit
          self.log(`Nearest to castle is ${nearestEnemyLoc.x}, ${nearestEnemyLoc.y}`);
          sawEnemyThisTurn = true;
        }
      }
      
    }
  }
  
  //code for determing when castle sends its local army out.
  let unitsInVincinity = search.unitsInRadius(self, 36);
  if (true) {
    
    
    if (unitsInVincinity[SPECS.PREACHER].length + unitsInVincinity[SPECS.PROPHET].length >= 3){
      self.status = 'pause';
      let distToTarget = qmath.unitDist(self.me.x, self.me.y, self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y);
      let fuelNeededForAttack = (distToTarget/2) * 8 * unitsInVincinity[SPECS.PREACHER].length + (distToTarget/2) * 10 * unitsInVincinity[SPECS.PROPHET].length;
      self.log(`Still need ${fuelNeededForAttack} fuel before attacking ${self.knownStructures[otherTeamNum][0].x}, ${self.knownStructures[otherTeamNum][0].y}`);
      self.stackFuel = true;

        let targetLoc = self.knownStructures[otherTeamNum][0];
        let compressedLocationHash = self.compressLocation(targetLoc.x, targetLoc.y);
        let padding = 20488;
        self.signal (padding + compressedLocationHash, 36);
    }
  }
  
  //BUILDING DECISION CODE. DYNAMIC PART
  
  //BUILDING DECISION CODE. CODE THAT MUST ALWAYS BE RUN REGARDLESS OF BEFORE
  
  
  
  //building code
  //only build if we have sufficient fuel for our units to perform attack manuevers
  if ((self.fuel <= self.preachers * 50 + self.prophets * 60) && sawEnemyThisTurn === false) {
    self.status = 'pause';
  }
  if (self.status === 'build') {
    
    self.log(`BuildQueue: ${self.buildQueue}`)
    if (self.buildQueue[0] !== -1){
      
      let adjacentPos = [];//search.circle(self, self.me.x, self.me.y, 2);
      if (self.buildQueue[0] === 2){
        adjacentPos = self.buildingPilgrimPositions
      }
      else {
        adjacentPos = self.buildingAttackUnitPositions;
      }
      
      
      for (let i = 0; i < adjacentPos.length; i++) {
        let checkPos = adjacentPos[i];
        
        if(canBuild(self, checkPos[0], checkPos[1], robotsMapInVision, passableMap)){

          if (self.buildQueue.length > 0 && enoughResourcesToBuild(self, self.buildQueue[0])) {
            //build the first unit put into the build queue
            let unit = self.buildQueue.shift(); //remove that unit

            if (self.buildQueue[self.buildQueue.length-1] === 2){
              //self.buildQueue.push(4,5,5);
            }
            else if (self.pilgrims <= self.maxPilgrims){
              //self.buildQueue.push(2);
            }
            else {
              //self.buildQueue.push(4,5,5);
            }
            if (unit >= 2) {
              //if unit to be built is a preacher, send signal telling the preacher the other castle locations
              /*
              if (self.castleCount >= 2){
                
                self.log(`There are ${self.knownStructures[otherTeamNum].length} enemy castlesleft, opposite castle is currently dead: ${self.oppositeCastleDestroyed}`);
                
                //IF There are at least 2 known structures alive, and the opposite castle isn't dead yet, send the new location the preacher with padding = 4102. Preacher will process the location and will continue to prioritize the opposite castle
                if (self.knownStructures[otherTeamNum].length > 1 && self.oppositeCastleDestroyed === false){
                  //if 
                  let compressedLocNum = self.compressLocation(self.knownStructures[otherTeamNum][1].x, self.knownStructures[otherTeamNum][1].y);
                  //padding of 4102;
                  //DETERMINE THE PADDING
                  let padding = 4102;
                  padding = 4102 //+ self.knownStructures[otherTeamNum][1].index * 4096;
                  
                  //TELL NEW UNIT IF THE KNOWN TARGET UNIT AUTOMATICALLY KNOWS IS DETROYED OR NOT
                  
                  self.signal(padding + compressedLocNum,  2);
                }
                
                //if there is at least one known structure alive, and the opposite castle is gone, this castle produces units to attack the other locations.
                else if (self.knownStructures[otherTeamNum].length >= 1)  {
                  if (self.oppositeCastleDestroyed === true) {
                    let padding = 8198
                    let compressedLocNum = self.compressLocation(self.knownStructures[otherTeamNum][0].x, self.knownStructures[otherTeamNum][0].y);
                    self.signal(padding + compressedLocNum,  2);
                  }
                }
              }
              */
            }
            let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
            action = self.buildUnit(unit, rels.dx, rels.dy);
            return {action:action};
            //RUSH STRAT
            /*
            if (self.crusaders < self.maxCrusaders) {
              return {action: self.buildUnit(3, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'build', response:'built'};
            }
            */
            //return {action:'',status:'build',response:'none'};
            //return {action: self.buildUnit(unit, search.bfsDeltas[1][i][0], search.bfsDeltas[1][i][1]), status:'build', response:'built'};
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

export default {mind}