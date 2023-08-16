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

        this.npcPresent = {
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

        this.budget = 0;

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

    createVillager()    // return villager
    {
        let villager = new Villager(this.villagers, this.paths);
        this.villagers.push(villager);
        return villager;
    }

    initVillagers()
    {
        for(let i = 0; i < global.VILLAGER_COUNT; i++)
        {
            this.createVillager();
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

    initBudget()
    {
        switch(this.players.length)
        {
            case 1: this.budget = 2000; break;
            case 2: this.budget = 1600; break;
            case 3: this.budget = 1200; break;
            case 4: this.budget = 800; break;
            case 5: this.budget = 400; break;
            case 6: this.budget = 300; break;
            default: break;
        }
    }

    initInventory() // return array of items
    {
        let startingItems = [];

        let seeds = [global.ITEMS.cucumberSeed, global.ITEMS.tomatoSeed, global.ITEMS.potatoSeed, global.ITEMS.carrotSeed];
        let crops = [global.ITEMS.cucumber, global.ITEMS.tomato, global.ITEMS.potato, global.ITEMS.carrot];

        let numSeeds = 0;
        let numCrops = 0;

        switch(this.players.length)
        {
            case 1:
            case 2: numSeeds = 6; numCrops = 4; break;
            case 3: numSeeds = 4; numCrops = 4; break;
            case 4: numSeeds = 4; numCrops = 2; break;
            case 5: numSeeds = 3; numCrops = 2; break;
            case 6: numSeeds = 3; break;
            default: break;
        }

        for(let i = 0; i < numSeeds; i++)
        {
            let item = seeds[Math.floor(Math.random() * seeds.length)];
            startingItems.push(item);
        }

        for(let i = 0; i < numCrops; i++)
        {
            let item = crops[Math.floor(Math.random() * crops.length)];
            startingItems.push(item);
        }

        startingItems.push(global.ITEMS.steel);
        startingItems.push(global.ITEMS.steel);
        startingItems.push(global.ITEMS.steel);
        startingItems.push(global.ITEMS.steel);
        startingItems.push(global.ITEMS.brick);
        startingItems.push(global.ITEMS.brick);
        startingItems.push(global.ITEMS.brick);
        startingItems.push(global.ITEMS.brick);
        // this.inventory.push(new ItemStack(global.ITEMS.wood, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.brick, 4));
        // this.inventory.push(new ItemStack(global.ITEMS.steel, 4));

        return startingItems;
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
            farmland.amount = 2;
            this.farm.push(farmland);
        }

        this.updateFarmlandAmount();
    }

    initTrees()
    {
        for(let i = 0; i < global.TREE_COUNT; i++)
        {
            let tree = new Tree();

            tree.id = i;

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
        if(facility.label == "power")
        {
            facility.level++;
            return;
        }

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

        if(facility.label == "water" && facility.level < 5)
        {
            // unlock 8 farmland
            for(let i = 0; i < 8; i++)
                this.farm[(facility.level - 1) * 8 + i].locked = false;
        }

        if(facility.label == "farming")
            this.updateFarmlandAmount();
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

            let totalProgress = 0;

            if(villager.currentTask == villager.mostEffectiveTask)
                totalProgress = baseProgress * mostEffectiveMult;

            else if(villager.currentTask == villager.leastEffectiveTask)
                totalProgress = baseProgress * leastEffectiveMult;

            else
                totalProgress = baseProgress;

            if(this.event.id == "heat_stroke")
            {
                switch(this.facilities["education"].level)
                {
                    case 1: totalProgress *= 0.75; break;
                    case 2: totalProgress *= 0.8; break;
                    case 3: totalProgress *= 0.85; break;
                    case 4: totalProgress *= 0.9; break;
                    case 5: totalProgress *= 1; break;
                    default: break;
                }
            }
            
            this.addProgress(this.facilities[villager.currentTask], totalProgress);

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

    updateFarmlandAmount()
    {
        this.farm.forEach(farmland => {
            switch(this.facilities["farming"].level)
            {
                case 1: farmland.amount = 2; break;
                case 2: farmland.amount = 3; break;
                case 3: farmland.amount = 4; break;
                case 4: farmland.amount = 5; break;
                case 5: farmland.amount = 8; break;
                default: break;
            }
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

            // update happiness based on sickness
            if(villager.sick)
                villager.happiness -= 10;

            // update happiness based on task
            if(villager.currentTask == villager.mostFavoriteTask)
                villager.happiness += 2;
            else if(villager.currentTask == villager.leastFavoriteTask)
                villager.happiness -= 5;

            // subtract hunger
            if(villager.hunger > 0) villager.hunger--;

            villager.fed = false;

            // chance of sickness
            if(villager.currentTask != "power" && Math.random() < global.SICK_CHANCE)
            {
                villager.sick = true;
                villager.labelColor = "rgb(0,191,0)";
            }

        });
    }

    changeTurn()
    {
        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        if(!this.players[this.currentTurn].connected)
            this.changeTurn();
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

        // this.updateEvent();
    }
};

module.exports = Game;