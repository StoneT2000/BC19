var ndarray = require('ndarray')
var createPlanner = require('l1-path-finder')

//Create a maze as an ndarray
let maparr = new Int8Array(4096);
var maze = ndarray(maparr, [64,64])

for (let i = 1; i < 10; i++) {
  for (let j = 1; j < 3; j++) {
    maze.set(i,j,1);
  }
}
//console.log(maparr[0])
//Create path planner

let st = new Date();
var planner = createPlanner(maze)
let st2 =  new Date();
console.log('Planner took ' + (st2-st) + 'ms');
//Find path
var path = []
var dist = planner.search(0,0, 4,3,  path)
let ft = new Date();
let runTime = ft - st2;
console.log('Search took ' + runTime + 'ms');
//Log output
console.log('path length=', dist)
console.log('path = ', path)