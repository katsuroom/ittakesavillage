const Villager = require("./Villager.js");
const Facility = require("./Facility.js");
const ItemStack = require("./ItemStack.js");
const Farmland = require("./Farmland.js");
const Factory = require("./Factory.js");
const Tree = require("./Tree.js");

const global = require("../global.js");

class Game {

    static io = null;

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
        this.mutate = false;

        this.farm = [];
        this.trees = [];

        this.factory = new Factory();

        this.facilities = {
            "water": new Facility(20),
            "farming": new Facility(20),
            "education": new Facility(20),
            "housing": new Facility(20),
            "power": new Facility(10)
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
            let villager = this.createVillager();

            // assign quest
            let index = Math.floor(Math.random() * global.QUESTS.length);
            let quest = global.QUESTS[index];

            if(quest.type != "happiness")
                global.QUESTS.splice(index, 1);

            villager.quest = quest;
        }

        this.sortVillagers();

        // restore part of path
        for(let i = 1; i < 25; i++)
            this.paths[5][i] = '-';
    }

    sortVillagers()
    {
        // sort by y position
        this.villagers.sort(function(a, b) {
            return a.position.y - b.position.y;
        });
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

        // Object.values(this.facilities).forEach(facility => {
        //     facility.cost["brick"] = 3;
        //     facility.cost["steel"] = 0;
        // });
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
            case 1: this.budget = 1600; break;
            case 2: this.budget = 1200; break;
            case 3: this.budget = 800; break;
            case 4: this.budget = 400; break;
            case 5: this.budget = 300; break;
            case 6: this.budget = 150; break;
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

        // startingItems.push(global.ITEMS.steel);
        // startingItems.push(global.ITEMS.steel);
        // startingItems.push(global.ITEMS.steel);
        // startingItems.push(global.ITEMS.steel);
        // startingItems.push(global.ITEMS.brick);
        // startingItems.push(global.ITEMS.brick);
        // startingItems.push(global.ITEMS.brick);
        // startingItems.push(global.ITEMS.brick);

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

    initEvent()
    {
        this.event = global.EVENTS["cloudy_day"];
        this.event.duration = 3;
        this.nextEvent = this.getNextEvent();
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
                facility.progressMax = 30;
                // facility.cost["brick"] = 5;
                // facility.cost["steel"] = 1;
                break;
            case 3:
                facility.progressMax = 50;
                // facility.cost["brick"] = 8;
                // facility.cost["steel"] = 2;
                break;
            case 4:
                facility.progressMax = 80;
                // facility.cost["brick"] = 10;
                // facility.cost["steel"] = 5;
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
        if(this.facilities["power"].assignedVillagers.length == 0)
            return;

        this.villagers.forEach(villager => {
            
            if(!villager.currentTask) return;

            if(villager.currentTask == "power") return;

            if(this.facilities[villager.currentTask].level >= 5) return;

            let baseProgress = 2;
            let leastEffectiveMult, mostEffectiveMult = 0;

            switch(this.facilities["education"].level)
            {
                case 1:
                    leastEffectiveMult = 0.75;
                    mostEffectiveMult = 1.25;        // 1.5
                    break;
                case 2:
                    leastEffectiveMult = 0.9;
                    mostEffectiveMult = 1.5;        // 1.6
                    break;
                case 3:
                    leastEffectiveMult = 1;
                    mostEffectiveMult = 1.75;        // 1.7
                    break;
                case 4:
                    leastEffectiveMult = 1.25;
                    mostEffectiveMult = 2;       // 1.85
                    break;
                case 5:
                    leastEffectiveMult = 1.5;
                    mostEffectiveMult = 2.5;          // 2
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

                // if not fed
                if(!villager.fed)
                    villager.happiness -= 5;
            }

            // update happiness based on sickness
            if(villager.sick)
                villager.happiness -= 10;

            // update happiness based on task
            if(villager.currentTask == villager.mostFavoriteTask)
                villager.happiness += 2;
            else if(villager.currentTask == villager.leastFavoriteTask)
                villager.happiness -= 5;

            if(villager.happiness > 100)
                villager.happiness = 100;

            // subtract hunger
            if(villager.hunger > 0) villager.hunger--;

            villager.fed = false;

            // chance of sickness
            if(villager.currentTask != "power" && global.SICK_CHANCE > 0)
            {
                let sick = false;
                if(villager.hunger == 0)
                    sick = Math.random() < global.HUNGRY_SICK_CHANCE;
                else
                    sick = Math.random() < global.SICK_CHANCE;

                if(sick)
                {
                    villager.sick = true;
                    villager.labelColor = "rgb(0,191,0)";
                }
            }

            // mutation
            

        });
    }

    mutateVillagers()
    {
        if(this.day != 1 && this.day % global.MUTATION_FREQUENCY == 1)
        {
            this.mutate = true;

            this.villagers.forEach(villager => {
                let mutationChance = 0.25;

                if(Math.random() < mutationChance)
                {
                    villager.mostEffectiveTask = Villager.generateTask();
                    villager.leastEffectiveTask = Villager.generateLeastEffectiveTask(villager.mostEffectiveTask);
                }

                else if(Math.random() < mutationChance)
                {
                    villager.mostFavoriteTask = Villager.generateTask();
                    villager.leastFavoriteTask = Villager.generateLeastFavoriteTask(villager.mostFavoriteTask);
                }

                else if(Math.random() < mutationChance)
                {
                    villager.favoriteFood = Villager.generateFavoriteFood();
                }
            });
        }
    }

    checkQuest()
    {
        this.villagers.forEach(villager => {
            if(villager.quest)
            {
                let completed = false;

                switch(villager.quest.type)
                {
                    case "happiness":
                        completed = villager.happiness >= villager.quest.targetValue;
                        break;
                    case "water":
                    case "farming":
                    case "education":
                    case "housing":
                        completed = this.facilities[villager.quest.type].level >= villager.quest.targetValue;
                        break;
                    default:
                        break;
                }

                if(completed)
                {
                    let currentPlayer = this.players[this.currentTurn];
                    currentPlayer.questsComplete++;

                    Game.io.sockets.to(currentPlayer.id).emit("give_item", global.ITEMS.steel, 2);
                    this.players.forEach(player => Game.io.sockets.to(player.id).emit("quest_complete", villager, currentPlayer.name));
                    villager.quest = null;
                    this.players.forEach(player => Game.io.sockets.to(player.id).emit("villager", villager));
                }
            }
        });
    }

    changeTurn()
    {
        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        if(!this.players[this.currentTurn].connected)
            this.changeTurn();
    }

    removeVillagerFromFacility(villager)
    {
        if(villager.currentTask)
        {
            let oldFacility = this.facilities[villager.currentTask];

            for(let i = 0; i < oldFacility.assignedVillagers.length; i++)
            {
                if(oldFacility.assignedVillagers[i] == villager.name)
                {
                    oldFacility.assignedVillagers.splice(i, 1);
                    break;
                }
            }
        }
    }

    villagerFlee(villager)
    {
        this.paths[villager.position.y][villager.position.x] = "-";
    }

    villagerSick(villager)
    {
        villager.sick = true;
        villager.labelColor = "rgb(0,191,0)";
    }

    villagerHeal(villager)
    {
        villager.sick = false;
        villager.labelColor = "white";
    }

    checkDeathConditions() // return bool
    {
        let totalHappiness = 0;
        this.villagers.forEach(villager => totalHappiness += villager.happiness);

        let avgHappiness = totalHappiness / this.villagers.length;

        return avgHappiness <= global.DEATH_THRESHOLD;
    }

    eventStart(event)
    {
        switch(event.id)
        {
            case "harvest":
                {
                    let numCrops = Math.floor(7 - this.players.length * 0.5);
                    let crops = [global.ITEMS.cucumber, global.ITEMS.tomato, global.ITEMS.potato, global.ITEMS.carrot];

                    this.players.forEach(player => {
                        for(let i = 0; i < numCrops; i++)
                        {
                            let item = crops[Math.floor(Math.random() * crops.length)];
                            Game.io.sockets.to(player.id).emit("give_item", item, 1);
                        }
                    });
                    
                    break;
                }
            case "rainy_day":
                {
                    this.players.forEach(player => {
                        Game.io.sockets.to(player.id).emit("set_variable", "cropGrowthModifier", -1);
                    });
                    break;
                }
            case "free_cake":
                {
                    let villager = this.createVillager();
                    this.sortVillagers();
                    break;
                }
            case "black_friday":
                {
                    this.players.forEach(player => {
                        Game.io.sockets.to(player.id).emit("set_variable", "priceMultiplier", 0.5);
                    });
                    break;
                }
            case "summer_day":
                {
                    global.SICK_CHANCE *= -1;
                    this.villagers.forEach(villager => this.villagerHeal(villager));
                    break;
                }
            case "drought":
                {
                    let droughtChance = 0;
                    switch(this.facilities["water"].level)
                    {
                        case 1: droughtChance = 0.6; break;
                        case 2: droughtChance = 0.45; break;
                        case 3: droughtChance = 0.3; break;
                        case 4: droughtChance = 0.15; break;
                        case 5: droughtChance = 0; break;
                        default: break;
                    }

                    this.farm.forEach(farmland => {
                        if(Math.random() < droughtChance)
                        {
                            farmland.crop = null;
                            farmland.label = "empty";
                        }
                    });

                    break;
                }
            case "disease":
                {
                    let diseaseChance = 0;
                    switch(this.facilities["water"].level)
                    {
                        case 1: diseaseChance = 0.2; break;
                        case 2: diseaseChance = 0.15; break;
                        case 3: diseaseChance = 0.1; break;
                        case 4: diseaseChance = 0.05; break;
                        case 5: diseaseChance = 0; break;
                        default: break;
                    }

                    this.villagers.forEach(villager => {
                        if(Math.random() < diseaseChance)
                            this.villagerSick(villager);
                    });

                    break;
                }
            case "flood":
                {
                    Object.values(this.facilities).forEach(facility => {
                        facility.progress -= global.FLOOD_DAMAGE;
                        if(facility.progress < 0)
                            facility.progress = 0;
                    });
                }
            default: break;
        }
    }

    eventUpdate(event)
    {
        // console.log("update");
        // for events that have effects every day while action
    }

    eventEnd(event)
    {
        switch(event.id)
        {
            case "rainy_day":
                {
                    this.players.forEach(player => {
                        Game.io.sockets.to(player.id).emit("set_variable", "cropGrowthModifier", 0);
                    });
                    break;
                }
            case "black_friday":
                {
                    game.players.forEach(player => {
                        Game.io.sockets.to(player.id).emit("set_variable", "priceMultiplier", 1);
                    });
                    break;
                }
            case "summer_day":
                {
                    global.SICK_CHANCE *= -1;
                    break;
                }
            case "death":
                {
                    if(this.checkDeathConditions())
                    {
                        let index = Math.floor(Math.random() * this.villagers.length);
                        let villager = this.villagers[index];
                        this.removeVillagerFromFacility(villager);

                        this.villagers.splice(index, 1);
                        this.villagerFlee(villager);

                        this.players.forEach(player => {
                            Game.io.sockets.to(player.id).emit("villager_flee", villager);
                            Game.io.sockets.to(player.id).emit("paths", this.paths);
                        });
                    }
                    break;
                }
            default: break;
        }
    }

    updateEvent()
    {
        this.event.duration--;

        if(this.event.duration == 0)
        {
            this.eventEnd(this.event);

            // switch to next event
            
            if(this.facilities["power"].level > 1)
            {
                let duration = this.nextEvent.duration;
                this.event = global.EVENTS.cloudy_day.clone();
                this.event.duration = duration;

                this.facilities["power"].level = 1;
                this.facilities["power"].progress = 0;
            }
            else
                this.event = this.nextEvent;

            this.eventStart(this.event);

            // set next event
            this.nextEvent = this.getNextEvent();
        }
        else
            this.eventUpdate(this.event);
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

        while(true)
        {
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

            if(event.id != "death")
                break;
            else
            {
                // prevents consecutive death events
                if(this.event.id != "death" && this.checkDeathConditions())
                    break;
            }
        }

        event.duration = Math.floor(Math.random() * (global.EVENT_DURATION_MAX - global.EVENT_DURATION_MIN + 1))
            + global.EVENT_DURATION_MIN;
        return event;
    }

    updateSeason()
    {
        if(this.daysUntilNextSeason == 0)
        {
            for(let i = 0; i < global.SEASONS.length; i++)
            {
                if(global.SEASONS[i].name == this.season)
                {
                    if(i < global.SEASONS.length - 1)
                    {
                        this.season = global.SEASONS[i+1].name;
                        this.daysUntilNextSeason = global.SEASONS[i+1].days;
                    }
                    if(i < global.SEASONS.length - 2)
                        this.nextSeason = global.SEASONS[i+2].name;
                    
                    break;
                }
            }
        }
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

        this.mutateVillagers();
        this.updateSeason();

        // check for happiness quest completion
        this.checkQuest();

        this.updateEvent();
    }
};

module.exports = Game;