import qmath from 'math.js'
import search from 'search.js';
import base from 'base.js';
function attackNearestAOE(self){
  let leastDistToTarget = 99999999;
  let attackLoc = {};
  let mostUnitsAttacked = -100;
  let existEnemy = false;
  let enemyToAttack = null;
  let robotMap = self.getVisibleRobotMap();
  let gameMap = self.map;
  let robotToAttack = null;
  for (let i = 0; i < robotMap.length; i++) {
    for (let j = 0; j < robotMap[i].length; j++) {
      if (robotMap[i][j] >= 0 && gameMap[i][j] === true) {
        let checkPositions = search.circle(self, j, i, 2);
        let unitsAttacked = 0;
        let thereIsEnemy = false;
        for (let k = 0; k < checkPositions.length; k++) {
          let checkPos = checkPositions[k];
          let oRobotId = robotMap[checkPos[1]][checkPos[0]];
          if (oRobotId > 0) {
            let oRobot = self.getRobot(oRobotId);
            if (oRobot.team !== self.me.team) {
              unitsAttacked += 1;
              thereIsEnemy = true;
            }
            else {
              unitsAttacked -= 1;
            }

          }
        }
        if (mostUnitsAttacked < unitsAttacked && thereIsEnemy === true) {
          attackLoc = {x:j,y:i};
          mostUnitsAttacked = unitsAttacked;
          existEnemy = true;
        }
      }
    }
  }
  
  if (existEnemy === true) {
    return attackLoc;
  }
  return null;
}
function attackNearest(self) {
  let leastDistToTarget = 99999999;
  let attackLoc = {};
  let robotToAttack = null;
  let existEnemy = false;
  
  for (let i = 0; i < robotsInVision.length; i++) {
    let oVisRobot = robotsInVision[i];

    if (oVisRobot.x !== undefined && oVisRobot.y !== undefined){
      let distToTarget = qmath.dist(self.me.x, self.me.y, oVisRobot.x, oVisRobot.y);
      if (distToTarget < leastDistToTarget) {
        leastDistToTarget = distToTarget;
        attackLoc = {x:oVisRobot.x, y:oVisRobot.y};
        existEnemy = true;
        robotToAttack = oVisRobot;
      }
    }
  }
  if (existEnemy === true) {
    return robotToAttack;
  }
  return null;
}
export default {attackNearest, attackNearestAOE}