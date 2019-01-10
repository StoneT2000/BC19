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

It consists of the following synchronous sections in the following order:
- Initialization
- Signal Procession
- Updating information
- Deciding on Actions and Final Target
- Processing final target, returning new path and following said path
- Sending Signals

### Initialization
Code that is run upon creation of robot

For any robot, it must send self.castleTalk(self.me.id), to notify the castles of its existence

### Signal Procession
How the robot processes signals it receives

### Updating information
(realy only done in churches and castles). Robot runs through self.AllUnits and add new units appropriately

### Deciding on Actions and Final Target
The final target, self.finalTarget, is where the bot will attempt to head towards. self.Target should not be touched.

### Processing final target
The robot runs the algorithms and finds a path to the final target and heads towards its sub target, self.Target. It returns an movement action if an action hasn't been sent already.

### Sending Signals (could honestly be anywhere)
Send signals to other bots depending on self.status, received signals etc.

## Castle Talk Encoding
The values ...
- 0, ... 5 are reserved for units to tell all castles which unit got spawned.
- 6 is reserved for units to tell all castles to pause building that turn.

## Signal Encoding
The values ...
- 1 is reserved for units to tell other units with attacking abilities to go and attack the first known structure
