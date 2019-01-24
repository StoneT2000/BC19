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

signals.js - Functions for processing signal data sent by bots to other bots. Only has some of it
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

For any robot, it must send ```self.castleTalk(self.me.id)```, to notify the castles of its existence

Runs ```self.initializeCastleLocations()``` to determine castle locations.

### Signal Procession
How the robot processes signals it receives

### Updating information
(really only done in churches and castles). Robot runs through ```self.AllUnits``` and add new units appropriately

### Deciding on Actions and Final Target
The final target, ```self.finalTarget```, is where the bot will attempt to head towards if no other action has been returned. ```self.Target``` should not be touched.

### Processing final target
The robot runs the algorithms and finds a path to the final target and heads towards its sub target, self.Target. It returns an movement action if an action hasn't been sent already.

### Sending Signals (could honestly be anywhere)
Send signals to other bots depending on self.status, received signals etc.

## Castle Talk Encoding
The values ...
- 0, ... 5 are reserved for units to tell all castles which unit got spawned.
- 6 is reserved for units to tell all castles to pause building that turn.
- 77, ..., 236 is reserved for pilgrims to tell all castles which resource tile they are mining
- 237 is for pilgrim to tell castle it is a scout and all castle talk from that scout is location information.

## Signal Encoding
The values ...
- 1 is reserved for units to tell other units with attacking abilities to go and attack the first known structure
- 2,3 for castle to tell pilgrim to search for karbonite (2) or fuel (3)
- 4 for pilgrim to tell castle it just gave out its fuel and karbonite and is ready to receive new instructions if needed
- 5??? **not sure if we need it**
- 6, ... 4101 are for sending new target locations for units. **Doesn't seem to be used anymore??**
- 4102,... 8197 are for sending the 1st new castle location for newly built units. **Also doesn't seem to be used anymore**, can be used for rush strats.
- 8198,... 12293 **Also doesn't seem to be used anymore**
- 12294, ...16389 are for setting unit statuses to 'attackTarget', used for defensive purposes to move units closer to enemy and farther away from own castle. Units only move such that they are outside attacking radius.
- 16390 is not really used
- 16391 tells units to go to defend mode. Prophets and Preachers go to defendOldPos mode so that they surround their castle instead of trailing off.
- 16392, ... 20487 are for setting unit statuses to 'goToTarget', tells unit to always move to that target and then attack that target if possible. Sent by castle often to tell preachers (add crusaders later) to go attack a incoming prophet
- 20488, ... 24583 are for setting all unit status to 'goToTarget'. All these units then attack the target, usually an enemy castle
- 24834 is for telling a pilgrim to search and mine any deposit
- 24585 is for telling units to move at fastest speed possible
- 24586, ... 28681 is for telling prophets to move and defend a new location.
- 28682 to 28841  is for telling newly built pilgrims to mine that location. (Specify type?)
- 28842 to 29001 is for telling old pilgrims to mine that location.
- 29002 is for pilgrim scouting


## STRATEGIES
### EARLY GAME
#### Preacher Defence
Defenders have a general advantage, so we start with stacking 3 preachers onto the first castle, then a pilgrim.

Preachers move apart from each other in the direction of the enenmy castle, this way enemy preachers can't hit all our units at once. Preachers are initialized with mode ```defend``` . We also force a prophet to be built after there is sufficient karbonite and enough defending preachers. Once we stock up on prophets, the castle is basically unbeatable as long as we have tons of fuel.

#### Preacher Attack

Each turn, each preacher checks if there are at least 8 preachers in its vincinity. IF there are, it then checks if there is enough fuel for these preachers to run all the way to the enemy castle and destory it. If there is not enough fuel, preachers keep sending 6 through castle talk to tell castles to pause building. Castles, when paused, tell all pilgrims that give it karbonite and fuel to search and mine for fuel.

Once the preachers have enough fuel, they target the enemy castle and run for it. If the castle is destroyed (as determined by a really ratched method of checking for whether the last attacked unit id is still there), the preachers go on ```defend``` mode or ```waitingForFuelStack``` mode. Preachers on ```waitingForFuelStack``` mode wait until there is enough fuel for preachers to run to the new target that was determined after the castle was destroyed. Preachers on defend or waitingForFuelStack mode will run ```moveApart(self)``` to try and not clump together to avoid getting easily destroyed by enemy preachers.

##### ALSO

Pilgrims that follow a preacher army, should tell the preacher army when to run as fast as possible or when to take it slower (to save fuel, by 4~2 fold). if there are enemies near, especially prophets, run at them. If we near the enemey castle, run at them.

#### Pilgrim Mining

Pilgrims by default search and mine for karbonite. When they return to a castle and give it karbonite and fuel, it sends a signal = 5 to the castle, telling the castle it returned. This way, castles can then give the pilgrim that just delivered resources a new status through signalling a 2 or a 3 (mine karbonite or mine fuel). (ALSO is there an another way for castles to check if a unit nearby is a pilgrim and just gave it karbonite and fuel?).

#### PILGRIM + CRUSADER MINING (TODO)

Let pilgrims sit at a mining spot and just mine. Let crusaders deliver resources to castles from pilgrims if the pilgrim is not close.

#### Pilgrim Scouting (TODO)
Idea:
 During the mid game, send cheap pilgrims to scout the map. Pilgrim will search for enemy units. The pilgrim will communicate the positions of the enemy units back (see communication section)

Why is this useful?
 We can determine whether to defend a contestable place
 We can determine whether to defend one of our churches
 We decide how much many resources to spend on defense on specific areas

Timing
 Do this during the mid game, so we can gain advantage in the mid-late game. In early game, this could be expensive.

Communication:
 Pilgrim can castleTalk back to castles if units are being built and sent. Once scouting is complete, the pilgrim finds our preacher army in its visible range, and will inform the information to the preachers with the normal communication method.

#### Pilgrim Telescope (TODO)
TODO: Implement code for a pilgrim to follow an army of preachers. The pilgrim acts as a telescope for the preachers, looks out for enemy castles along the way and also helps defend against enemy prophets (long range units). If it sees prophets that can attack our units, it should send a signal for the army to attack the prophets.
I approve - Tom

#### Prophet defense (TODO)


# TODO

Check todos in strategy

Strategy pls.

SIGNAL TO CASTLE THE DESTRUCTION OF A CASTLE (We sort of do, we jsut need a better way to uniquely hash a castle location in a maximum 64x64 map into a number between )

Improve the way pilgrims decide on where to build churches. Sometimes they just go to enenmy fuel locations

Better way to determine when to build churches

Improve the defence of our own churches. We build them and they auto build 2 more prophets. How can this be improved? How do we know when to better defend it.

Better defending, preachers against incoming crusaders.

Scouting with pilgrims?

Fix issue with castles deciding ot stop building prophets after some tme

Force prophets to not stand right next to the castle

BUG!!!!!

Lattice strucutre is inefficient, our prophets for some reason just keep on trying to move into the lattice but end up expending fuel for no reason

