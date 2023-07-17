// server setup ////////////////////////////////////////////////////////////////

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {});

app.use(express.static("../client"));

httpServer.listen(5000);


// game variables ////////////////////////////////////////////////////////////////

const Villager = require("./src/Villager.js");
const Facility = require("./src/Facility.js");
const Food = require("./src/Food.js");
const Seed = require("./src/Seed.js");
const Material = require("./src/Material.js");
const ItemStack = require("./src/ItemStack.js");
const Farmland = require("./src/Farmland.js");
const Tree = require("./src/Tree.js");

const VILLAGER_COUNT = 12;
const FARMLAND_COUNT = 32;
const TREE_COUNT = 8;

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

let day = 1;
let season = "spring";
let daysUntilNextSeason = 20;
let budget = 1600;

let villagers = [];
let paths = [...Array(22)].map(e => Array(26).fill('-'));

let farm = [];
let trees = [];

let facilities = {
    "water": new Facility(),
    "farming": new Facility(),
    "education": new Facility(),
    "housing": new Facility()
};

let inventory = [];


// initialize ////////////////////////////////////////////////////////////////

function initPaths()
{
    for(let i = 0; i < 26; i++)
    {
        paths[0][i] = 'x';
        paths[21][i] = 'x';
    }

    for(let i = 1; i < 22; i++)
    {
        paths[i][0] = 'x';
        paths[i][25] = 'x';
    }

    // for(let i = 2; i < 5; i++)
    // {
    //     for(let j = 9; j < 12; j++)
    //         paths[i][j] = 'x';
    //     for(let j = 14; j < 24; j++)
    //         paths[i][j] = 'x';
    // }

    for(let i = 1; i < 6; i++)
    {
        for(let j = 1; j < 25; j++)
            paths[i][j] = 'x';
    }
        
    for(let i = 6; i < 12; i++)
    {
        for(let j = 2; j < 12; j++)
            paths[i][j] = 'x';
        for(let j = 14; j < 24; j++)
            paths[i][j] = 'x';
    }

    for(let i = 14; i < 20; i++)
    {
        for(let j = 2; j < 12; j++)
            paths[i][j] = 'x';
        for(let j = 14; j < 24; j++)
            paths[i][j] = 'x';
    }
}

function initVillagers()
{
    for(let i = 0; i < VILLAGER_COUNT; i++)
    {
        let villager = new Villager(villagers, paths);
        villagers.push(villager);
    }

    // sort by y position
    villagers.sort(function(a, b) {
        return a.position.y - b.position.y;
    });
}

function initFacilities()
{
    let padding = 10;

    facilities["water"].label = "water";
    facilities["water"].labelColor = "#33CCFF";
    facilities["water"].interactBox = {x: 176 - padding, y: 112 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

    facilities["farming"].label = "farming";
    facilities["farming"].labelColor = "#00CC33";
    facilities["farming"].interactBox = {x: 368 - padding, y: 112 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

    facilities["education"].label = "education";
    facilities["education"].labelColor = "#FFCC66";
    facilities["education"].interactBox = {x: 176 - padding, y: 240 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

    facilities["housing"].label = "housing";
    facilities["housing"].labelColor = "#FF6666";
    facilities["housing"].interactBox = {x: 368 - padding, y: 240 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};
}

function initItems()
{
    ITEMS.cucumberSeed = new Seed("cucumber seed", "cucumber_seed", ITEMS.cucumber);
    ITEMS.tomatoSeed = new Seed("tomato seed", "tomato_seed", ITEMS.tomato);
    ITEMS.potatoSeed = new Seed("potato seed", "potato_seed", ITEMS.potato);
    ITEMS.carrotSeed = new Seed("carrot seed", "carrot_seed", ITEMS.carrot);

    inventory.push(new ItemStack(ITEMS.cucumberSeed, 4));
    inventory.push(new ItemStack(ITEMS.tomatoSeed, 4));
    inventory.push(new ItemStack(ITEMS.potatoSeed, 4));
    inventory.push(new ItemStack(ITEMS.carrotSeed, 4));
    // inventory.push(new ItemStack(ITEMS.cucumber, 4));
    // inventory.push(new ItemStack(ITEMS.tomato, 4));
    // inventory.push(new ItemStack(ITEMS.potato, 4));
    // inventory.push(new ItemStack(ITEMS.carrot, 4));
    // inventory.push(new ItemStack(ITEMS.apple, 4));
    // inventory.push(new ItemStack(ITEMS.wood, 4));
    // inventory.push(new ItemStack(ITEMS.brick, 4));
    // inventory.push(new ItemStack(ITEMS.steel, 4));
}

function initFarmland()
{
    let startingAmount = 8;

    for(let i = 0; i < FARMLAND_COUNT; i++)
    {
        let farmland = new Farmland(i < startingAmount ? FARMLAND_UNLOCKED : FARMLAND_LOCKED);
        farmland.interactBox = {
            x: 16 * (i % 8 + 23),
            y: 16 * (Math.floor(i / 8) + 7),
            width: 16,
            height: 16
        }
        farmland.label = "empty";
        farmland.id = i;
        farm.push(farmland);
    }
}

function initTrees()
{
    for(let i = 0; i < TREE_COUNT; i++)
    {
        let tree = new Tree();
        tree.interactBox = {
            x: 16 * (i % 8 + 23),
            y: 16 * (Math.floor(i / 8) + 3),
            width: 16,
            height: 16
        }
        tree.label = "?";
        trees.push(tree);
    }
}

// calculations ////////////////////////////////////////////////////////////////

function addProgress(facility, amount)
{
    facility.progress += amount;
    if(facility.progress > facility.progressMax)
        facility.progress = facility.progressMax;
}

function updateFacilityProgress()
{
    villagers.forEach(villager => {
        
        let baseProgress, leastEffectiveMult, mostEffectiveMult = 0;

        switch(facilities["education"].level)
        {
            case 1:
                baseProgress = 2;
                leastEffectiveMult = 0.75;
                mostEffectiveMult = 1.5;
                break;
            case 2:
                baseProgress = 3;
                leastEffectiveMult = 0.8;
                mostEffectiveMult = 1.6;
                break;
            case 3:
                baseProgress = 4;
                leastEffectiveMult = 0.85;
                mostEffectiveMult = 1.7;
                break;
            case 4:
                baseProgress = 5;
                leastEffectiveMult = 0.9;
                mostEffectiveMult = 1.85;
                break;
            case 5:
                baseProgress = 8;
                leastEffectiveMult = 1;
                mostEffectiveMult = 2;
                break;
            default:
                break;
        }

        if(!villager.currentTask) return;

        if(villager.currentTask == villager.mostEffectiveTask)
            addProgress(facilities[villager.currentTask], baseProgress * mostEffectiveMult);

        else if(villager.currentTask == villager.leastEffectiveTask)
            addProgress(facilities[villager.currentTask], baseProgress * leastEffectiveMult);

        else
            addProgress(facilities[villager.currentTask], baseProgress);

    });
}

function updateCropGrowth()
{
    farm.forEach((farmland) => {
        if(farmland.daysLeft > 0)
        {
            farmland.daysLeft--;
            if(farmland.daysLeft == 0)
                farmland.label = "ready";
            else
                farmland.label = farmland.daysLeft + " days";
        }
    });
}

function updateVillagers()
{
    villagers.forEach(villager => {
        
        // update happiness based on hunger, except for day 1
        if(day > 1)
        {
            if(villager.hunger == 5)
                villager.happiness += 5;
            else if(villager.hunger == 2 || villager.hunger == 1)
                villager.happiness -= 5;
            else if(villager.hunger == 0)
                villager.happiness -= 10;
        }

        // subtract hunger
        if(villager.hunger > 0) villager.hunger--;

        villager.fed = false;

    });
}

function nextDay()
{
    updateCropGrowth();
    updateVillagers();
    updateFacilityProgress();

    // increment day
    day++;
    daysUntilNextSeason--;
}

initPaths();
initVillagers();
initFacilities();
initItems();
initFarmland();
initTrees();

io.on("connection", (socket) => {
    console.log("connected: " + socket.id);
    socket.emit("day", day, daysUntilNextSeason);
    socket.emit("season", season);
    socket.emit("budget", budget);
    socket.emit("villagers", villagers);
    socket.emit("facilities", facilities);
    socket.emit("inventory", inventory);
    socket.emit("farm", farm);
    socket.emit("trees", trees, false);

    socket.on("host_game", () => {
        
    });

    socket.on("farm", (_farm) => {
        farm = _farm;
        socket.broadcast.emit("farm", farm);
    });

    socket.on("assign_villager", (_villager, _oldFacility, _newFacility) => {

        for(let i = 0; i < villagers.length; i++)
        {
            if(villagers[i].name == _villager.name)
            {
                villagers[i] = _villager;
                break;
            }
        }

        if(_oldFacility)
            facilities[_oldFacility.label] = _oldFacility;

        facilities[_newFacility.label] = _newFacility;

        io.sockets.emit("villagers", villagers);
        io.sockets.emit("facilities", facilities);

    });

    socket.on("villager", (_villager) => {
        for(let i = 0; i < villagers.length; i++)
        {
            if(villagers[i].name == _villager.name)
            {
                villagers[i] = _villager;
                break;
            }
        }
    });

    socket.on("end_turn", () => {
        nextDay();

        io.sockets.emit("day", day, daysUntilNextSeason);
        io.sockets.emit("villagers", villagers);
        io.sockets.emit("facilities", facilities);
        io.sockets.emit("farm", farm);
    });
});

