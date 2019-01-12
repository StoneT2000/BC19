/*
* Updates self appropriately, whether it be variables or status
* @param {robot} self - The robot object
* @param {number} msg - the message value
*/
function processMessageCastleTalk(self, msg, id) {
  switch(msg) {
    case 1:
      self.allUnits[id] = msg;
      break;
    case 2:
      self.allUnits[id] = msg;
      break;
    case 3:
      self.allUnits[id] = msg;
      break;
    case 4:
      self.allUnits[id] = msg;
      break;
    case 5:
      self.allUnits[id] = msg;
      break;
    case 6:
      self.status = 'pause';
      break;
    case 7:
      //self.status = 'build';
    case 8:
      
      break;
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
      self.status = 'searchAndAttack';
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
    //if message is from 6 to 5001, this is a map location, with 6 units of padding
  }
}
function processMessageProphet(self, msg){
  switch (msg){
    case 0:
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
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
      self.status = 'searchForKarbDeposit'
      break;
    case 3:
      self.status = 'searchForFuelDeposit'
      break;
  }
}

export default {processMessageCastleTalk, processMessageCastle, processMessageCrusader, processMessagePreacher, processMessageProphet, processMessageChurch, processMessagePilgrim}