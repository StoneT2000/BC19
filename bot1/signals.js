/*
* Updates self appropriately, whether it be variables or status
* @param {robot} self - The robot object
* @param {number} msg - the message value
*/
function processMessageCastleTalk(self, msg, id) {
  switch(msg) {
    case 1:
      self.allUnits[id] = {};
      self.allUnits[id].unit = msg;
      self.allUnits[id].type = 'default';
      break;
    case 2:
      self.allUnits[id] = {};
      self.allUnits[id].unit = msg;
      self.allUnits[id].mineLoc = -1;
      self.allUnits[id].type = 'miner';
      break;
    case 3:
      self.allUnits[id] = {};
      self.allUnits[id].unit = msg;
      self.allUnits[id].type = 'default';
      break;
    case 4:
      self.allUnits[id] = {};
      self.allUnits[id].unit = msg;
      self.allUnits[id].type = 'default';
      break;
    case 5:
      self.allUnits[id] = {};
      self.allUnits[id].unit = msg;
      self.allUnits[id].type = 'default';
      break;
    case 6:
      self.allUnits[id] = {};
      self.allUnits[id].unit = 0;
      self.allUnits[id].type = 'default';
      break;
    case 7:
      //this means castle opposing the very first castle in turnqueue is gone
      //let pmsg = msg - 7;
      //self.knownStructures[self.me.team].shift();
    case 8:
      //this means castle opposing the 2nd caslte in queue is gone
      //self.knownStructures[self.me.team].shift();
      break;
    case 9:
      //this means castle oppoisng the 3rd caslte in queue is gone
      //self.knownStructures[self.me.team].shift();
      break;
    case 75:
      self.allUnits[id] = {};
      self.allUnits[id].unit = 1;
      self.allUnits[id].type = 'default';
    case 237:
      self.allUnits[id] = {};
      self.allUnits[id].unit = 2;
      self.allUnits[id].type = 'scout';
      self.rallyTargets[id] = {};
      self.rallyTargets[id].position = [null, null];
    default:
      break;
  }
}
function processMessageCastle (self, msg, id) {
  switch (msg) {
    case 4:
      //process in castle.js. Received when a pilgrim is about to give karbonite or fuel
      break;
  }
}

/* All of the bottom message processing functions will receive the same message if within range
* 
*/
function processMessageCrusader(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      //self.status = 'searchAndAttack';
      break;
    case 16390:
      //self.status = 'rally';
      //self.finalTarget = self.rallyTarget;
      break;
    case 16391:
      if (self.oldStatus !== 'searchAndAttack' && self.status !== 'searchAndAttack'){
        self.status = 'defendOldPos';
      }
      else {
        self.status = 'searchAndAttack';
      }
      self.defendTarget = self.origStructureLoc;
      break;
  }
}
function processMessagePreacher(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
    case 5:
      //preachers waiting for stack of fuel to engage in next venture stay as that status
      if (self.status !== 'waitingForFuelStack'){
        self.status = 'defend';
      }
      break;
    //if message is from 6 to 4101, this is a map location, with 6 units of padding. Used to tell attacking units to target a location
      //if message is from 4102, to 8197, this is a map location that a castle tells the unit, it is the map location of an enemy castle.
      //if message is from 8198 12293
      //if message is from 12294 to 16389, attack target
    case 16390:
      //self.status = 'rally';
      //self.finalTarget = self.rallyTarget;
      break;
    case 16391:
      if (self.oldStatus !== 'searchAndAttack' && self.status !== 'searchAndAttack'){
        self.status = 'defendOldPos';
      }
      else {
        self.status = 'searchAndAttack';
      }
      self.defendTarget = self.origStructureLoc;
      break;
  }
}
function processMessageProphet(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      //self.status = 'searchAndAttack';
      break;
    case 5:
      //preachers waiting for stack of fuel to engage in next venture stay as that status
      if (self.status !== 'waitingForFuelStack'){
        self.status = 'defend';
      }
      break;
    case 16390:
      self.status = 'defend';
      //self.finalTarget = self.defendTarget;
      break;
    case 16391:
      self.status = 'defendOldPos';
      //self.finalTarget = self.defendTarget;
      self.defendTarget = self.origStructureLoc;
      break;
    case 24585:
      self.moveSpeed = 'fast';
  }
}
function processMessageChurch(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      break;
  }
}
function processMessagePilgrim(self, msg){
  switch (msg){
    case 2:
      if (self.status !== 'mineKarb' && self.status !== 'mineFuel'){
        self.status = 'searchForKarbDeposit'
      }
      break;
    case 3:
      if (self.status !== 'mineKarb' && self.status !== 'mineFuel'){
        self.status = 'searchForFuelDeposit'
      }
      break;
    case 24584:
      if (self.status !== 'mineKarb' && self.status !== 'mineFuel'){
        self.status = 'searchForAnyDeposit';
        self.searchAny = true;
      }
  }
}

export default {processMessageCastleTalk, processMessageCastle, processMessageCrusader, processMessagePreacher, processMessageProphet, processMessageChurch, processMessagePilgrim}