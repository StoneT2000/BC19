var bcdata;
var reader = new FileReader();
var visualization;

var CHECKPOINT = 1000;
var TIME_PER_TURN = 50;

reader.onloadend = function() {
  console.log("loaded");
  bcdata = new Uint8Array(reader.result);
  visualization = new visualize(bcdata);
}

$(document).ready(function () {
  $("#fileDrop").on('change', function(){
    console.log("dropped file!");
    
    reader.readAsArrayBuffer($("#fileDrop")[0].files[0]);
    
  });
});


function visualize(replay) {
  $(".map").html("<div class='botDisplay'><div class='castle'></div></div>");
  
  this.replay = replay;
  var seed = 0;
  for (let i = 0; i<4; i++) seed += (this.replay[i+2] << (24-8*i));
  console.log(seed);
  
  this.game = new Game(seed, 0, 0, false, false);
  this.checkpoints = [this.game.copy()];
  
  this.populateCheckpoints = function() {
    var last_checkpoint_turn = CHECKPOINT * (this.checkpoints.length-1);
    var final_checkpoint_turn = this.numTurns() - (this.numTurns()%CHECKPOINT); // checkpoint before/at numturns
    if (final_checkpoint_turn === last_checkpoint_turn) return; // have all possible checkpoints

    var last_checkpoint_game = this.checkpoints[this.checkpoints.length-1].copy();

    for (let i = last_checkpoint_turn+1; i<final_checkpoint_turn+1; i++) {
        console.log('checkpoint i = '+i);
        // feed in the i-1th instruction
        var diff = this.replay.slice(6 + 8*(i-1), 6 + 8*i);
        last_checkpoint_game.enactTurn(diff);
        if (i%CHECKPOINT === 0) {
            this.checkpoints.push(last_checkpoint_game);
            break;
        }
    }

    setTimeout(this.populateCheckpoints.bind(this),50);
  }
  
  this.turn = 0;
  this.MAP_WIDTH = this.game.map[0].length;
  this.MAP_HEIGHT = this.game.map.length;
  console.log('MAP_WIDTH: ' + this.game.map[0].length)
  console.log('MAP_Height: ' + this.game.map.length)
  
  var BLANK = '#e8efe8',
      OBSTACLE = '#393939',
      KARBONITE = '#8ce96a',
      FUEL = '#e2e96a';
  
  /*devs? the online replayer on battlecode.org flips x and y around*/
  
  //initialize map without bots
  for (let y = 0; y < this.MAP_HEIGHT; y++) for (let x = 0; x < this.MAP_WIDTH; x++) {
    var color = this.game.karbonite_map[y][x] ? KARBONITE : this.game.fuel_map[y][x] ? FUEL : this.game.map[y][x] ? BLANK : OBSTACLE;
    //console.log(color);
    $(".map").append("<div class='tile' id='" + x + "_" + y + "'></div>")
    $("#" + x + "_"  + y).css('background-color', color);
    //this.mapGraphics.drawRect(x*draw_width, y*draw_height, draw_width, draw_height);
    //this.mapGraphics.endFill();
  }
  var draw_width = 640 / this.MAP_WIDTH;
  var draw_height = 640 / this.MAP_HEIGHT;
  $(".tile").css('width', draw_width + "px");
  $(".tile").css('height', draw_height + "px");
  $(".tile").on('click', function(){
    let xy = this.id.split("_")
    let py = xy[0];
    let px = xy[1];
    console.log(px,py);
  });

  //this.populateCheckpoints();
  
    this.render = function() {
      /*
      var units = new Array(6);
        for (let i = 0; i < 6; i++) units[i] = [];
        for (let i = 0; i < this.game.robots.length; i++) {
            units[this.game.robots[i].unit].push(this.game.robots[i]);
        }
        */
      
      $(".red-stats .karbonite").html(this.game.karbonite[0])
      $(".red-stats .fuel").html(this.game.fuel[0])
      $(".blue-stats .karbonite").html(this.game.karbonite[1])
      $(".blue-stats .fuel").html(this.game.fuel[1])
      $(".roundNum").val(this.game.round);
      $(".roundNum").attr('value',this.game.round);
      $(".turnNum").val(this.turn);
      $(".turnNum").attr('value',this.turn);
      for (let i = 0 ; i < this.game.robots.length; i++) {
        let robot = this.game.robots[i];
        let robotDiv = $("#bot-" + robot.id);
        //console.log(robot);
        if (robotDiv.length === 0) {
          //either robot was eliminated or hasnt been added yet
          $(".botDisplay").append("<div class='bot' id='bot-" + robot.id +"'>"+"</div>");
          robotDiv = $("#bot-" + robot.id);
          switch (robot.unit){
            case 0:
              robotDiv.addClass('castle');
              break;
            case 1:
              robotDiv.addClass('church');
              break;
            case 2:
              robotDiv.addClass('pilgrim');
              break;
            case 3:
              robotDiv.addClass('crusader');
              break;
            case 4:
              robotDiv.addClass('prophet');
              break;
            case 5:
              robotDiv.addClass('preacher');
              break;
          }
          if (robot.team === 0) {
            robotDiv.addClass('team-blue');
          }
          else {
            robotDiv.addClass('team-red');
          }
          
        }
        
        robotDiv.css('top',robot.y*draw_height);
        robotDiv.css('left',robot.x*draw_width);
        robotDiv.css('margin-left',(20-draw_width)/2);
        robotDiv.css('margin-top',(20-draw_height)/2);
      }
      /*
        for (let i = 0; i < 6; i++) {
            var counter = 0;
            for (let j = 0; j < units[i].length; j++) {
                let robot = units[i][j];
                //let s = this.sprite_pools[i][counter];
                //s.visible = true;
                //s.width = draw_width;
                //s.height = draw_height;
                
                //s.position = new PIXI.Point(draw_width*(robot.x+.5), draw_height*(robot.y+.5));
                //s.tint = robot.team === 0 ? 0xFF0000 : 0x0000FF;
                counter++;
            }
        }
        */
    }
    this.goToTurn = function(turn) {
        // Ignore if already at turn.
        if (turn === this.turn) return;

        // First, go to nearest earlier/equal checkpoint.
        var last_checkpoint_turn = turn - turn%CHECKPOINT;

        // If we are currently at or greater than last_checkpoint_turn (and less than turn),
        // just use that.  Otherwise, load from last checkpoint.

        if (this.turn < last_checkpoint_turn || this.turn >= turn) {
            this.game = this.checkpoints[last_checkpoint_turn/CHECKPOINT].copy();
            this.turn = last_checkpoint_turn;
        }

        // Now, while this.turn < turn, go forward.
        while (this.turn < turn) this.nextTurn();
    }

    this.goToRound = function(round) {
        // Find the first checkpoint with game.round greater than round, then take the one before it.
        // If no such checkpoint exists, take the last checkpoint and hope for the best.
        this.game = this.checkpoints[this.checkpoints.length-1].copy();
        this.turn = this.checkpoints.length*CHECKPOINT
        for (let i = 0; i<this.checkpoints.length; i++) {
            if (this.checkpoints[i].round > round) {
                this.game = this.checkpoints[i-1].copy();
                this.turn = (i-1)*CHECKPOINT;
                break;
            }
        }

        // Now, advance (bounded by the numTurns())
        for (let i = 0; i<this.numTurns(); i++) {
            if (this.game.round !== round) this.nextTurn();
        }

    }

    this.nextTurn = function() {
        var diff = this.replay.slice(6 + 8*this.turn, 6 + 8*(this.turn+1));
        this.game.enactTurn(diff);
        this.turn++;
        //if (this.turn_callback) this.turn_callback(this.turn);
    }

    this.numTurns = function() {
        return (this.replay.length - 6)/8;
    }
  
  this.render();
  
  
}
function runTurns(k) {
  for (let i = 0; i < k; i++) {
    visualization.nextTurn();
    visualization.render();
  }
}
var turnInterval;
function start(key){
  turnInterval = setInterval(function(){key.nextTurn();key.render();},50)
}
function stop(key) {
  clearInterval(turnInterval);
}
//var turnInterval = setInterval(function(){visualization.nextTurn();visualization.render();},50)