/*
* Updates self appropriately, whether it be variables or status
* @param {robot} self - The robot object
* @param {number} msg - the message value
*/
function processMessageCastle(self, msg) {
  switch(msg) {
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
    case 6:
      self.status = 'pause';
    default:
      break;
  }
}

function processMessageCrusader(self, msg){
  switch (msg){
    case 0:
      self.status = 'rally';
      break;
    case 1:
      self.status = 'searchAndAttack';
      break;
    
  }
}


export default {processMessageCastle, processMessageCrusader}