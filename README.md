# Battlecode 2019 Bot

This is team "Codelympians" source code for our bot. We competed in JavaScript this year.

We finished 9th overall out of 600+ registered teams, 4th out of all high school teams.

Our final bot that got submitted is in the root directory and is called botfinal.js (or check out mini.js, our entire bot on one line of code)

A commented version and with logs is located in the folder bot1.

### DISCLAIMER:

The code was written for speed and under a lot of time constraints. Hopefully comments will help, but do not expect the code to be really readable whatsoever. 

## High Level Overview

Our general strategy was the following:

In the first 3 turns, we build pilgrims and depending on the map, we will employ prophet harassment to try and take over resource deposits near the middle of the map



After that, it is all turtling and a lot of church lightnings.



Every single church that is on a resource deposit within 64 r^2 units away from the opposite resource deposit on the map is marked as in danger, and will subsequently build up a defence of about 12 prophets.



Afterwards, our castles each produce 1 scouting pilgrim to determine a frontline, a line determining how far our units can go before getting shot at by the enemy.



The 1 scout also serves as the intiator for church lightnings.



In the end, if we haven't lost a castle yet, we build a lot of crusaders. If we did lose a castle, our bot should tell everyone to rush at the enemy although this is probably broken.
