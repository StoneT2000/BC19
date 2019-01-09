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

## General Unit Structure
Each unit.js file has a function mind(self).

This function first has an initialization part of code, what must be performed upon creation

Then the robot checks for signals (castles also check for the additional castle talk signals). Robot accordingly updates self.status, self.target

Depending on self.status, robot processes data and returns its decision to the main turn() function in the Robot class. It returns an result with keys, action, status, target, and optionally response

result.action is returned in turn() and thus performed. This said action must be performable, avoid logging errors as this will complicate code for the robot who may have thought they completed their action. 

result.status is an status update that gets passed into the next time turn() is run and mind(self) is run

result.target is an target update. If mind(self) doesn't return a proper action, the bot will always move towards its target.

## Castle Talk Encoding
The values ...
- 0, ... 5 are reserved for units to tell all castles which unit got spawned.
- 6 is reserved for units to tell all castles to pause building that turn.
