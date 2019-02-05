import {BCAbstractRobot, SPECS} from 'battlecode';import castle from './bot1mini/units/castle.js';import church from './bot1mini/units/church.js';import pilgrim from './bot1mini/units/pilgrim.js';import crusader from './bot1mini/units/crusader.js';import prophet from './bot1mini/units/prophet.js';import preacher from './bot1mini/units/preacher.js';import qmath from './bot1mini/math.js';import search from './bot1mini/search.js';import base from './bot1mini/base.js';class MyRobot extends BCAbstractRobot {constructor(){super(),this.globalTurn=0,this.status="justBuilt",this.target=[0,0],this.finalTarget=[0,0],this.path=[],this.knownStructures={0:[],1:[]},this.knownDeposits={},this.castles=0,this.churches=0,this.pilgrims=0,this.crusaders=0,this.prophets=0,this.preachers=0,this.buildQueue=[],this.maxPilgrims=0,this.maxCrusaders=1e3,this.allSpots=[],this.fuelSpots=[],this.karboniteSpots=[],this.sentCommand=!1,this.planner=null,this.allUnits={}}turn(){new Date;if(this.me.unit===SPECS.CASTLE){return castle.mind(this).action}if(this.me.unit===SPECS.CRUSADER){return crusader.mind(this).action}if(this.me.unit===SPECS.PILGRIM){return pilgrim.mind(this).action}if(this.me.unit===SPECS.CHURCH){return church.mind(this).action}if(this.me.unit===SPECS.PROPHET){return prophet.mind(this).action}if(this.me.unit===SPECS.PREACHER){return preacher.mind(this).action}new Date}canMove(t,e){var i=this.getVisibleRobotMap(),s=this.getPassableMap(),r=SPECS.UNITS[this.me.unit].FUEL_PER_MOVE;return r*=qmath.distDelta(t,e),!!(this.fuel>=r&&search.emptyPos(this.me.x+t,this.me.y+e,i,s))}readyAttack(){var t=SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST;if(this.fuel>=t)return!0}setFinalTarget(t){this.finalTarget=t;var e=[];null!==this.planner?this.planner.search(this.me.y,this.me.x,t[1],t[0],e):e=[this.me.y,this.me.x,t[1],t[0]],e.shift(),e.shift(),this.path=e,this.target[1]=e.shift(),this.target[0]=e.shift()}navigate(t,e=false,i=true){if(null!==t){this.setFinalTarget(t);var s="";if(this.path.length>0){qmath.dist(this.me.x,this.me.y,this.target[0],this.target[1])<=2&&(this.target[1]=this.path.shift(),this.target[0]=this.path.shift())}if(this.target){var r=base.relToPos(this.me.x,this.me.y,this.target[0],this.target[1],this,e,i);0===r.dx&&0===r.dy?(s="",0===(r=base.relToPos(this.me.x,this.me.y,this.target[0],this.target[1],this,e,!0)).dx&&0===r.dy||(s=this.move(r.dx,r.dy))):s=this.move(r.dx,r.dy)}return s}return""}getLocation(t){var e=t%this.map[0].length;return{x:e,y:(t-e)/this.map[0].length}}compressLocation(t,e){return t+e*this.map[0].length}initializeCastleLocations(){for(var t=search.circle(this,this.me.x,this.me.y,2),e=this.getVisibleRobotMap(),i=!1,s=null,r=0;r<t.length;r++){var n=t[r][0],a=t[r][1];if(null!==(s=this.getRobot(e[a][n]))&&s.unit===SPECS.CASTLE){this.knownStructures[this.me.team].push({x:s.x,y:s.y,unit:0}),i=!0;break}}if(!1===i)return this.knownStructures={0:[],1:[]},!1;var h=this.knownStructures[this.me.team][0].x,m=this.knownStructures[this.me.team][0].y,o=null;return null!==(o=this.mapIsHorizontal?[h,this.map.length-m-1]:[this.map[0].length-h-1,m])&&(this.knownStructures[(this.me.team+1)%2].push({x:o[0],y:o[1],unit:0}),s)}avoidEnemyLocations(t){var e=[],i=this.getVisibleRobotMap();if(t.length>0)for(var s=search.circle(this,this.me.x,this.me.y,4),r=0;r<s.length;r++){var n=0,a=s[r];if(search.emptyPos(a[0],a[1],i,this.map)){for(var h=0;h<t.length;h++)n+=qmath.dist(a[0],a[1],t[h][0],t[h][1]);e.push({pos:a,dist:n})}}if(e.length>0){e.sort(function(t,e){return e.dist-t.dist});return base.rel(this.me.x,this.me.y,e[0].pos[0],e[0].pos[1])}return null}findDefendLoc(t,e,i,s,r,n){var a=t.getVisibleRobotMap(),h=t.map,m=t.getFuelMap(),o=t.getKarboniteMap(),u=t.map.length,l=search.findNearestStructure(t),y=(qmath.dist(t.me.x,t.me.y,l.x,l.y),99999),c=null,d=0;"defendOldPos"!==t.status&&"defendSpot"!==t.status||(d=qmath.dist(t.me.x,t.me.y,t.defendTarget[0],t.defendTarget[1])),"rally"===t.status&&(d=qmath.dist(t.me.x,t.me.y,t.rallyTarget[0],t.rallyTarget[1]));for(var f=r;f<n;f++)for(var x=i;x<s;x++)if(f%2!=x%2&&(search.emptyPos(x,f,a,h,!1)||t.me.id===a[f][x])&&!1===m[f][x]&&!1===o[f][x]){var g=search.findNearestStructureHere(t,x,f,e[6]);if(qmath.dist(x,f,g.x,g.y)>2){var p=[t.me.x,t.me.y];"defendOldPos"===t.status||"defendSpot"===t.status?p=t.defendTarget:"rally"===t.status&&!0===t.useRallyTargetToMakeLattice&&(p=t.rallyTarget,d<=SPECS.UNITS[this.me.unit].VISION_RADIUS/4&&(t.useRallyTargetToMakeLattice=!1));(S=qmath.dist(p[0],p[1],x,f))<y&&(y=S,c=[x,f])}}if(null===c)for(f=u;f<u;f++)for(x=0;x<u;x++)if(f%2!=x%2&&(search.emptyPos(x,f,a,h,!1)||t.me.id===a[f][x])&&!1===m[f][x]&&!1===o[f][x]){g=search.findNearestStructureHere(t,x,f,e[6]);if(qmath.dist(x,f,g.x,g.y)>2){var S;p=[t.me.x,t.me.y];(S=qmath.dist(p[0],p[1],x,f))<y&&(y=S,c=[x,f])}}return c}determineEnemyDirection(t=this.me.x,e=this.me.y){var i=this.map.length;return this.mapIsHorizontal?e<=i/2?"down":"up":t<=i/2?"right":"left"}setBuildTowardsEnemyDirections(t){"left"===t.enemyDirection?t.buildingAttackUnitPositions=[[t.me.x-1,t.me.y-1],[t.me.x-1,t.me.y],[t.me.x-1,t.me.y+1],[t.me.x,t.me.y-1],[t.me.x,t.me.y+1],[t.me.x+1,t.me.y-1],[t.me.x+1,t.me.y],[t.me.x+1,t.me.y+1]]:"right"===t.enemyDirection?t.buildingAttackUnitPositions=[[t.me.x+1,t.me.y-1],[t.me.x+1,t.me.y],[t.me.x+1,t.me.y+1],[t.me.x,t.me.y-1],[t.me.x,t.me.y+1],[t.me.x-1,t.me.y-1],[t.me.x-1,t.me.y],[t.me.x-1,t.me.y+1]]:"down"===t.enemyDirection?t.buildingAttackUnitPositions=[[t.me.x-1,t.me.y+1],[t.me.x,t.me.y+1],[t.me.x+1,t.me.y+1],[t.me.x-1,t.me.y],[t.me.x+1,t.me.y],[t.me.x-1,t.me.y-1],[t.me.x,t.me.y-1],[t.me.x+1,t.me.y-1]]:"up"===t.enemyDirection&&(t.buildingAttackUnitPositions=[[t.me.x-1,t.me.y-1],[t.me.x,t.me.y-1],[t.me.x+1,t.me.y-1],[t.me.x-1,t.me.y],[t.me.x+1,t.me.y],[t.me.x-1,t.me.y+1],[t.me.x,t.me.y+1],[t.me.x+1,t.me.y+1]])}}var unitTypesStr=["Castle","Church","Pilgrim","Crusader","Prophet","Preacher"],robot=new MyRobot;robot.log(`New Bot: ${robot.id}`);