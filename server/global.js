const Seed = require("./src/Seed.js");
const Food = require("./src/Food.js");
const Material = require("./src/Material.js");
const Quest = require("./src/Quest.js");
const Season = require("./src/Season.js");
const Event = require("./src/Event.js");
const {Option, RandomTable} = require("./src/RandomTable.js");
const ShopItem = require("./src/ShopItem.js");


const VILLAGER_COUNT = 10;
const FARMLAND_COUNT = 32;

const TREE_COUNT = 4;
const TREE_GROWTH_TIME = 10;

const FARMLAND_UNLOCKED = false;
const FARMLAND_LOCKED = true;

const SICK_CHANCE = 0.08;
const HUNGRY_SICK_CHANCE = 0.25;
const MUTATION_FREQUENCY = 5;
const MUTATION_CHANCE = 0.25;

const DEATH_THRESHOLD = 40;
const FLOOD_DAMAGE = 20;

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

    wood: new Material("wood", "wood", 3, 8),
    brick: new Material("brick", "brick", 4, 8),
    steel: new Material("steel", "steel", 8, 15),
};

ITEMS.cucumberSeed = new Seed("cucumber seed", "cucumber_seed", ITEMS.cucumber);
ITEMS.tomatoSeed = new Seed("tomato seed", "tomato_seed", ITEMS.tomato);
ITEMS.potatoSeed = new Seed("potato seed", "potato_seed", ITEMS.potato);
ITEMS.carrotSeed = new Seed("carrot seed", "carrot_seed", ITEMS.carrot);

const QUESTS = [
    new Quest("happiness", 70, "reach 70 happiness"),
    new Quest("happiness", 80, "reach 80 happiness"),
    new Quest("happiness", 90, "reach 90 happiness"),
];

["water", "farming", "education", "housing"].forEach(facility => {
    QUESTS.push(new Quest(facility, 2, facility + " level = 2"));
    QUESTS.push(new Quest(facility, 3, facility + " level = 3"));
    QUESTS.push(new Quest(facility, 4, facility + " level = 4"));
});

const SHOP = {
    "npc_doctor":       new ShopItem("doctor npc", "npc_doctor", 400, 1),
    "npc_scientist":    new ShopItem("scientist npc", "npc_scientist", 400, 1),
    "npc_sociologist":  new ShopItem("sociologist npc", "npc_sociologist", 400, 1),
    "npc_farmer":       new ShopItem("farmer npc", "npc_farmer", 400, 1),
    "npc_engineer":     new ShopItem("engineer npc", "npc_engineer", 400, 1),

    "cucumber_seed":    new ShopItem("cucumber seed", "cucumber_seed", 10, -1),
    "tomato_seed":      new ShopItem("tomato seed", "tomato_seed", 10, -1),
    "potato_seed":      new ShopItem("potato seed", "potato_seed", 10, -1),
    "carrot_seed":      new ShopItem("carrot seed", "carrot_seed", 10, -1),

    "steel":            new ShopItem("steel", "steel", 30, -1),
}

const SEASONS = [
    new Season("spring", 10),
    new Season("summer", 10),
    new Season("autumn", 10),
    new Season("winter", 10),
    new Season("game end", 0)
];

const EVENT_DURATION_MIN = 3;
const EVENT_DURATION_MAX = 3;

const EVENTS = {
    // neutral
    "cloudy_day": new Event("Cloudy Day", "cloudy_day", "no effect.", 0),

    // positive
    "harvest": new Event("Harvest", "harvest", "each player receives free crops.", 0),
    "rainy_day": new Event("Rainy Day", "rainy_day", "planted crops grow one day faster.", 0),
    "free_cake": new Event("Free Cake", "free_cake", "a new villager has arrived.", 0),
    "black_friday": new Event("Black Friday", "black_friday", "prices are 50% off.", 0),
    "summer_day": new Event("Summer Day", "summer_day", "villagers are temporarily immune to sickness.", 0),

    // negative
    "drought": new Event("Drought", "drought", "some crops have died.", 1),
    "disease": new Event("Disease", "disease", "some villagers have become ill.", 1),
    "heat_stroke": new Event("Heat Stroke", "heat_stroke", "villager progress is slowed.", 1),
    "death": new Event("Death", "death", "a villager will die if happiness is not raised.", 1),
    "flood": new Event("Flood", "flood", "all facilities lose 20 progress.", 1)
};

const EVENTS_SPRING = new RandomTable([
    new Option(EVENTS["cloudy_day"], 1),
    new Option(EVENTS["harvest"], 11),
    new Option(EVENTS["rainy_day"], 20),
    new Option(EVENTS["free_cake"], 2),
    new Option(EVENTS["black_friday"], 8),
    new Option(EVENTS["drought"], 1),
    new Option(EVENTS["disease"], 5),
    new Option(EVENTS["heat_stroke"], 8),
    // new Option(EVENTS["death"], 8),
    new Option(EVENTS["flood"], 10),
]);

const EVENTS_SUMMER = new RandomTable([
    new Option(EVENTS["cloudy_day"], 1),
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
    new Option(EVENTS["cloudy_day"], 1),
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
    new Option(EVENTS["cloudy_day"], 1),
    new Option(EVENTS["free_cake"], 20),
    new Option(EVENTS["black_friday"], 10),
    new Option(EVENTS["drought"], 20),
    new Option(EVENTS["disease"], 30),
    new Option(EVENTS["death"], 15),
]);

const DAILY_LOOT = new RandomTable([
    new Option(ITEMS.cucumberSeed, 15),
    new Option(ITEMS.tomatoSeed, 15),
    new Option(ITEMS.potatoSeed, 15),
    new Option(ITEMS.carrotSeed, 15),
    new Option(ITEMS.cucumber, 5),
    new Option(ITEMS.tomato, 5),
    new Option(ITEMS.potato, 5),
    new Option(ITEMS.carrot, 5),
    new Option(ITEMS.brick, 20),
]);

const LOOT_AMOUNT = 2;

module.exports = {
    VILLAGER_COUNT,
    FARMLAND_COUNT,
    FARMLAND_UNLOCKED,
    FARMLAND_LOCKED,
    SICK_CHANCE,
    HUNGRY_SICK_CHANCE,
    MUTATION_FREQUENCY,
    MUTATION_CHANCE,
    DEATH_THRESHOLD,
    FLOOD_DAMAGE,
    TREE_COUNT,
    TREE_GROWTH_TIME,
    ITEMS,
    QUESTS,
    SHOP,
    SEASONS,
    EVENT_DURATION_MIN,
    EVENT_DURATION_MAX,
    EVENTS,
    EVENTS_SPRING,
    EVENTS_SUMMER,
    EVENTS_AUTUMN,
    EVENTS_WINTER,
    DAILY_LOOT,
    LOOT_AMOUNT
};