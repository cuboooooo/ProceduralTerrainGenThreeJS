# Procedurual Terrain Generator (v4)
### Written in Three.js
---

Um idk what to write here

Yeah, its procedurally generated using Simplex noise, height and moisture, uses a 
UV Map for biome lookups, and a bunch of cool other features.

All the variables in the gererator are editable, version 5 will include a UI, but for now in the console, if you go into the 
sources, the beginning of the main file (app.js) contains all the global variables that can be changed in the console. Apoligies for the awful code if you go digging in there.

I have v4 hosted on github pages while I work on v5, which will include:
* UI
* Better Scaling for bigger and smaller maps
* Different UV maps
* Refining the noise function to reduce artifacts (little baby islands everywhere)
* Water plane calculation and Physical Rendering (better water 😁)

In Future versions (which I will never get to because I will forget this project in a week) I aim to include:
* Optimization (my code is awful)
* LIVE variable customization
* Moving terrain (infinite scroll)
* Climate (poles and elevation change a third texture map for temperature)
* Partial rendering (generate a MASSIVE map, save it to a 2d minimap, and then render a portion of it in 3d that you can move around in)
* Trees / Foliage (self explanitory)
* Moving / Physical water (waves, roughness, diffraction, etc. Might be too computationally heavy for little gain. Its a terrain generator not a water simulation)

So yeah theres the unofficial roadmap, im awful at writing README's, like there should be a picture in here to show you how freaking awesome it is (its mid)

anyway bye, v4 was all written by me in like a week during college so yeah

---
Sources
---
https://www.redblobgames.com/maps/terrain-from-noise/

^ unbelievably thorough and incredible, love it
