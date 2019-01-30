import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
import signal from '../signals.js';
import pathing from '../pathing/pathing-bundled.js';
function mind(self) {
  
  //self.log(`Round: ${self.globalTurn}; Pilgrim (${self.me.x}, ${self.me.y}); Status: ${self.status}; ${self.me.time}ms left`);
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();

  let otherTeamNum = (self.me.team + 1) % 2;
  let action = '';
  let gameMap = self.map;
  let mapLength = self.map.length;

  let forcedAction = null;
  //INITIALIZATION
  self.globalTurn += 1;
  if (self.me.turn === 1) {
    //for pilgrims, search first
    self.searchQueue = [];
    
    self.lastWarCry = -100;
    
    //Mining Index: The index of the bots mining spot in self.allSpots. ONLY CHANGED WHEN TOLD BY CASTLE
    self.miningIndex = -1;
    self.lastChainTurn = -1;
    self.statusBeforeReturn = '';
    self.status = 'searchForKarbDeposit';
    self.status = 'waitingForCommand';
    self.onFrontLine = false;
    // SCOUTING
    self.firstTimeScouting = true;
    self.frontLineScoutingTarget = {x: 0, y: 0};
    self.occupiedHalf = null;
    //self.log(`${self.knownStructures[self.me.team][0].x}`);
    /*
    let castleId = robotMap[origCastleLoc[1]][origCastleLoc[0]];
    let castleSignal = self.getRobot(castleId).signal;
    self.log(`Signal from born castle-${castleId}: ${castleSignal}`)
    */
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
      //let castleRobot = self.getRobot(robotMap[self.knownStructures[self.me.team][0].y][self.knownStructures[self.me.team][0].y]);
      self.globalTurn = initialized.turn;
      if (initialized.signal === 29002) {
        self.status = 'frontLineScout';
        self.castleTalk(6);
      }
      
      self.globalTurn += 1;
    }
    else {
      //pilgrim isnt built by castle, defaults to mining the closest thing it sees
      self.status = 'searchForAnyDeposit';
      self.churchBuilt = true;
      self.searchAny = true;
    }
    /*
    if (self.globalTurn >= 50) {
      self.status = 'searchForAnyDeposit';
    }
    */
    
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
    //we don't process the signal if the signal isn't from a unit that is visible and is on our team
    if (robotsInVision[i].team === self.me.team) {
      let msg = robotsInVision[i].signal;
      let heardId = robotsInVision[i].id;
      signal.processMessagePilgrim(self, msg);
      if (msg >= 24586 && msg <= 28681 && self.status !== 'frontLineScout'){
        self.status = 'goingToDeposit';
        let padding = 24586;
        
        let targetLoc = self.getLocation(msg - padding);
        //self.defendTarget = [targetLoc.x, targetLoc.y];
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
      //this is used for newly built bots, no prior indice
      //29682 value is subject to change. should be changed in pilgrim and castle.js. 28842 is based on fact max 160 resource tiles per map
      else if (msg < 28842 && msg >= 28682 && self.status === 'waitingForCommand' && self.miningIndex === -1 && self.status !== 'frontLineScout') {
        let padding = 28682;
        let indice = msg - padding;
        self.status = 'goingToDeposit';
        self.miningIndex = indice;
        self.log(`New Pilgrim was told to go mine ${self.allSpots[self.miningIndex].x}, ${self.allSpots[self.miningIndex].y} = ${self.miningIndex}`);
        self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
      }
      //use this value for prev. built bots that just returned
      else if (msg < 29002 && msg >= 28842 && self.status === 'waitingForCommand' && self.status !== 'frontLineScout') {
        let padding = 28842;
        let indice = msg - padding;
        self.status = 'goingToDeposit';
        let currentSpot = self.allSpots[self.miningIndex];
        let currentResource = currentSpot.type;
        let newResource = self.allSpots[indice].type;
        
        //if resource type are the same and the unit original mining location is right next to the structure it delivered to, dont change index.
        if (currentResource === newResource && qmath.dist(currentSpot.x, currentSpot.y, self.me.x, self.me.y) === 0) {
          self.log(`Pilgrim was assigned a different mineloc of the same resource, but shouldn't move actually`)
        }
        else {
          self.miningIndex = indice;
        }
        
        //we only change index if its a different resource type from what we are on right now
        self.log(`Old Pilgrim was told to go mine ${self.allSpots[self.miningIndex].x}, ${self.allSpots[self.miningIndex].y} = ${self.miningIndex}`);
        self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
      }
      // Transfer location of enemy location        
      else if (msg >= 33099 && msg <= 41290) {
        
        let padding = 33099;
        if (msg >= 37195) {
          padding = 37195;
          //we use this padding for church chain strategy
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
        self.log(`Enemy Direction from pilgrim at ${self.me.x}, ${self.me.y} is ${self.enemyDirection}`);
        //if chaining churches, immedietely build a new church in direction of enemy
        if (padding === 37195){
          if (self.status !== 'frontLineScout') {
            self.status = 'chainedPilgrim';
          }

          if (self.karbonite > 400 && self.fuel > 6100){
            if (self.knownStructures[otherTeamNum].length) {
              let nx = self.knownStructures[otherTeamNum][0].x;
              let ny = self.knownStructures[otherTeamNum][0].y;
              let msg2 = self.compressLocation(nx, ny); // Eventually = compressed location
              let padding2 = 37195;
              // Send this message to all units in surrounding area, though it is specifically aimed at churches
              
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
        //notify other units in the chain that we are done with chaining, go back to normal tasks
        if (self.status === 'chainedPilgrim'){
          self.signal(41291, 4);
          //self.status = 'moveaway';
          self.status = 'searchForAnyDeposit';
          
        }
        if (self.status === 'frontLineScout') {
          
        }
      }
      else if(msg >= 41292 && msg <= 45387) {
        //reserved
      }
    }
    //if waiting for command, no signal is given, go to old spot, don't wait for castle to reassign
  }
  // DO THIS FOR TESTING
  /*if (self.me.turn >= 0) {
    self.status = 'frontLineScout';
  }*/

  if (self.status === 'waitingForCommand') {
    self.status = 'goingToDeposit';
    if (self.me.turn !== 1) {
      self.log(`Pilgrim didn't receive command, going to ${self.allSpots[self.miningIndex].x}, ${self.allSpots[self.miningIndex].y} = ${self.miningIndex}`);
      self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
    }
    self.status = 'searchForAnyDeposit';
  }
  // DECISION MAKING
  // FRONTLINE SCOUTING
  else if (self.status === 'frontLineScout') {
    //self.log("Hey guys, I'm a front line scout!");
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

    //here, we tell castles our location
  if (self.status === 'frontLineScout' && self.me.turn > 1) {
    if (self.onFrontLine === true) {
      //if on frontline, ocassionally remind caslte that
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
  
  //If we are a scout, and we see a good number of peachers and crusaders nearby, send a signal to tell them to go forward and attack.
  let unitsInVincinity = search.unitsInRadius(self, 64);
  if (self.status === 'frontLineScout' ) {
    if (unitsInVincinity[SPECS.PREACHER].length + unitsInVincinity[SPECS.CRUSADER].length > 10 && self.me.turn - self.lastWarCry > 10) {
      //self.signal(1, 64);
      self.lastWarCry = self.me.turn;
    }
  }
  
  // CODE FOR AVOIDING ENEMIES
  //regardless, pilgrim tries to stay out of shooting range
  let farthestdist;
  let enemyPositionsToAvoid = [];
  self.onFrontLine = false;
  for (let i = 0; i < robotsInVision.length; i++) {
    let obot = robotsInVision[i];
    //find position that is the farthest away from all enemies
    if (obot.team === otherTeamNum) {
      let distToEnemy = qmath.dist(self.me.x, self.me.y, obot.x, obot.y);
      
      //if enemy is preacher, stay within 16 to 100
      //if anything else but a pilgrim, stay within 64 to 100
      if (((distToEnemy > 64 && obot.unit !== SPECS.PREACHER) || (distToEnemy >= 36 && obot.unit === SPECS.PREACHER)) && distToEnemy <= 100 && obot.unit !== SPECS.PILGRIM) {
        // WE SAFE
        //enemies just out of range of attack but inside vision don't need to be avoided, we can proceed as normal.
        
        //self.log(`I'm gonna stop for now at position: ${self.me.x}, ${self.me.y}`);
        self.onFrontLine = true;
        if (self.status === 'frontLineScout' ){
          self.finalTarget = [self.me.x, self.me.y];
          if (self.onFrontLine === true) {
            //tell castle in position along frontline
            self.log(`I'm on front line`)
            if (self.knownStructures[otherTeamNum].length) {
              let nx = self.knownStructures[otherTeamNum][0].x;
              let ny = self.knownStructures[otherTeamNum][0].y;
              let msg2 = self.compressLocation(nx, ny); // Eventually = compressed location
              let padding2 = 37195;
              // Send this message to all units in surrounding area, though it is specifically aimed at churches
              
              
              //min resources needed before spamming like that
              if (self.karbonite >= 800 && self.fuel >= 10000 && self.lastChainTurn < self.me.turn - 2 && unitsInVincinity[SPECS.PROPHET].length > 6) {
                
                //build closest to target, could be castle or seen enemy...
                
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
                  //if there is a church in that position
                  let robotThere = robotMap[checkPos[1]][checkPos[0]];
                  if (robotThere !== null && robotThere.unit === SPECS.CHURCH && robotThere.team === self.me.team) {
                    self.signal(padding2 + msg2, 4);
                    break;
                  }
                  else if (canBuild(self, checkPos[0], checkPos[1], robotMap, gameMap)){
                    let rels = base.rel(self.me.x, self.me.y, checkPos[0], checkPos[1]);
                    self.signal(padding2 + msg2, 4);
                    self.log(`Starting church chain`);
                    //dont build if there's an existing church adjacent!
                    self.lastChainTurn = self.me.turn; //this is to force our pilgrim from chaining too much
                    return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)};
                    
                  }
                }
                
              }
            }
          }
          
        }
        else {
          //return a forced action if the bot is mining. if the bot is trying to go to a spot, allow it to keep testing the bounds and go to its desired spot (ok)
          forcedAction = '';
          /*
          if (self.status === 'mineKarb' || self.status === 'mineFuel'){
            forcedAction = '';
          }
          */
        }
      } 
      else { // TIME TO AVOID THESE SKETCHY POSITIONS. enemies that are possibly in range of attack may need to be avoided
        self.log(`Pilgrim ${self.me.id} is not in a safe position!`);
        if (self.status === 'frontLineScout' && distToEnemy <= 100) { // Not sure if we need this
          //we use this to tell the pilgrim to move onto the scouting target if it is open
          //self.finalTarget = [self.frontLineScoutingTarget.x, self.frontLineScoutingTarget.y];
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

  // MOVEMENT DECISION
  let avoidLocs = [];
  if (enemyPositionsToAvoid.length > 0){
    //self.log(`Pilgrim sees enemies nearby`)
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
    //self.log(`Pilgrim running away from enemy`)
    avoidLocs.sort(function(a,b) {
      return b.dist - a.dist;
    });
    let rels = base.rel(self.me.x, self.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
    //search for previous deposit?
    if (self.status !== 'frontLineScout') {
      self.status = 'searchForAnyDeposit';
    }
    
    // Final check
    let stop = false;
    for (let i = 0; i < enemyPositionsToAvoid.length; i++) {
      let dist = qmath.dist(avoidLocs[0].pos[0], avoidLocs[0].pos[1], enemyPositionsToAvoid[i][0], enemyPositionsToAvoid[i][1]);
      if (enemyPositionsToAvoid[i][2] !== SPECS.PILGRIM) {
        if (enemyPositionsToAvoid[i][2] === SPECS.PREACHER) {
          if (dist <= 36) {
            stop = true;
          }
        }
        else { // Castle, Prophet, Crusader
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
  

  
  
  //CODE FOR TELLING PILGRIMS TO GO TO NEXT DEPOSIT IF THEY SEE A UNIT OVER THE DEPOSIT THEY WANT TO GO TO
  if (self.status === 'goingToKarbDeposit' || self.status === 'goingToFuelDeposit' || self.status === 'goingToAnyDeposit') {
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0){
      if (self.status === 'goingToKarbDeposit'){
        //self.status = 'searchForKarbDeposit';
        self.miningIndex = getIndexAllSpots(self, self.finalTarget);
        self.castleTalk(self.miningIndex + 77);
        if (self.searchQueue.length === 0) {
          self.status = 'searchForAnyDeposit';
        }
        else {
          //self.log(`Spot Taken: ${self.finalTarget}`)
          let nextLoc = self.searchQueue.pop().position;
          //self.log(`switching to ${nextLoc}`);
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
          //self.log(`Spot Taken: ${self.finalTarget}, switching to ${nextLoc}`);
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
  
  //IF ROBOT IS GOING TO DEPOSIT AS COMMANDED AND SEES ANOTHER UNIT THERE WHEN IT IS CLOSE TO ITS TARGET, GO SEARCH FOR NEW PLACE
  if (self.status === 'goingToDeposit') {
    if (robotMap[self.finalTarget[1]][self.finalTarget[0]] !== self.me.id && robotMap[self.finalTarget[1]][self.finalTarget[0]] > 0 && qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]) <= 2){
      self.status = 'searchForAnyDeposit';
    }
  }
  
  //search for deposit, set new finalTarget and store it to self.searchQueue
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
      //self.log(`Going to ${self.finalTarget}`);
    }
  }
  
  //if we are tyring to build, return iff structure is near
  if (((self.me.fuel >= 100 || self.me.karbonite >= 20) || self.status === 'return')) {
    //send karbo
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

      //we continue to tell castles taht this unit was mining karbonite to prevent castles from accidentally assigning pilgrims to mine a spot already taken up
      if (self.statusBeforeReturn === 'mineKarb') {
        //self.castleTalk(73);
      }
      else if (self.statusBeforeReturn === 'mineFuel') {
        //self.castleTalk(74);
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
          //units returning to church will just stay next to it, and follow the 
          //if we return something to a church, we continue to mine at our deposit
          self.status = 'goingToDeposit';
          //self.castleTalk(0);
          self.finalTarget = [self.allSpots[self.miningIndex].x, self.allSpots[self.miningIndex].y];
        }
        
        action = self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel);
        return {action:action}; 
      }
    }
  }
  
  
  if (self.status === 'goingToDeposit') {
    //check if karb deposit has no churches around
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
        //means that karbonite has no buildings near it
      }
    }
    if (proceed == true) {
      if (self.me.turn > 1){
        //make sure we don't confuddle the signal for counting units
        //self.log(`Pilgrim might build`)
        //self.castleTalk(71);
      }
    }
    
  }
  
  //building status means the robot is trying to reach a build location, and build on there
  if (self.status === 'mineKarb' || self.status === 'mineFuel') {
    //check surrouding for structure
    let checkPositions = search.circle(self, self.me.x, self.me.y, 2);
    let nearestStruct = search.findNearestStructure(self);
    let distToNearestStruct = qmath.dist(self.me.x, self.me.y, nearestStruct.x, nearestStruct.y);
    
    
    //we won't build near a structure in the early game
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
      //self.castleTalk(71);
      self.castleTalk(self.miningIndex + 77);
    }
    let robotThere = self.getRobot(robotMap[self.buildTarget[1]][self.buildTarget[0]]);
    if (robotThere !== null && (robotThere.unit === SPECS.CHURCH)){
      self.status = 'goingToDeposit';
      //self.log(`Church built already`);
    }
    else {
      if (self.me.x === self.finalTarget[0] && self.me.y === self.finalTarget[1]) {
        let rels = base.rel(self.me.x, self.me.y, self.buildTarget[0], self.buildTarget[1]);
        self.log(`TRIED TO BUILD: ${rels.dx}, ${rels.dy}`);
        
        if (self.fuel + self.me.fuel >= 300 && self.karbonite + self.me.karbonite >= 75){
          self.status = 'goingToDeposit';

          if (self.knownStructures[otherTeamNum].length) {
            let nx = self.knownStructures[otherTeamNum][0].x;
            let ny = self.knownStructures[otherTeamNum][0].y;
            let msg = self.compressLocation(nx, ny); // Eventually = compressed location
            let padding = 33099;
            // Send this message to all units in surrounding area, though it is specifically aimed at churches
            self.signal(padding + msg, 2);
          }

          return {action:self.buildUnit(SPECS.CHURCH, rels.dx, rels.dy)}
        }
        else {
          self.log(`NOT ENOUGH RESOURCES: fuel:${self.fuel}; karb: ${self.karbonite}`);
        }
      }
      else {
        //we aren't there yet, keep moving
        action = self.navigate(self.finalTarget);
        return {action:action};
      }
      //dont stand on the build target, leave it if the final target has a pilgrim on it already
      let pilgrimOnFinalTarget = self.getRobot(robotMap[self.finalTarget[1]][self.finalTarget[0]]);
      if (pilgrimOnFinalTarget !== null && pilgrimOnFinalTarget.team === self.me.team && pilgrimOnFinalTarget.unit === SPECS.PILGRIM && self.me.id !== pilgrimOnFinalTarget.id){
        self.log(`already a unit building there`);
          self.status = 'goingToDeposit';
      }
    }
  }
  if (self.status === 'goingToDeposit'){
    //start mining if reached target
    //assumptions, final target is definately a deposit location;
    if (qmath.dist(self.me.x, self.me.y, self.finalTarget[0], self.finalTarget[1]) === 0) {
      self.status = 'mineHere';
    }
  }
  
  //forever mine
  if (karboniteMap[self.me.y][self.me.x] === true && (self.status === 'mineHere' || self.status === 'goingToKarbDeposit' || self.status === 'mineKarb' || self.status === 'building' || self.status === 'goingToAnyDeposit')) {
    action = self.mine();
    self.miningIndex = getIndexAllSpots(self, [self.me.x, self.me.y]);
    if (self.status !== 'building') {
      
      self.status = 'mineKarb';
      //tel castles i'm mining karb, not building
      if (self.me.turn > 1){
        //self.castleTalk(73)
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
        //self.castleTalk(74)
        self.castleTalk(self.miningIndex + 77);
      }
    }
    return {action:action}; 
  }
  
  // HALF-DETERMINING STUFF!
  /*
  let ownCastlePos = {x: 0, y: 0}; // EDIT THIS! A church-built pilgrim needs some way of knowing the castlePos
  // Own castles should be transferred whenever a castle builds a pilgrim. The pilgrim should get the position of our castles with the lookup table
  // Watch out for odd maps! -> Ask Stone!
  if (!self.churchBuilt && ownCastlePos !== null) {
    if (self.mapIsHorizontal) {
     if (self.me.x < mapLength/2) { // < and >= should work for even maps
       // Left half
       if (ownCastlePos.x < mapLength/2) {
         // You're on left half, your home castle is on left half
        self.occupiedHalf = "own";
       } else {
         // You're on left half, your home castle is on right half
         self.occupiedHalf = "enemy";
       }
     } else {
      // Right half
      if (ownCastlePos.x > mapLength/2) {
        // You're on right half, your home castle is on right half
        self.occupiedHalf = "own";
      } else {
        // You're on right half, your home castle is on left half
        self.occupiedHalf = "enemy";
      }
     }
    }
  }*/



  //When mining, check if building a church nearby is a good idea or not
  
  
  
  //PROCESSING FINAL TARGET
  if (forcedAction !== null) {
    return {action:forcedAction};
  }
  action = self.navigate(self.finalTarget);
  
  //if we are next to a resource deposit and are getting blocked, send signal to units that aren't pilgrims on a resource block to move away
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