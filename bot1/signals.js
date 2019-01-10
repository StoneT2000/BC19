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
      self.allUnits[id] = msg;
      break;
    default:
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
    
  }
}


export default {processMessageCastle, processMessageCrusader}