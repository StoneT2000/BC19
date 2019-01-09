# Battlecode 2019 Bot
This is team "Codelympians" source code for our bot

Below is some structuring stuff:

## FILE STRUCTURE
math.js - Basic math functions for:
- Squared Distance (Will use lookup tables)

base.js - Functions to determine the best greedy move to a target position

pathing - Folder with pathing algorithms stuff
  
search.js - Functions for searching for data
- Determine if position has fuel, karbonite, is passable
- Has a BFS algorithm thats really slow
- horizontalSymmetry(gameMap) returns true if map is horizontally symmetric

signals.js - Functions for processing signal data sent by bots to other bots
- processMessage...(self, msg) updates self as needed

units - Folder with all the code for processing self and returning an action, status update, and target
- mind(self) - processes the current game state self, and returns an action, status, and target

## Castle Talk Encoding
The values ...
- 0, ... 5 are reserved for units to tell all castles which unit got spawned.
- 6 is reserved for units to tell all castles to pause building that turn.
