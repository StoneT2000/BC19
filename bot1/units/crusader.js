import {BCAbstractRobot, SPECS} from 'battlecode';
import search from '../search.js';
import base from '../base.js';
import qmath from '../math.js';


function mind(self){
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)]
  return {action: self.move(...choice), status: 'searchAndAttack', target: []};
  
}
export default {mind}