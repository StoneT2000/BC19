import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';
function mind(self) {
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)]
  //
  self.log(`Pilgrim (${self.me.x}, ${self.me.y}); Status: ${self.status}`);
  let target = self.target;
  let fuelMap = self.getFuelMap();
  let karboniteMap = self.getKarboniteMap();
  
  let robotMap = self.getVisibleRobotMap();
  //we can improve the speed here by using bfs
  
  
  //Initialization code for robot to at least store the structure robot is born in

  if (self.status === 'justBuilt') {
    //for pilgrims, search first
    self.status = 'searchForDeposit';
    let origCastleLoc = search.findNearestStructure(self)
    self.knownStructures[self.me.team].push(origCastleLoc);
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
    
    
    
  }
  //if robot is going to deposit but it is taken up, search for new deposit loc.
  if (self.status === 'goingToDeposit') {
    if (robotMap[target[1]][target[0]] !== self.me.id){
      self.status = 'searchForDeposit';
    }
  } 
  if (self.status === 'searchForDeposit') {
    //perform search for closest deposit
    let it = new Date();
    //let newTarget = search.bfs(self, self.me.x, self.me.y, search.fuelDeposit, search.canPass)
    //^^ bfs is slower????
    
    let newTarget;
    let cd = 9999990;
    
    for (let i = 0; i < self.fuelSpots.length; i++) {
      let nx = self.fuelSpots[i].x;
      let ny = self.fuelSpots[i].y;
      if (robotMap[ny][nx] <= 0){
        //self.log(`Robot at ${j},${i}:${robotMap[i][j]}`)
        let distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
        if (distToThere < cd) {
          cd = distToThere;
          newTarget = [nx,ny];
        }
      }
    }
    for (let i = 0; i < self.karboniteSpots.length; i++) {
      let nx = self.karboniteSpots[i].x;
      let ny = self.karboniteSpots[i].y;
      if (robotMap[ny][nx] <= 0){
        //self.log(`Robot at ${j},${i}:${robotMap[i][j]}`)
        let distToThere = qmath.dist(self.me.x,self.me.y,nx,ny);
        if (distToThere < cd) {
          cd = distToThere;
          newTarget = [nx,ny];
        }
      }
    }
    
    let ft = new Date();
    self.log(`took:${ft-it}ms`);
    
    let rels = base.relToPos(self.me.x, self.me.y, newTarget[0], newTarget[1], self);
    return {action:self.move(rels.dx,rels.dy), status:'goingToDeposit', target: newTarget};
    
  }
  

  
  
  //When pilgrim is returning to structure to deliver karbo or fuel...
  if (self.status === 'return') {
    
    
    
    if (self.me.x === target[0] && self.me.y === target[1]) {
      //shouldn't happen
      return {action:''};
    }
    else {
      let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
      let currRels = base.rel(self.me.x, self.me.y, target[0], target[1]);
      if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
        //if abs value of dx and dy are 1 or less, ship is next to church or castle, deliver all fuel
        self.log(`${currRels.dx}, ${currRels.dy}`);
        return {action:self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel), status:'searchForDeposit', target: [self.me.x,self.me.y]}
      }
      return {action:self.move(rels.dx,rels.dy), status:'return', target: target};  
    }
  }
  
  //let visibleRobots = self.getVisibleRobots();
  
  if ((self.me.fuel >= 100 || self.me.karbonite >= 20) && self.status !== 'return') {
    //send karbo
    let bestTarget = search.findNearestStructure(self);
    //if there are no visible robots, go to nearest known structure
    
    let rels = base.relToPos(self.me.x, self.me.y, bestTarget[0], bestTarget[1], self);
    let currRels = base.rel(self.me.x, self.me.y, bestTarget[0], bestTarget[1]);
    if (Math.abs(currRels.dx) <= 1 && Math.abs(currRels.dy) <= 1){
      //if abs value of dx and dy are 1 or less, ship is next to church or castle, deliver all fuel
      self.log(`${currRels.dx}, ${currRels.dy}`);
      return {action:self.give(currRels.dx, currRels.dy, self.me.karbonite, self.me.fuel), status:'searchForDeposit', target: [self.me.x,self.me.y]}
    }
    return {action:self.move(rels.dx,rels.dy), status:'return', target: bestTarget};
  }
  
  //forever mine
  if (fuelMap[self.me.y][self.me.x] === true) {
    return {action:self.mine(), status:'mine', target: [self.me.x,self.me.y]};
  }
  else if (karboniteMap[self.me.y][self.me.x] === true) {
    return {action:self.mine(), status:'mine', target: [self.me.x,self.me.y]};
  }
  
  let rels = base.relToPos(self.me.x, self.me.y, target[0], target[1], self);
  return {action:self.move(rels.dx,rels.dy), status:self.status, target: target};  
  
  
  return {action: self.move(...choice), status: 'searchForDeposit', target: []};
  //return self.move(0,0);
}

export default {mind}