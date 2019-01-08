var bcdata;
var reader = new FileReader();
reader.onloadend = function() {
  console.log("loaded");
  bcdata = new Uint8Array(reader.result);
  visualize(bcdata);
}

$(document).ready(function () {
  $("#fileDrop").on('change', function(){
    console.log("dropped file!");
    
    reader.readAsArrayBuffer($("#fileDrop")[0].files[0]);
    
  });
});


function visualize(replay) {
  $(".map").html("");
  var seed = 0;
  for (let i = 0; i<4; i++) seed += (replay[i+2] << (24-8*i));
  console.log(seed);
  
  this.game = new Game(seed, 0, 0, false, false);
  
  var turn = 0;
  this.MAP_WIDTH = this.game.map[0].length;
  this.MAP_HEIGHT = this.game.map.length;
  console.log('MAP_WIDTH: ' + this.game.map[0].length)
  console.log('MAP_Height: ' + this.game.map.length)
  
  var BLANK = '#f0dab1',
      OBSTACLE = '#393939',
      KARBONITE = '#8ce96a',
      FUEL = '#e2e96a';
  for (let y = 0; y < this.MAP_HEIGHT; y++) for (let x = 0; x < this.MAP_WIDTH; x++) {
    var color = this.game.karbonite_map[y][x] ? KARBONITE : this.game.fuel_map[y][x] ? FUEL : this.game.map[y][x] ? BLANK : OBSTACLE;
    //console.log(color);
    $(".map").append("<div class='tile' id='" + x + "_" + y + "'></div>")
    $("#" + x + "_"  + y).css('background-color', color);
    //this.mapGraphics.drawRect(x*draw_width, y*draw_height, draw_width, draw_height);
    //this.mapGraphics.endFill();
  }
  $(".tile").css('width', 640/this.MAP_WIDTH + "px");
  $(".tile").css('height', 640/this.MAP_HEIGHT + "px");
  $(".tile").on('click', function(){
    let xy = this.id.split("_")
    let px = xy[0];
    let py = xy[1];
    console.log(px,py);
  })
}