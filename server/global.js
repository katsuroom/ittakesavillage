const Seed = require("./src/Seed.js");
const Food = require("./src/Food.js");
const Material = require("./src/Material.js");

const VILLAGER_COUNT = 12;
const FARMLAND_COUNT = 32;

const TREE_COUNT = 8;
const TREE_GROWTH_TIME = 10;

const FARMLAND_UNLOCKED = false;
const FARMLAND_LOCKED = true;

const ITEMS = {
    cucumber: new Food("cucumber", "cucumber"),
    tomato: new Food("tomato", "tomato"),
    potato: new Food("potato", "potato"),
    carrot: new Food("carrot", "carrot"),
    apple: new Food("apple", "apple"),

    cucumberSeed: undefined,
    tomatoSeed: undefined,
    potatoSeed: undefined,
    carrotSeed: undefined,

    wood: new Material("wood", "wood", 3),
    brick: new Material("brick", "brick", 2),
    steel: new Material("steel", "steel", 5),
};

ITEMS.cucumberSeed = new Seed("cucumber seed", "cucumber_seed", ITEMS.cucumber);
ITEMS.tomatoSeed = new Seed("tomato seed", "tomato_seed", ITEMS.tomato);
ITEMS.potatoSeed = new Seed("potato seed", "potato_seed", ITEMS.potato);
ITEMS.carrotSeed = new Seed("carrot seed", "carrot_seed", ITEMS.carrot);

module.exports = {
    VILLAGER_COUNT,
    FARMLAND_COUNT,
    FARMLAND_UNLOCKED,
    FARMLAND_LOCKED,
    TREE_COUNT,
    TREE_GROWTH_TIME,
    ITEMS
};