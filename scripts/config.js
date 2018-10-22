// GLOBAL //
const seed = Math.floor(Math.random() * 999 + 1);
let debugMode = false; // Shows debug info (angle, left and right turn outputs, and tile food)
let gifMode = false; // removes background
let infoMode = true; // shows and hides info (neural network and graph)
let autoMode = false; // automatically calculate timescale (max 40ms to 60ms update time)

let graphMult = 100;


// MAP //
const mapSize = 150; // Size of the map (height and width) in tiles
const tileSize = 250; // Size of the tiles in pixels (at a zoom level of 1)
const selectSizeAddition = 100; // How far around creatures can you click to select them

let maxTileFood = 15; // Maximum food in a tile
const growSeasonGrowRate = 0.01; // How fast food regrows
const dieSeasonGrowRate = 0.00; // How fast food regrows

const waterBias = 0.23; // Becomes unstable above about 0.75
const distanceSmoothing = 0.5; // less land further away from center
const continentSize = 50; // How large the islands are (maintains water ratio)

const growSeasonLength = 300; // Grow season length (growSeasonLength * 2 / 30 = growSeasonLength in seconds)
const dieSeasonLength = 150; // Die season length (dieSeasonLength * 2 / 30 = dieSeasonLength in seconds)

const mapUpdateDelay = 20; // How many ticks before the map tiles update

// CREATURES //
const minCreatures = 50; // Minimum number of creatures
const minFirstGen = 50; // Minimum number of first generation creatures
const creatureLimit = 5000; // Maximum number of creatures (when population = creatureLimit, the game pauses)

const creatureEnergy = 80; // Max creature energy

const metabolismScaleTime = 800; // Max lifespan of a creature in ticks (metabolismScaleTime / 30 = metabolismScaleTime in seconds), 8th power'd ATM
const minMetabolism = 0.0; // Initial metabolism
const maxMetabolism = 0.2; // End metabolism (metabolism when age == metabolismScaleTime)

const speciesDiversity = 10; // Diversity of each species
const speciesColorChange = 20; // Color change between species

const maxCreatureSize = 100; // Maximum creature size
const minCreatureSize = 30; // Minimum creature size

const maxCreatureSpeed = 125; // Maximum creature speed
const swimmingSpeed = 0.4; // Movement speed % in water

const eatingSpeed = 0.0; // Movement speed % while eating

const rotationSpeed = 0.1; // Speed % how fast creatures rotate

let oldest = 0; // Oldest creature's age

const minInitEyes = 1; // Minimum "eyes" a first generation creature can have
const maxInitEyes = 12; // Maximum "eyes" a first generation creature can have

const minEyes = 1; // Minimum number of "eyes" a creature can have
const maxEyes = 12; // Maximum number of "eyes" a creature can have

const minEyeDistance = 0; // Minimum eye distance in general (creatures will mutate the angle and distance)
const maxEyeDistance = tileSize * 3; // Maximum eye distance in general (creatures will mutate the angle and distance)

const initEyeDistanceH = 3; // Maximum distance an "eye" can be from a creature in tiles forward and backward initially
const initEyeDistanceV = 1; // Maximum distance an "eye" can be from a creature in tiles to either side initially

const maxEyeAngleChange = 1;
const maxEyeDistanceChange = 30;

const minChildren = 1; // Minimum children a creature is allowed to produce
const maxChildren = 10; // Maximum children a creature is allowed to produce

const minChildEnergy = 0.05; // Min % of creatures energy to be given to a single child
const maxChildEnergy = 0.95; // Max % of creatures energy to be given to a single child

const energy = { // Energy cost per tick
    eat: 0.2, // Energy cost to eat
    move: 0.06, // Energy cost to move
    attack: 0.6 // Energy cost to attack
};

const eatEffeciency = 0.9; // Eat effeciency %
const eatPower = 1;

const birthEffeciency = 0.8; // Birth effeciency %

const attackEffeciency = 0.95; // Attack effeciency %
const attackPower = 2; // Attack power % (damage)

const minEatPower = 0.05; // Minimum eating strength (anything lower will be 0)
const minSpawnPower = 0.05; // Minimum output to reproduce (anything lower will be 0)
const minAttackPower = 0.05; // Minimum attack strength (anything lower will be 0)

const reproduceAge = 600; // Minimum number of ticks before a creature can spawn children (reproduceAge / 30 = minimum reproduce age in seconds)
const minReproduceTime = 300; // Minimum number of ticks between spawns (minReproduceTime / 30 = minimum time between spawns in seconds)

// Neural Network //
const bias = 0.1; // Amount to offset the value of a neuron

const minMutability = { // Minimum mutability in various categories
  brain: 1,
  children: 2,
  childEnergy: 2,
  size: 2,
  eyes: {
    number: 2,
    angle: 2,
    distance: 2
  },
  mutability: 2
};

const maxMutability = { // Maximum mutability in various categories
  brain: 6,
  children: 10,
  childEnergy: 10,
  size: 20,
  eyes: {
    number: 50,
    angle: 20,
    distance: 20
  },
  mutability: 10
};

const maxMutabilityChange = 3; // Maximum amount any mutability can change by

const connectionDensity = 0.6; // % of axons initially connected in the brain

const memories = 2; // # of memories a creature can store (outputs that do nothing, except store a value)

const stepAmount = 8; // Maximum amount an axon can be changed by in mutation

const maxInitialAxonValue = 12; // Maximum power of an axon intially

// ZOOM //
const zoomSpeed = 0.1; // How fast the zoom happens
const minZoomLevel = 0.028; // Furthest zoom
const maxZoomLevel = 0.3;  // Nearest zoom
let zoomLevel = 0.028; // Default zoom

const panSpeed = 0.1;

// CENTER MAP (AUTOMATIC) //
let cropx = -(1920 - tileSize * mapSize * zoomLevel) / 2;
let cropy = -(1080 - tileSize * mapSize * zoomLevel) / 2;

// MISC //
const controls = {
    fastForward: "right",
    stop: "left",
    play: "down",
    debug: "d",
    gif: "g",
    auto: "up",
    info: "i"
};

const nnui = { // Neural network UI config
    xoffset: 1920 - 100,
    yoffset: 70,
    xspacing: 10,
    yspacing: 100,
    size: 18,
    stroke: true,
    maxLineSize: 10,
    minLineSize: 5
};