const Villager = require("./Villager.js");
const Facility = require("./Facility.js");
const ItemStack = require("./ItemStack.js");
const Farmland = require("./Farmland.js");
const Tree = require("./Tree.js");

const {VILLAGER_COUNT, FARMLAND_COUNT, TREE_COUNT, FARMLAND_UNLOCKED, FARMLAND_LOCKED, ITEMS} = require("../global.js");

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
        this.day = 1;
        this.season = "spring";
        this.daysUntilNextSeason = 20;
        this.budget = 1600;

        this.villagers = [];
        this.paths = [...Array(22)].map(e => Array(26).fill('-'));

        this.farm = [];
        this.trees = [];

        this.facilities = {
            "water": new Facility(),
            "farming": new Facility(),
            "education": new Facility(),
            "housing": new Facility()
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
        for(let i = 0; i < VILLAGER_COUNT; i++)
        {
            let villager = new Villager(this.villagers, this.paths);
            this.villagers.push(villager);
        }

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
    }

    initItems()
    {
        this.inventory.push(new ItemStack(ITEMS.cucumberSeed, 4));
        this.inventory.push(new ItemStack(ITEMS.tomatoSeed, 4));
        this.inventory.push(new ItemStack(ITEMS.potatoSeed, 4));
        this.inventory.push(new ItemStack(ITEMS.carrotSeed, 4));
        // this.inventory.push(new ItemStack(ITEMS.cucumber, 4));
        // this.inventory.push(new ItemStack(ITEMS.tomato, 4));
        // this.inventory.push(new ItemStack(ITEMS.potato, 4));
        // this.inventory.push(new ItemStack(ITEMS.carrot, 4));
        // this.inventory.push(new ItemStack(ITEMS.apple, 4));
        // this.inventory.push(new ItemStack(ITEMS.wood, 4));
        // this.inventory.push(new ItemStack(ITEMS.brick, 4));
        // this.inventory.push(new ItemStack(ITEMS.steel, 4));
    }

    initFarmland()
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
            this.farm.push(farmland);
        }
    }

    initTrees()
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
            this.trees.push(tree);
        }
    }
};

module.exports = Game;