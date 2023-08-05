const Villager = require("./Villager.js");
const Facility = require("./Facility.js");
const ItemStack = require("./ItemStack.js");
const Farmland = require("./Farmland.js");
const Factory = require("./Factory.js");
const Tree = require("./Tree.js");

const global = require("../global.js");

class Game {
    constructor(roomId)
    {
        // lobby info
        this.roomId = roomId;

        this.players = [];
        this.started = false;

        this.rolesPresent = {
            "chief": false,
            "doctor": false,
            "scientist": false,
            "sociologist": false,
            "farmer": false,
            "engineer": false
        };


        // game variables

        this.currentTurn = 0;

        this.day = 1;
        this.season = "spring";
        this.nextSeason = "summer";
        this.daysUntilNextSeason = 20;

        this.event = null;
        this.nextEvent = null;

        this.budget = 1600;

        this.villagers = [];
        this.paths = [...Array(22)].map(e => Array(26).fill('-'));

        this.farm = [];
        this.trees = [];

        this.factory = new Factory();

        this.facilities = {
            "water": new Facility(50),
            "farming": new Facility(50),
            "education": new Facility(50),
            "housing": new Facility(50),
            "power": new Facility(20)
        };

        this.inventory = [];
    }

    initPaths()
    {
        for(let i = 0; i < 26; i++)
        {
            this.paths[0][i] = 'x';
            this.paths[21][i] = 'x';
        }

        for(let i = 1; i < 22; i++)
        {
            this.paths[i][0] = 'x';
            this.paths[i][25] = 'x';
        }

        // for(let i = 2; i < 5; i++)
        // {
        //     for(let j = 9; j < 12; j++)
        //         this.paths[i][j] = 'x';
        //     for(let j = 14; j < 24; j++)
        //         this.paths[i][j] = 'x';
        // }

        for(let i = 1; i < 6; i++)
        {
            for(let j = 1; j < 25; j++)
                this.paths[i][j] = 'x';
        }
            
        for(let i = 6; i < 12; i++)
        {
            for(let j = 2; j < 12; j++)
                this.paths[i][j] = 'x';
            for(let j = 14; j < 24; j++)
                this.paths[i][j] = 'x';
        }

        for(let i = 14; i < 20; i++)
        {
            for(let j = 2; j < 12; j++)
                this.paths[i][j] = 'x';
            for(let j = 14; j < 24; j++)
                this.paths[i][j] = 'x';
        }
    }

    initVillagers()
    {
        for(let i = 0; i < global.VILLAGER_COUNT; i++)
        {
            let villager = new Villager(this.villagers, this.paths);
            this.villagers.push(villager);
        }

        this.sortVillagers();

        // restore part of path
        for(let i = 1; i < 25; i++)
            this.paths[5][i] = '-';
    }

    initFacilities()
    {
        let padding = 10;

        this.facilities["water"].label = "water";
        this.facilities["water"].labelColor = "#33CCFF";
        this.facilities["water"].interactBox = {x: 176 - padding, y: 112 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

        this.facilities["farming"].label = "farming";
        this.facilities["farming"].labelColor = "#00CC33";
        this.facilities["farming"].interactBox = {x: 368 - padding, y: 112 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

        this.facilities["education"].label = "education";
        this.facilities["education"].labelColor = "#FFCC66";
        this.facilities["education"].interactBox = {x: 176 - padding, y: 240 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

        this.facilities["housing"].label = "housing";
        this.facilities["housing"].labelColor = "#FF6666";
        this.facilities["housing"].interactBox = {x: 368 - padding, y: 240 - padding, width: 128 + 2 * padding, height: 64 + 2 * padding};

        this.facilities["power"].label = "power";
        this.facilities["power"].labelColor = "#FFFF00";
        this.facilities["power"].interactBox = {x: 16*16, y: 16*2, width: 64, height: 16*3};

        Object.values(this.facilities).forEach(facility => {
            facility.cost["brick"] = 3;
            facility.cost["steel"] = 0;
        });
    }

    initFactory()
    {
        this.factory.interactBox.x = 16*13;
        this.factory.interactBox.y = 16*15.5;
        this.factory.interactBox.width = 16*4;
        this.factory.interactBox.height = 16*3;
    }

    initInventory()
    {
        this.inventory.push(new ItemStack(global.ITEMS.cucumberSeed, 4));
        this.inventory.push(new ItemStack(global.ITEMS.tomatoSeed, 4));
        this.inventory.push(new ItemStack(global.ITEMS.potatoSeed, 4));
        this.inventory.push(new ItemStack(global.ITEMS.carrotSeed, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.cucumber, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.tomato, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.potato, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.carrot, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.apple, 4));
        this.inventory.push(new ItemStack(global.ITEMS.wood, 4));
        this.inventory.push(new ItemStack(global.ITEMS.brick, 4));
        this.inventory.push(new ItemStack(global.ITEMS.steel, 4));
    }

    initFarmland()
    {
        let startingAmount = 8;

        for(let i = 0; i < global.FARMLAND_COUNT; i++)
        {
            let farmland = new Farmland(i < startingAmount ? global.FARMLAND_UNLOCKED : global.FARMLAND_LOCKED);
            farmland.interactBox = {
                x: 16 * (i % 8 + 23),
                y: 16 * (Math.floor(i / 8) + 7),
                width: 16,
                height: 16
            }
            farmland.label = "empty";
            farmland.id = i;
            this.farm.push(farmland);
        }
    }

    initTrees()
    {
        for(let i = 0; i < global.TREE_COUNT; i++)
        {
            let tree = new Tree();

            tree.id = i;

            if(this.rolesPresent["scientist"])
                tree.label = "tree";
            else
                tree.label = "?";
            this.trees.push(tree);
        }
    }

    sortVillagers()
    {
        // sort by y position
        this.villagers.sort(function(a, b) {
            return a.position.y - b.position.y;
        });
    }

    // actions

    pickTree(treeId)
    {
        let tree = this.trees.find(tree => tree.id == treeId);
        tree.daysLeft = global.TREE_GROWTH_TIME;
    }

    cutTree(treeId)
    {
        let tree = this.trees.find(tree => tree.id == treeId);
        tree.daysLeft = 0;
        tree.cut = true;
    }

    upgradeFacility(facility)
    {
        facility.progress = 0;
        facility.level++;
        switch(facility.level)
        {
            case 2:
                facility.progressMax = 80;
                facility.cost["brick"] = 5;
                facility.cost["steel"] = 1;
                break;
            case 3:
                facility.progressMax = 100;
                facility.cost["brick"] = 8;
                facility.cost["steel"] = 2;
                break;
            case 4:
                facility.progressMax = 100;
                facility.cost["brick"] = 10;
                facility.cost["steel"] = 5;
                break;
            case 5:
                break;
            default:
                break;
        }
    }

    // calculations

    addProgress(facility, amount)
    {
        facility.progress += amount;
        if(facility.progress > facility.progressMax)
            facility.progress = facility.progressMax;
    }

    updateFacilityProgress()
    {
        this.villagers.forEach(villager => {
            
            if(!villager.currentTask) return;

            if(villager.currentTask == "power") return;

            let baseProgress, leastEffectiveMult, mostEffectiveMult = 0;

            switch(this.facilities["education"].level)
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

            if(villager.currentTask == villager.mostEffectiveTask)
                this.addProgress(this.facilities[villager.currentTask], baseProgress * mostEffectiveMult);

            else if(villager.currentTask == villager.leastEffectiveTask)
                this.addProgress(this.facilities[villager.currentTask], baseProgress * leastEffectiveMult);

            else
                this.addProgress(this.facilities[villager.currentTask], baseProgress);

        });
    }

    updateFactory()
    {
        this.factory.brickProgress += this.facilities["education"].assignedVillagers.length;
        
        this.factory.bricks += Math.floor(this.factory.brickProgress / 10);
        this.factory.brickProgress = this.factory.brickProgress % 10;
    }

    updateCropGrowth()
    {
        this.farm.forEach((farmland) => {
            if(farmland.daysLeft > 0)
            {
                farmland.daysLeft--;
                if(farmland.daysLeft == 0)
                    farmland.label = "ready";
                else
                    farmland.label = farmland.daysLeft + " days";
            }
        });

        this.trees.forEach((tree) => {
            if(tree.daysLeft > 0)
                tree.daysLeft--;
        });
    }

    updateVillagers()
    {
        this.villagers.forEach(villager => {
            
            // update happiness based on hunger, except for day 1
            if(this.day > 1)
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

            // chance of sickness
            if(Math.random() < global.SICK_CHANCE)
            {
                villager.sick = true;
                villager.labelColor = "rgb(0,191,0)";
            }

        });
    }

    updateEvent()
    {
        this.event.duration--;

        if(this.event.duration == 0)
        {
            // switch to next event
            this.event = this.nextEvent;

            // set next event
            this.nextEvent = this.getNextEvent();
        }
    }

    getNextEvent()
    {
        // calculate season for next event
        let dayCount = this.day + this.event.duration;

        if(dayCount > 60) return null;

        let season = "";

        for(let i = 0; i < global.SEASONS.length; i++)
        {
            dayCount -= global.SEASONS[i].days;
            if(dayCount <= 0)
            {
                season = global.SEASONS[i].name;
                break;
            }
        }

        // get event from event table
        let event = null;

        switch(season)
        {
            case "spring":
                event = global.EVENTS_SPRING.getItem();
                break;
            case "summer":
                event = global.EVENTS_SUMMER.getItem();
                break;
            case "autumn":
                event = global.EVENTS_AUTUMN.getItem();
                break;
            case "winter":
                event = global.EVENTS_WINTER.getItem();
                break;
            default:
                break;
        }

        event.duration = 3;
        return event;
    }

    nextDay()
    {
        this.updateFactory();
        this.updateCropGrowth();
        this.updateVillagers();
        this.updateFacilityProgress();

        // increment day
        this.day++;
        this.daysUntilNextSeason--;

        this.updateEvent();

        // change player turn
        this.currentTurn = (this.currentTurn + 1) % this.players.length;
    }
};

module.exports = Game;