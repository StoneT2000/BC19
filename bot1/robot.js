import {BCAbstractRobot, SPECS} from 'battlecode';
import test from '/Users/stone.tao/Desktop/Coding/Competitions/BC19/bot1/units/castle.js';

class MyRobot extends BCAbstractRobot {
  turn() {
    this.log(`Turn ${this.me.turn}:I am: ${this.id}, Test:${test.test()}`)
    
    
    let direction = 0;
    //this.log(`Type:${this.me.unit}`);
    switch(this.me.unit) {
      case 0:
        //direction = castle.move();
        this.log(`${0}`);
        break;
      case 1:
        //direction = castle.move();
        this.log(`${1}`);
        break;
    }
    
    
    switch (direction) {
      case 0:
        return this.move(0,0);
        break;
    }
    return this.move(1, 0);

  }
}

var robot = new MyRobot();