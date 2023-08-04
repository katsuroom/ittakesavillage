const Seed = require("./src/Seed.js");
const Food = require("./src/Food.js");
const Material = require("./src/Material.js");
const Season = require("./src/Season.js");
const Event = require("./src/Event.js");
const {Option, RandomTable} = require("./src/RandomTable.js");

const VILLAGER_COUNT = 12;
const FARMLAND_COUNT = 32;

const TREE_COUNT = 8;
const TREE_GROWTH_TIME = 10;

const FARMLAND_UNLOCKED = false;
const FARMLAND_LOCKED = true;

const SICK_CHANCE = 0.5;

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

    wood: new Material("wood", "wood", 3, 6),
    brick: new Material("brick", "brick", 2, 6),
    steel: new Material("steel", "steel", 5, 10),
};

ITEMS.cucumberSeed = new Seed("cucumber seed", "cucumber_seed", ITEMS.cucumber);
ITEMS.tomatoSeed = new Seed("tomato seed", "tomato_seed", ITEMS.tomato);
ITEMS.potatoSeed = new Seed("potato seed", "potato_seed", ITEMS.potato);
ITEMS.carrotSeed = new Seed("carrot seed", "carrot_seed", ITEMS.carrot);

const SEASONS = [
    new Season("spring", 20),
    new Season("summer", 10),
    new Season("autumn", 20),
    new Season("winter", 10),
    new Season("game end", 0)
];

const EVENT_DURATION_MIN = 3;
const EVENT_DURATION_MAX = 5;

const EVENTS = {
    // neutral
    "cloudy_day": new Event("Cloudy Day", "cloudy_day", "No effect."),

    // positive
    "harvest": new Event("Harvest", "harvest"),
    "rainy_day": new Event("Rainy Day", "rainy_day"),
    "free_cake": new Event("Free Cake", "free_cake"),
    "black_friday": new Event("Black Friday", "black_friday"),
    "summer_day": new Event("Summer Day", "summer_day"),

    // negative
    "drought": new Event("Drought", "drought"),
    "disease": new Event("Disease", "disease"),
    "heat_stroke": new Event("Heat Stroke", "heat_stroke"),
    "death": new Event("Death", "death"),
    "flood": new Event("Flood", "flood")
};

const EVENTS_SPRING = new RandomTable([
    new Option(EVENTS["cloudy_day"], 8),
    new Option(EVENTS["harvest"], 11),
    new Option(EVENTS["rainy_day"], 28),
    new Option(EVENTS["free_cake"], 8),
    new Option(EVENTS["black_friday"], 8),
    new Option(EVENTS["drought"], 1),
    new Option(EVENTS["disease"], 5),
    new Option(EVENTS["heat_stroke"], 8),
    new Option(EVENTS["death"], 8),
    new Option(EVENTS["flood"], 15),
]);

const EVENTS_SUMMER = new RandomTable([
    new Option(EVENTS["cloudy_day"], 6),
    new Option(EVENTS["harvest"], 6),
    new Option(EVENTS["rainy_day"], 5),
    new Option(EVENTS["free_cake"], 6),
    new Option(EVENTS["black_friday"], 6),
    new Option(EVENTS["summer_day"], 15),
    new Option(EVENTS["drought"], 15),
    new Option(EVENTS["disease"], 6),
    new Option(EVENTS["heat_stroke"], 24),
    new Option(EVENTS["death"], 10),
    new Option(EVENTS["flood"], 1),
]);

const EVENTS_AUTUMN = new RandomTable([
    new Option(EVENTS["cloudy_day"], 5),
    new Option(EVENTS["harvest"], 20),
    new Option(EVENTS["rainy_day"], 10),
    new Option(EVENTS["free_cake"], 8),
    new Option(EVENTS["black_friday"], 7),
    new Option(EVENTS["drought"], 10),
    new Option(EVENTS["disease"], 15),
    new Option(EVENTS["heat_stroke"], 5),
    new Option(EVENTS["death"], 10),
    new Option(EVENTS["flood"], 10),
]);

const EVENTS_WINTER = new RandomTable([
    new Option(EVENTS["cloudy_day"], 5),
    new Option(EVENTS["free_cake"], 20),
    new Option(EVENTS["black_friday"], 10),
    new Option(EVENTS["drought"], 20),
    new Option(EVENTS["disease"], 30),
    new Option(EVENTS["death"], 15),
]);

module.exports = {
    VILLAGER_COUNT,
    FARMLAND_COUNT,
    FARMLAND_UNLOCKED,
    FARMLAND_LOCKED,
    SICK_CHANCE,
    TREE_COUNT,
    TREE_GROWTH_TIME,
    ITEMS,
    SEASONS,
    EVENTS,
    EVENTS_SPRING,
    EVENTS_SUMMER,
    EVENTS_AUTUMN,
    EVENTS_WINTER,
    EVENT_DURATION_MIN,
    EVENT_DURATION_MAX
};