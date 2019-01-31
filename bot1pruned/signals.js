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
        self.allUnits[id].unit = 2;
        self.allUnits[id].type = 'scout';
        self.rallyTargets[id] = {};
        self.rallyTargets[id].position = [null, null];
        break;
      default:
        break;
    }
}
function processMessageCastle (self, msg, id) {
  switch (msg) {
    case 4:
      break;
  }
}

function processMessageCrusader(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
    case 16390:
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
      if (self.status !== 'waitingForFuelStack'){
        self.status = 'defend';
      }
      break;
    case 16390:
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
      if (self.status !== 'defend') {
        self.status = 'searchAndAttack';
      }
      break;
    case 5:
      if (self.status !== 'waitingForFuelStack'){
        self.status = 'defend';
      }
      break;
    case 16390:
      self.status = 'defend';
      break;
    case 16391:
      self.status = 'defendOldPos';
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
      if (self.status !== 'mineKarb' && self.status !== 'mineFuel' && self.status !== 'frontLineScout'){
        self.status = 'searchForKarbDeposit'
      }
      break;
    case 3:
      if (self.status !== 'mineKarb' && self.status !== 'mineFuel' && self.status !== 'frontLineScout'){
        self.status = 'searchForFuelDeposit'
      }
      break;
    case 24584:
      if (self.status !== 'mineKarb' && self.status !== 'mineFuel' && self.status !== 'frontLineScout'){
        self.status = 'searchForAnyDeposit';
        self.searchAny = true;
      }
  }
}

export default {processMessageCastleTalk, processMessageCastle, processMessageCrusader, processMessagePreacher, processMessageProphet, processMessageChurch, processMessagePilgrim}