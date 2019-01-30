import {BCAbstractRobot, SPECS} from 'battlecode';
import castle from './bot1pruned/units/castle.js';
import church from './bot1pruned/units/church.js';
import pilgrim from './bot1pruned/units/pilgrim.js';
import crusader from './bot1pruned/units/crusader.js';
import prophet from './bot1pruned/units/prophet.js';
import preacher from './bot1pruned/units/preacher.js';
import qmath from './bot1pruned/math.js';
import search from './bot1pruned/search.js'
import base from './bot1pruned/base.js';


let unitTypesStr = ['Castle', 'Church', 'Pilgrim', 'Crusader', 'Prophet', 'Preacher'];
class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    this.globalTurn = 0;
    this.status = 'justBuilt';
    
    this.target = [0,0];
    this.finalTarget = [0,0];
    this.path = [];

    this.knownStructures = {0:[],1:[]};
    this.knownDeposits = {};
    
    this.castles = 0;
    this.churches = 0;
    this.pilgrims = 0;
    this.crusaders = 0;
    this.prophets = 0;
    this.preachers = 0;
    
    this.buildQueue = [];
    
    this.maxPilgrims = 0;
    this.maxCrusaders = 1000;
    
    
    
    this.allSpots = [];
    this.fuelSpots = [];
    this.karboniteSpots = [];
    this.sentCommand = false;
    this.planner = null;
    
    this.allUnits = {};
  };
  
  turn() {

    let startTime = new Date();
    
    if (this.me.unit === SPECS.CASTLE) {
      let result = {action:''};
      result = castle.mind(this);
      return result.action;
    }
    else if (this.me.unit === SPECS.CRUSADER) {
      let result = crusader.mind(this);
      return result.action;
    } 
    else if (this.me.unit === SPECS.PILGRIM) {
      let result = pilgrim.mind(this);
      return result.action;
    }
    else if (this.me.unit === SPECS.CHURCH) {
      let result = church.mind(this);
      return result.action;
    }
    else if (this.me.unit === SPECS.PROPHET) {
      let result = prophet.mind(this);
      return result.action;
    }
    else if (this.me.unit === SPECS.PREACHER) {
      let result = preacher.mind(this);
      return result.action;
    }
    let endTime = new Date();
  }

  canMove(dx, dy) {
    let robotMap = this.getVisibleRobotMap();
    let passableMap = this.getPassableMap();
    let fuelCost = SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;
    let dist2 = qmath.distDelta(dx, dy);
    fuelCost *= dist2;

    if(this.fuel >= fuelCost && search.emptyPos(this.me.x + dx, this.me.y + dy, robotMap, passableMap)) {
      return true;
    }
    return false;
  }
  readyAttack() {
    let fuelCost = SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST;
    if (this.fuel >= fuelCost) {
      return true;
    }
  }

  setFinalTarget(newTarget) {
    this.finalTarget = newTarget;
    let path = [];
    if (this.planner !== null) {
      this.planner.search(this.me.y,this.me.x,newTarget[1],newTarget[0],path);
    }
    else {
      path = [this.me.y,this.me.x, newTarget[1], newTarget[0]];
    }
    path.shift();
    path.shift();
    this.path = path;
    this.target[1] = path.shift();
    this.target[0] = path.shift();
  }

  navigate(finalTarget, avoidFriends = false, fast = true) {
    if (finalTarget !== null){
      this.setFinalTarget(finalTarget);
      let action = '';
      if (this.path.length > 0) {
        let distLeftToSubTarget = qmath.dist(this.me.x, this.me.y, this.target[0], this.target[1]);
        if (distLeftToSubTarget <= 2){
          this.target[1] = this.path.shift();
          this.target[0] = this.path.shift();
        }
      }
      if (this.target) {
        let rels = base.relToPos(this.me.x, this.me.y, this.target[0], this.target[1], this, avoidFriends, fast);
        if (rels.dx === 0 && rels.dy === 0) {
          action = ''
          rels = base.relToPos(this.me.x, this.me.y, this.target[0], this.target[1], this, avoidFriends, true);
          if (rels.dx !== 0 || rels.dy !== 0) {
            action = this.move(rels.dx, rels.dy);    
          }
        }
        else {
          action = this.move(rels.dx, rels.dy);    
        }
      }
      return action;
    }
    return '';
  }

  getLocation(hash) {
    let xpos = hash % this.map[0].length;
    let ypos = (hash - xpos) / this.map[0].length;
    return {x:xpos, y:ypos};
    //hash is now a value from 0 to 4095, representing every possible map location
  }

  compressLocation(x,y) {
    return x + y * this.map[0].length;
  }

  initializeCastleLocations() {
    let possibleCastlePositions = search.circle(this, this.me.x, this.me.y, 2);
    let robotMap = this.getVisibleRobotMap();
    let nextToCastle = false;
    let castleRobot = null;
    for (let i = 0; i < possibleCastlePositions.length; i++) {
      let px = possibleCastlePositions[i][0];
      let py = possibleCastlePositions[i][1];

      castleRobot = this.getRobot(robotMap[py][px]);
      if (castleRobot !== null && castleRobot.unit === SPECS.CASTLE) {
        this.knownStructures[this.me.team].push({x:castleRobot.x, y:castleRobot.y, unit: 0});
        nextToCastle = true;
        break;
      }
    }
    if (nextToCastle === false ){
      this.knownStructures = {0:[], 1:[]};
      return false;
    }
    let cx = this.knownStructures[this.me.team][0].x;
    let cy = this.knownStructures[this.me.team][0].y;
    
    let exploreTarget = null;
    if (this.mapIsHorizontal) {
      exploreTarget = [cx, this.map.length - cy - 1];
    }
    else {
      exploreTarget = [this.map[0].length - cx - 1, cy];
    }
    if (exploreTarget !== null) {
      this.knownStructures[(this.me.team + 1) % 2].push({x:exploreTarget[0], y:exploreTarget[1], unit: 0});
      return castleRobot;
    }
    else {
      return false; //not at castle
    }
    
  }

  avoidEnemyLocations(enemyPositionsToAvoid) {
    let largestSumDist = null;
    let avoidLocs = [];
    let robotMap = this.getVisibleRobotMap();
    if (enemyPositionsToAvoid.length > 0){

      let positionsToGoTo = search.circle(this, this.me.x, this.me.y, 4);
      for (let i = 0; i < positionsToGoTo.length; i++) {
        let thisSumDist = 0;
        let pos = positionsToGoTo[i];
        if (search.emptyPos(pos[0], pos[1], robotMap, this.map)){
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
      })
      let rels = base.rel(this.me.x, this.me.y, avoidLocs[0].pos[0], avoidLocs[0].pos[1]);
      return rels;
    }
    else {
      return null;
    }
  }
  
  findDefendLoc(self, unitsInVision, x1, x2, y1, y2) {
    let robotMap = self.getVisibleRobotMap();
    let gameMap = self.map;
    let fuelMap = self.getFuelMap();
    let karboniteMap = self.getKarboniteMap();
    let mapLength = self.map.length;
    let nearestStructure = search.findNearestStructure(self);
    let distToStructureFromMe = qmath.dist(self.me.x, self.me.y, nearestStructure.x, nearestStructure.y);
    let closestDist = 99999;
    let bestLoc = null;
    
    
    let distToDefenceTarget = 0;
    if (self.status === 'defendOldPos' || self.status === 'defendSpot') {
      distToDefenceTarget = qmath.dist(self.me.x, self.me.y, self.defendTarget[0], self.defendTarget[1]);
      
    }
    if (self.status === 'rally') {
      distToDefenceTarget = qmath.dist(self.me.x, self.me.y, self.rallyTarget[0], self.rallyTarget[1]);
    }
    let spotHasToBeInVision = false;
    
    for (let i = y1; i < y2; i++) {
      for (let j = x1; j < x2; j++) {
        if (i % 2 !== j % 2 ){

          if ((search.emptyPos(j, i , robotMap, gameMap, spotHasToBeInVision) || self.me.id === robotMap[i][j]) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
            let nearestStructureHere = search.findNearestStructureHere(self, j, i, unitsInVision[6]);
            let distToStructure = qmath.dist(j, i, nearestStructureHere.x, nearestStructureHere.y);
            if (distToStructure > 2){
              let tgt = [self.me.x, self.me.y]
              if (self.status === 'defendOldPos' || self.status === 'defendSpot') {
                tgt = self.defendTarget;
              }
              else if (self.status === 'rally' && self.useRallyTargetToMakeLattice === true) {
                tgt = self.rallyTarget;
                if (distToDefenceTarget <= SPECS.UNITS[this.me.unit].VISION_RADIUS/4) {
                  self.useRallyTargetToMakeLattice = false;
                }
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
    
    if (bestLoc === null) {
      for (let i = mapLength; i < mapLength; i++) {
        for (let j = 0; j < mapLength; j++) {
          if (i % 2 !== j % 2 ){

            if ((search.emptyPos(j, i , robotMap, gameMap, false) || self.me.id === robotMap[i][j]) && fuelMap[i][j] === false && karboniteMap[i][j] === false){
              let nearestStructureHere = search.findNearestStructureHere(self, j, i, unitsInVision[6]);
              let distToStructure = qmath.dist(j, i, nearestStructureHere.x, nearestStructureHere.y);
              if (distToStructure > 2){
                let tgt = [self.me.x, self.me.y]
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
    }
    return bestLoc;
  }
  
  determineEnemyDirection(nx = this.me.x, ny = this.me.y) {
    let mapLength = this.map.length;
    if (this.mapIsHorizontal) {
      if (ny <= mapLength/2) {
        return 'down';
      }
      else  {
        return 'up';
      }
    }
    else {
      if (nx <= mapLength/2) {
        return 'right';
      }
      else  {
        return 'left';
      }
    }
    return null;
  }
  
  
  setBuildTowardsEnemyDirections(self) {
    if (self.enemyDirection === 'left') {
      self.buildingAttackUnitPositions = [[self.me.x - 1, self.me.y - 1], [self.me.x - 1, self.me.y], [self.me.x - 1, self.me.y + 1], [self.me.x, self.me.y -1], [self.me.x, self.me.y + 1], [self.me.x + 1, self.me.y - 1], [self.me.x + 1, self.me.y], [self.me.x + 1, self.me.y + 1]]
    }
    else if (self.enemyDirection === 'right') {
      self.buildingAttackUnitPositions = [[self.me.x + 1, self.me.y - 1], [self.me.x + 1, self.me.y], [self.me.x + 1, self.me.y + 1], [self.me.x, self.me.y -1], [self.me.x, self.me.y + 1], [self.me.x - 1, self.me.y - 1], [self.me.x - 1, self.me.y], [self.me.x - 1, self.me.y + 1]]
    }
    else if (self.enemyDirection === 'down') {
      self.buildingAttackUnitPositions = [[self.me.x - 1, self.me.y + 1],[self.me.x, self.me.y + 1],[self.me.x + 1, self.me.y + 1],
                                          [self.me.x - 1, self.me.y], [self.me.x +1, self.me.y],
                                          [self.me.x - 1, self.me.y - 1],[self.me.x, self.me.y - 1],[self.me.x + 1, self.me.y - 1]
                                         ]
    }
    else if (self.enemyDirection === 'up') {
      self.buildingAttackUnitPositions = [[self.me.x - 1, self.me.y - 1],[self.me.x, self.me.y - 1],[self.me.x + 1, self.me.y - 1],
                                          [self.me.x - 1, self.me.y], [self.me.x +1, self.me.y],
                                          [self.me.x - 1, self.me.y + 1],[self.me.x, self.me.y + 1],[self.me.x + 1, self.me.y + 1],
                                         ]
    }
  }
  
  
  
}

var robot = new MyRobot();
robot.log(`New Bot: ${robot.id}`)