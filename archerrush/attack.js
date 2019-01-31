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

        //i = y value, j =  value;
        //let oRobot = self.getRobot(oRobotId);
        //location in vision and attackble because preacher vision = attack radius
        //check units that will get hit, maximize damage
        let checkPositions = search.circle(self, j, i, 2);
        let unitsAttacked = 0;
        let thereIsEnemy = false;
        for (let k = 0; k < checkPositions.length; k++) {
          let checkPos = checkPositions[k];
          let oRobotId = robotMap[checkPos[1]][checkPos[0]];
          if (oRobotId > 0) {
            let oRobot = self.getRobot(oRobotId);
            //if other team, add to number of affected enemies
            //Strategy is to hit as many enemies as possible and as little friendlies as possible
            if (oRobot.team !== self.me.team) {
              unitsAttacked += 1; //enemy team hit
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

    //check if they defined or not, because of some bugs with bc19 i think
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