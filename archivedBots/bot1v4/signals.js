/*
* Updates self appropriately, whether it be variables or status
* @param {robot} self - The robot object
* @param {number} msg - the message value
*/
function processMessageCastle(self, msg, id) {
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
      break;
    default:
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
  }
}

export default {processMessageCastle, processMessageCrusader, processMessagePreacher, processMessageProphet, processMessageChurch, processMessagePilgrim}