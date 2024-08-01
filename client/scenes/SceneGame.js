import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import {img, audio} from "../assets.js";

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";
import { ItemStack } from "../src/ItemStack.js";
import { Animation } from "../src/Animation.js";

import { Notification } from "../src/Notification.js";
import { NotificationSeason } from "../src/NotificationSeason.js";
import { NotificationEvent } from "../src/NotificationEvent.js";
import { NotificationArrival } from "../src/NotificationArrival.js";
import { NotificationFlee } from "../src/NotificationFlee.js";
import { NotificationQuest } from "../src/NotificationQuest.js";
import { DayNotification } from "../src/DayNotification.js";


// game variables ////////////////////////////////////////////////////////////////

const INVENTORY_SIZE = 32;                  // number of slots for inventory
const UPGRADE_MATERIAL_COST = 10;           // price for upgrading material
const HEAL_VILLAGER_COST = 40;              // price for healing a sick villager
const CROP_GROWTH_TIME = 3;                 // default number of days for crops to grow
const APPLE_HAPPINESS_BOOST = 10;           // number of happiness given by feeding an apple
const FERTILIZED_BONUS = 3;                 // number of extra crops given by fertilized farmland
const HARVEST_SEED_CHANCE = 0;              // probability for harvesting a crop to give its matching seed, formerly 0.1
const ACTION_POINTS = 8;                    // number of action points per day

let maxVillagers = 8;

let ACTION_COST = {
    UPGRADE_FACILITY: 4,
    PLANT_CROP: 1,
    HARVEST_CROP: 1,
    PICK_TREE: 1,
    CUT_TREE: 1,
    ASSIGN_VILLAGER: 1,
    HEAL_VILLAGER: 1,
    USE_MATERIAL: 1,
    SKILL: 6
};

let currentTurn = 0;
let actionPoints = 0;
let skillUsed = false;                  // whether or not skill has been used this turn

let day = 0;
let season = "";
let nextSeason = "";
let daysUntilNextSeason = 0;

let event = null;
let nextEvent = null;

let budget = 0;

let villagers = [];             // array of all villagers
let paths = [];
let movingVillager = null;      // villager being moved

let facilities = {};            // dictionary of each of the 4 facilities
let farm = [];                  // array of available farmland

let treesUnlocked = false;      // whether or not trees are unlocked
let trees = [];                 // array of apple trees

let shop = [];                  // array of shop items

let dailyLoot = [];             // array of available loot items
let lootAmount = 0;

let upgrades = 0;


// role specific

let healChances = 0;            // doctor
let reputation = 0;             // chief only
let displayHappiness = false;   // sociologist only



// event variarbles

let cropGrowthModifier = 0;     // + number of days for crops to grow
let priceMultiplier = 1;        // multiplier for shop items


// ui ////////////////////////////////////////////////////////////////

let musicOn = false;
let soundOn = true;

const ACTION_STATES = {
    NORMAL: 0,
    SELECT_FARMLAND: 1,
    SELECT_VILLAGER: 2
};

let actionState = ACTION_STATES.NORMAL;


const INVENTORY_BOX_SIZE = 2.5;
const INVENTORY_BOX_MARGIN = 0.1;

const INVENTORY_STATES = {
    NORMAL: 0,
    SELLING: 1,
    UPGRADING: 2
};

let inventoryState = INVENTORY_STATES.NORMAL;

let heldItemStack = null;           // currently held item stack
let assigningVillager = null;        // currently selected villager for assigning

let infoSelected = null;            // current selected Interactable object in info panel
let labelSelected = null;           // current highlighted Interactable object label

let windowStack = ["main"];         // stack of open windows

let notifications = [];             // list of notification cards
let currentNotif = null;            // currently displayed notification

// let notificationBox = {x: 16*8, y: 16*8, width: 16*26, height: 16*6}
let notificationBox = {x: 16*34, y: 16*8, width: 0, height: 16*6}

let rainAnimation = new Animation([img.rain0, img.rain1], 15);
let cloudShadows = [];

let powerOnFrames = [];
for(let i = 1; i <= 26; i++)
    powerOnFrames.push(img["power_on_" + i]);

let powerOnAnimation = new Animation(powerOnFrames, 5);

// buttons ////////////////////////////////////////////////////////////////

const buttons = {
    skill: new Button(38.25*16, 16.5*16, 2.75*16, 2*16, "blue", "skill"),
    shop: new Button(35*16, 16.5*16, 2.75*16, 2*16, "green", "shop"),
    endTurn: new Button(35*16, 19*16, 6*16, 2*16, "pink", "end turn"),

    music: new Button(35*16, 14.5*16, 16*1.5, 16*1.5, "red", "🎵"),
    sound: new Button(36.5*16, 14.5*16, 16*1.5, 16*1.5, "red", "🔊"),
    inventory: new Button(38*16, 14.5*16, 16*1.5, 16*1.5, "red", "🎁"),
    help: new Button(39.5*16, 14.5*16, 16*1.5, 16*1.5, "red", "❔"),

    assignVillager: new Button(1*16, 17.75*16, 6*16, 1.5*16, "orange", "assign"),
    healVillager: new Button(1*16, 19.5*16, 6*16, 1.5*16, "blue", "heal"),
    
    harvestCrop: new Button(1*16, 16*16, 6*16, 1.5*16, "green", "harvest"),
    
    pickTree: new Button(1*16, 16*16, 6*16, 1.5*16, "green", "pick apple"),
    cutTree: new Button(1*16, 17.75*16, 6*16, 1.5*16, "red", "cut"),

    upgradeMaterial: new Button(22.5*16, 7.25*16, 4*16, 1.5*16, "red", "🡅 $" + UPGRADE_MATERIAL_COST),
    sellItem: new Button(27*16, 7.25*16, 4*16, 1.5*16, "green", "sell"),
    upgradeFacility: new Button(1*16, 19.5*16, 6*16, 1.5*16, "red", "upgrade")
};

// socket messages ////////////////////////////////////////////////////////////////

socket.on("change_turn", (_currentTurn) => {
    currentTurn = _currentTurn;
    actionPoints = ACTION_POINTS;
    skillUsed = false;
    refreshSkillButton();

    buttons.endTurn.enabled = isCurrentTurn();
    refreshAssignButton();
    refreshUpgradeFacilityButton();

    buttons.harvestCrop.enabled = isCurrentTurn();
    buttons.pickTree.enabled = isCurrentTurn();
    buttons.cutTree.enabled = isCurrentTurn();

    refreshInventoryButtons();

    if(role == "doctor")
    {
        switch(facilities["housing"].level)
        {
            case 1: healChances = 2; break;
            case 2: healChances = 3; break;
            case 3: healChances = 3; break;
            case 4: healChances = 4; break;
            case 5: healChances = 5; break;
            default: break;
        }
    }
    else
        healChances = (rolesPresent["doctor"] || npcPresent["doctor"]) ? 1 : 0;


    if(selectedInfoType("villager"))
        infoSelected = villagers.find(obj => obj.name == infoSelected.name);

    refreshHealButton();
});

socket.on("purchase_npc", (_npcs) => {
    npcPresent = _npcs;

    if(npcPresent["doctor"])
    {
        healChances = 1;
        refreshHealButton();
    }
    if(npcPresent["scientist"])
    {
        treesUnlocked = true;
        refreshTrees();
    }

    // remove NPC from shop
    for (const [npc, present] of Object.entries(npcPresent)) {
        if(present)
        {
            let index = shop.findIndex(shopItem => shopItem.id == "npc_" + npc);
            if(index != -1)
                shop.splice(index, 1);
        }
    }

    // closeShop();
    refreshShop();

});

socket.on("daily_loot", (_loot, amount) => {

    buttons.endTurn.enabled = false;

    if(getActiveWindow() == "notification")
        windowStack.splice(windowStack.length - 1, 0, "daily_loot");
    else
        windowStack.push("daily_loot");

    dailyLoot = _loot;
    lootAmount = amount;
});

socket.on("day", (_day, _daysUntilNextSeason) => {
    day = _day;
    daysUntilNextSeason = _daysUntilNextSeason;

    DayNotification.reset(day);
});

socket.on("season", (_season, _nextSeason) => {

    let currentSeason = season;

    season = _season;
    nextSeason = _nextSeason;

    if(season == "game end")
        gameOver("game end");

    if(currentSeason != season)
    {
        notifications.push(new NotificationSeason(season));
        triggerNotifications();  
    }
});

socket.on("event", (_event, _nextEvent) => {

    if(!event || event.duration == 1)
    {
        notifications.push(new NotificationEvent(_event, img["event_" + _event.id]));
        triggerNotifications();

        cloudShadows = [];

        if(_event.id == "cloudy_day")
        {
            for(let i = 0; i < 8; i++)
            {
                let x = Math.random() * 16*22 + (8*16);
                let y = Math.random() * 16*22;
                let type = Math.floor(Math.random() * (img.cloudShadows.width / 64 + 1));
                cloudShadows.push({x, y, type});
            }
        }
        else if(_event.id == "flood")
        {
            for(let i = 0; i < 8; i++)
            {
                let x = Math.random() * 16*22 + (8*16);
                let y = Math.random() * 16*22;
                let type = Math.floor(Math.random() * (img.puddles.width / 16 + 1));
                cloudShadows.push({x, y, type});
            }
        }
        
    }

    event = _event;
    nextEvent = _nextEvent;
});

socket.on("mutate", () => {
    notifications.push(new Notification("some villager stats have mutated", 2500));
    triggerNotifications();
});

socket.on("budget", (_budget) => {
    budget = _budget;
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

    if(selectedInfoType("villager"))
    {
        infoSelected = villagers.find(obj => obj.name == infoSelected.name);
        refreshHealButton();
    }
});

socket.on("villagers", (_villagers) => {
    // check for new villager arrival
    if(villagers.length > 0 && _villagers.length > villagers.length)
    {
        let newVillager = null;
        for(let i = 0; i < _villagers.length; i++)
        {
            if(villagers.find(villager => villager.name == _villagers[i].name) == null)
            {
                newVillager = _villagers[i];
                notifications.push(new NotificationArrival(newVillager));
                triggerNotifications();
                break;
            }
        }
    }

    villagers = _villagers;

    if(selectedInfoType("villager"))
        infoSelected = villagers.find(obj => obj.name == infoSelected.name);
});

socket.on("max_villagers", (_maxVillagers) => {
    maxVillagers = _maxVillagers;
});

socket.on("paths", (_paths) => {
    paths = _paths;
});

socket.on("facility", (_facility) => {
    facilities[_facility.label] = _facility;

    upgrades = facilities["water"].level + facilities["farming"].level + facilities["education"].level + facilities["housing"].level - 4;

    // win condition
    if(upgrades >= 12)
    {
        sm.loadScene(sm.SCENE.win);
        return;
    }

    if(selectedInfoType("facility"))
    {
        infoSelected = facilities[infoSelected.label];
        refreshUpgradeFacilityButton();
    }
});

socket.on("facilities", (_facilities) => {
    facilities = _facilities;

    if(selectedInfoType("facility"))
    {
        infoSelected = facilities[infoSelected.label];
        refreshUpgradeFacilityButton();
    }
});

socket.on("shop", (_shop) => {
    shop = _shop;
    
    refreshShop();
});

socket.on("add_shop_item", (_shopItem) => {
    for(let i = 0; i < shop.length; i++)
    {
        if(shop[i].id == _shopItem.id)
            return;
    }

    shop.push(_shopItem);
    refreshShop();
});

socket.on("farm", (_farm) => {
    farm = _farm;

    if(selectedInfoType("farmland"))
        infoSelected = farm.find(obj => obj.id == infoSelected.id);
});

socket.on("trees", (_trees, _treesUnlocked) => {
    trees = _trees;
    treesUnlocked = _treesUnlocked;

    refreshTrees();

    if(selectedInfoType("tree"))
    {
        infoSelected = trees.find(obj => obj.id == infoSelected.id);
        refreshPickTreeButton();
        refreshCutTreeButton();
    }
});

socket.on("give_item", (_item, _amount) => {
    giveItem(_item, _amount);
});

socket.on("heal_chances", (_healChances) => {
    healChances = _healChances;
});

socket.on("villager_flee", (_villager) => {
    notifications.push(new NotificationFlee(_villager));
    triggerNotifications();
});

socket.on("quest_complete", (_villager, _playerName) => {
    notifications.push(new NotificationQuest(_villager, _playerName, _playerName == playerName));
    triggerNotifications();
});

socket.on("inventory", (_inventory) => {
    inventory = _inventory;
});

socket.on("set_variable", (_var, _value) => {
    switch(_var)
    {
        case "cropGrowthModifier":
            cropGrowthModifier = _value;
            break;
        case "priceMultiplier":
            priceMultiplier = _value;
            break;
        default:
            break;
    }
});

socket.on("reputation", (_reputation) => {
    reputation = _reputation;
});


// event handlers ////////////////////////////////////////////////////////////////

function onClick(e)
{
    // sm.loadScene(sm.SCENE.win);         // debug

    if(buttonClick(buttons.music))
    {
        musicOn = !musicOn;
        musicOn ? audio.bgm.play() : audio.bgm.pause();
        playClickSound();
        return;
    }

    if(buttonClick(buttons.sound))
    {
        soundOn = !soundOn;
        playClickSound();
        return;
    }

    if(getActiveWindow() == "notification") return;

    if(buttonClick(buttons.endTurn))
    {
        endTurn();
        playClickSound();
        return;
    }

    if(buttonClick(buttons.shop))
    {
        if(getActiveWindow() == "shop")
            closeShop();
        else
            openShop();

        playClickSound();
        return;
    }

    if(buttonClick(buttons.skill))
    {
        closeInventory();
        useSkill();
        playClickSound();
        return;
    }

    if(buttonClick(buttons.inventory))
    {
        if(getActiveWindow() == "inventory")
            closeInventory();
        else
            openInventory();

        playClickSound();
    }


    if(selectedInfoType("farmland") && buttonClick(buttons.harvestCrop))
    {
        harvestCrop();
        playClickSound();
        return;
    }

    if(selectedInfoType("facility") && buttonClick(buttons.upgradeFacility))
    {
        useAction(ACTION_COST.UPGRADE_FACILITY);
        socket.emit("upgrade_facility", roomId, infoSelected);
        playClickSound();
        return;
    }

    if(selectedInfoType("villager"))
    {
        if(buttonClick(buttons.assignVillager))
        {
            startAssign();
            playClickSound();
            return;
        }
        else if(buttonClick(buttons.healVillager))
        {
            healVillager();
            playClickSound();
            return;
        }
        
    }

    if(selectedInfoType("tree"))
    {
        if(buttonClick(buttons.pickTree))
        {
            pickTree();
            playClickSound();
            return;
        }
        
        else if(buttonClick(buttons.cutTree))
        {
            cutTree();
            playClickSound();
            return;
        }
    }

    if(getActiveWindow() == "main")
    {
        let prevSelected = infoSelected;

        if(mouse.x > 8*16*SCALE && mouse.x < 34*16*SCALE)
            infoSelected = null;

        if(isHoldingFood())
        {
            let useItem = false;
            villagers.forEach(villager => {

                if(useItem || villager.fed || villager.hunger == 5) return;

                let obj = {
                    interactBox: {
                        x: (villager.position.x * 16 + 128),
                        y: (villager.position.y * 16 - 22),
                        width: 16,
                        height: 16
                    }
                };
    
                if(mouseInteract(obj))
                {
                    feedVillager(villager);
                    playClickSound();
                    useItem = true;
                }
            });

            if(useItem)
            {
                infoSelected = prevSelected;
                return;
            }
        }

        let useItem = false;

        if(!assigningVillager)
        {
            for(let i = 0; i < farm.length; i++)
            {
                let farmland = farm[i];
                if(!farmland.locked && mouseInteract(farmland))
                {
                    playClickSound();
                    if(actionState == ACTION_STATES.SELECT_FARMLAND)
                    {
                        farmland.fertilized = true;
                        actionState = ACTION_STATES.NORMAL;
                        useAction(ACTION_COST.SKILL);
                        skillUsed = true;
                        socket.emit("farm", roomId, farm);
                        return;
                    }
                    else if(!heldItemStack || farmland.crop)
                    {
                        infoSelected = farmland;
                        return;
                    }
                    else if(heldItemStack.item.type == "seed" && actionPoints >= ACTION_COST.PLANT_CROP)
                    {
                        infoSelected = prevSelected;
                        plantCrop(farmland);
                        useItem = true;
                        return;
                    }
                }
            }
        }

        if(!useItem)
        {
            Object.values(facilities).forEach(facility => {
                if(mouseInteract(facility))
                {
                    playClickSound();
                    if(assigningVillager)
                    {
                        finishAssign(facility);
                        infoSelected = prevSelected;
                    }
                    else if(heldItemStack && heldItemStack.item.type == "material" && actionPoints >= ACTION_COST.USE_MATERIAL)
                    {
                        useMaterial(facility);
                        infoSelected = facility;
                        refreshUpgradeFacilityButton();
                    }
                    else
                    {
                        infoSelected = facility;
                        refreshUpgradeFacilityButton();
                    }
                }
            });
        }
        
        if(infoSelected) return;

        villagers.forEach(villager => {
            if(mouseInteract(villager))
            {
                if(actionState == ACTION_STATES.SELECT_VILLAGER)
                {
                    if(role == "sociologist")
                    {
                        if(villager.leastFavoriteTask != "")
                        {
                            villager.leastEffectiveTask = "";
                            villager.leastFavoriteTask = "";
                            socket.emit("villager", roomId, villager);

                            actionState = ACTION_STATES.NORMAL;
                            useAction(ACTION_COST.SKILL);
                            skillUsed = true;
                        }
                    }

                    else if(role == "doctor")
                    {
                        if(!villager.immune)
                        {
                            villager.immune = true;
                            socket.emit("villager", roomId, villager);

                            actionState = ACTION_STATES.NORMAL;
                            useAction(ACTION_COST.SKILL);
                            skillUsed = true;
                        }
                    }
                    
                }

                if(assigningVillager)
                {
                    assigningVillager = null;
                    buttons.assignVillager.enabled = true;
                }
                playClickSound();
                infoSelected = villager;

                refreshHealButton();
            }
        });

        trees.forEach(tree => {
            if(mouseInteract(tree))
            {
                playClickSound();
                infoSelected = tree;

                if(actionState == ACTION_STATES.SELECT_FARMLAND && treesUnlocked && !tree.cut)
                {
                    tree.fertilized = true;
                    actionState = ACTION_STATES.NORMAL;
                    useAction(ACTION_COST.SKILL);
                    skillUsed = true;
                    socket.emit("trees", roomId, trees);
                    return;
                }

                refreshPickTreeButton();
                refreshCutTreeButton();
            }
        });

        if(infoSelected) return;

        // past this point: nothing was clicked

        if(actionState != ACTION_STATES.NORMAL)
        {
            actionState = ACTION_STATES.NORMAL;
            refreshSkillButton();
        }

        if(useItem)
        {
            infoSelected = prevSelected;
            return;
        }

        if(assigningVillager)
        {
            finishAssign(null);
            infoSelected = prevSelected;
            return;
        }

        if(heldItemStack)
        {
            heldItemStack = null;
            infoSelected = prevSelected;
            return;
        }
    }

    if(getActiveWindow() == "inventory")
    {
        if(!isCurrentTurn() || lootAmount > 0) return;

        if(buttonClick(buttons.sellItem))
        {
            inventoryState = INVENTORY_STATES.SELLING;
            refreshInventoryButtons();
            playClickSound();
            return;
        }

        if(buttonClick(buttons.upgradeMaterial))
        {
            inventoryState = INVENTORY_STATES.UPGRADING;
            refreshInventoryButtons();
            return;
        }

        for(let i = 0; i < inventory.length; i++)
        {
            const obj = {
                interactBox: {
                    x: 16*(11 + (i % 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN),
                    y: 16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN),
                    width: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN),
                    height: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN)
                }
            };

            if(mouseInteract(obj))
            {
                if(inventoryState == INVENTORY_STATES.NORMAL)
                {
                    heldItemStack = inventory[i];
                    closeInventory();
                }
                else if(inventoryState == INVENTORY_STATES.SELLING && inventory[i].item.type == "food")
                {
                    sellItem(inventory[i]);
                    playClickSound();
                    return;
                }
                else if(inventoryState == INVENTORY_STATES.UPGRADING && inventory[i].item.type == "material" && !inventory[i].item.upgraded)
                {
                    upgradeMaterial(inventory[i]);
                    playClickSound();
                }
            }
        }

        if(inventoryState != INVENTORY_STATES.NORMAL)
        {
            inventoryState = INVENTORY_STATES.NORMAL;
            refreshInventoryButtons();
        }
    }

    if(getActiveWindow() == "daily_loot")
    {
        let lootBoxWidth = 16*(2 + Math.min(dailyLoot.length, 8) * INVENTORY_BOX_SIZE);

        for(let i = 0; i < dailyLoot.length; i++)
        {
            if(dailyLoot[i])
            {
                const obj = {
                    interactBox: {
                        x: 16*(22 + (i % 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN) - lootBoxWidth/2,
                        y: 16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN),
                        width: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN),
                        height: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN)
                    }
                };

                if(mouseInteract(obj))
                {
                    collectLoot(i);
                    playClickSound();
                    break;
                }
            }
        }
    }

    if(getActiveWindow() == "shop")
    {
        for(let i = 0; i < shop.length; i++)
        {
            if(isCurrentTurn() && mouseInteract(shop[i]))
            {
                purchase(shop[i]);
                playClickSound();
                break;
            }
        }
    }
}

function onKeyDown(e)
{
    if(getActiveWindow() == "notification") return;

    switch(e.key.toLowerCase())
    {
        case 'e':               // inventory
        {
            if(getActiveWindow() == "inventory")
                closeInventory();
            else
                openInventory();

            break;
        }
        case "escape":          // close menus
        {
            closeInventory();
            closeShop();
            break;
        }
        case "shift":
        {
            displayHappiness = true;
            break;
        }
        default:
            break;
    }
}

function onKeyUp(e)
{
    if(getActiveWindow() == "notification") return;

    switch(e.key.toLowerCase())
    {
        case "shift":
            displayHappiness = false;
            break;
        default:
            break;
    }
}

function onMouseDown(e)
{
    if(e.button == 2) // right click
    {
        if(isCurrentTurn() && getActiveWindow() == "main")
        {
            for(let i = 0; i < villagers.length; i++)
            {
                if(mouseInteract(villagers[i]))
                {
                    movingVillager = villagers[i];
                    break;
                }
            }
        }
    }
}

function onMouseUp(e)
{
    if(e.button == 2)
    {
        // move villager
        if(isCurrentTurn() && movingVillager)
            moveVillager();

        movingVillager = null;
    }
}

function playClickSound()
{
    if(!soundOn) return;
    
    audio.click.currentTime = 0;
    audio.click.play();
}

// main ////////////////////////////////////////////////////////////////

export function init()
{
    canvas.width = img.background.width * SCALE;
    canvas.height = img.background.height * SCALE;

    audio.bgm.currentTime = 0;
    if(musicOn)
        audio.bgm.play();

    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    buttons.help.enabled = false;

    currentTurn = 0;
    actionPoints = 0;
    skillUsed = false;

    day = 0;
    season = "";
    nextSeason = "";
    daysUntilNextSeason = 0;

    event = null;
    nextEvent = null;

    budget = 0;

    villagers = [];
    paths = [];
    movingVillager = null;

    facilities = {};
    farm = [];

    treesUnlocked = false;
    trees = [];

    shop = [];

    dailyLoot = [];
    lootAmount = 0;

    upgrades = 0;

    healChances = 0;
    reputation = 0;
    displayHappiness = false;

    cropGrowthModifier = 0;
    priceMultiplier = 1;

    actionState = ACTION_STATES.NORMAL;
    inventoryState = INVENTORY_STATES.NORMAL;

    heldItemStack = null;
    assigningVillager = null;

    infoSelected = null;
    labelSelected = null;

    windowStack = ["main"];

    notifications = [];
    currentNotif = null;

    cloudShadows = [];

    if(role == "scientist")
        ACTION_COST.SKILL = 4;

    else if(role == "farmer")
        ACTION_COST.SKILL = 8;

    else if(role == "sociologist" || role == "doctor")
        ACTION_COST.SKILL = 3;
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyDown);

    audio.bgm.pause();
}

function isCurrentTurn()    // bool
{
    return players[currentTurn].id == socketId;
}

function triggerNotifications()
{
    if(getActiveWindow() == "notification" || sm.currentScene != sm.SCENE.game) return;

    if(notifications.length > 0)
    {
        if(soundOn)
        {
            audio.notification.currentTime = 0;
            audio.notification.play();
        }

        windowStack.push("notification");
        currentNotif = notifications[0];
        setTimeout(() => {
            currentNotif = null;
            notifications.shift();
            if(getActiveWindow() == "notification") windowStack.pop();
            
            notificationBox.x = 16*34;
            notificationBox.width = 0;
            triggerNotifications();
        }, currentNotif.duration);
    }
    else
    {
        if(day > 1 && villagers.length < (maxVillagers - 3))
            gameOver("GAME OVER: More than 3 villagers have left the village");
    }
}

function getActiveWindow()
{
    return windowStack[windowStack.length - 1];
}

function selectedInfoType(infoType)     // bool
{
    return infoSelected && infoSelected.infoType == infoType;
}

function endTurn()
{
    closeInventory();
    socket.emit("end_turn", roomId);
}

function openInventory()
{
    if(getActiveWindow() != "inventory")
    {
        closeShop();
        windowStack.push("inventory");
        heldItemStack = null;
        assigningVillager = null;

        buttons.assignVillager.enabled = false;
        buttons.healVillager.enabled = false;

        refreshInventoryButtons();
    }
}

function closeInventory()
{
    if(getActiveWindow() == "inventory")
    {
        windowStack.pop();

        refreshAssignButton();
        refreshHealButton();

        inventoryState = INVENTORY_STATES.NORMAL;
        refreshInventoryButtons();
    }
}

function openShop()
{
    if(getActiveWindow() != "shop")
    {
        closeInventory();
        windowStack.push("shop");
        heldItemStack = null;
        assigningVillager = null;

        buttons.assignVillager.enabled = false;
        buttons.healVillager.enabled = false;
    }
}

function closeShop()
{
    if(getActiveWindow() == "shop")
    {
        windowStack.pop();
        refreshAssignButton();
        refreshHealButton();
    }
}

function setLabel(obj)
{
    labelSelected = obj;
}

function getSellPrice()     // int
{
    return 10 + (facilities["housing"].level - 1) * 5;
}

function useAction(amount)
{
    // return; // debug
    actionPoints -= amount;

    refreshAssignButton();
    refreshCutTreeButton();
    refreshHealButton();
    refreshPickTreeButton();
    refreshUpgradeFacilityButton();
    refreshSkillButton();

    if(amount == ACTION_COST.SKILL)
        socket.emit("actions", roomId, `Used ${role} skill.`);

    buttons.harvestCrop.enabled = actionPoints >= ACTION_COST.HARVEST_CROP;
}

function useSkill()
{
    switch(role)
    {
        case "chief":
        {
            reputation++;
            socket.emit("reputation", roomId, reputation);
            useAction(ACTION_COST.SKILL);
            skillUsed = true;
        }
        break;
        case "doctor":
        {
            actionState = ACTION_STATES.SELECT_VILLAGER;
            buttons.skill.enabled = false;
        }
        break;
        case "scientist":
        {
            useAction(ACTION_COST.SKILL);
            skillUsed = true;
        }
        break;
        case "sociologist":
        {
            actionState = ACTION_STATES.SELECT_VILLAGER;
            buttons.skill.enabled = false;
        }
        break;
        case "farmer":
        {
            actionState = ACTION_STATES.SELECT_FARMLAND;
            buttons.skill.enabled = false;
        }
        break;
        case "engineer":
        {
            socket.emit("engineer_skill", inventory);
            useAction(ACTION_COST.SKILL);
            skillUsed = true;
        }
        break;
        default:
            break;
    }
}

function plantCrop(farmland)
{
    farmland.crop = heldItemStack.item;
    farmland.daysLeft = (role == "farmer" ? CROP_GROWTH_TIME - 1 : CROP_GROWTH_TIME) + cropGrowthModifier;
    farmland.label = farmland.daysLeft + " days";
    socket.emit("farm", roomId, farm);
    socket.emit("actions", roomId, "Planted crop.");

    useAction(ACTION_COST.PLANT_CROP);

    useItem(heldItemStack);
}

function harvestCrop()
{
    let farmland = infoSelected;
    let amount = Math.floor(Math.random() * (farmland.amount - 2 + 1)) + 2 + (farmland.fertilized ? FERTILIZED_BONUS : 0);

    giveItem(farmland.crop.food, amount);

    let seedCount = 0;
    for(let i = 0; i < amount; i++)
    {
        if(Math.random() < HARVEST_SEED_CHANCE)
            seedCount++;
    }

    if(seedCount > 0)
        giveItem(farmland.crop, seedCount);

    farmland.crop = null;
    farmland.label = "empty";
    socket.emit("farm", roomId, farm);
    socket.emit("actions", roomId, "Harvested crop.");

    useAction(ACTION_COST.HARVEST_CROP);
    infoSelected = null;
}

function pickTree()
{
    useAction(ACTION_COST.PICK_TREE);
    let tree = infoSelected;
    socket.emit("pick_tree", roomId, tree.id);
    socket.emit("actions", roomId, "Picked apple from tree.");
}

function cutTree()
{
    useAction(ACTION_COST.CUT_TREE);
    let tree = infoSelected;
    socket.emit("cut_tree", roomId, tree.id);
    socket.emit("actions", roomId, "Cut tree.");
}

function giveItem(item, amount)
{
    if(amount <= 0) return;

    for(let i = 0; i < inventory.length; i++)
    {
        if(inventory[i].item.id == item.id)
        {
            if(inventory[i].item.type == "material" && inventory[i].item.upgraded != item.upgraded)
                continue;

            inventory[i].amount += amount;
            saveInventory();
            return;
        }
    }

    inventory.push(new ItemStack(item, amount));

    saveInventory();
}

function startAssign()
{
    heldItemStack = null;

    assigningVillager = infoSelected;
    buttons.assignVillager.enabled = false;
}

function finishAssign(facility)
{
    if(facility == facilities["power"] && facilities["power"].assignedVillagers.length > 0)
    {
        assigningVillager = null;
        buttons.assignVillager.enabled = true;
        return;
    }

    // villager is assigned to same facility
    if(facility && assigningVillager.currentTask == facility.label)
    {
        assigningVillager = null;
        buttons.assignVillager.enabled = true;
        return;
    }

    // remove villager from current assigned facility
    let oldFacility = null;

    if(assigningVillager.currentTask)
    {
        oldFacility = facilities[assigningVillager.currentTask];

        for(let i = 0; i < oldFacility.assignedVillagers.length; i++)
        {
            if(oldFacility.assignedVillagers[i] == assigningVillager.name)
            {
                oldFacility.assignedVillagers.splice(i, 1);
                break;
            }
        }
    }

    if(facility)
    {
        assigningVillager.currentTask = facility.label;

        // add villager to new facility
        facilities[facility.label].assignedVillagers.push(assigningVillager.name);

        useAction(ACTION_COST.ASSIGN_VILLAGER);
    }
    else
        assigningVillager.currentTask = null;

    socket.emit("assign_villager", roomId, assigningVillager, oldFacility, facility);

    assigningVillager = null;
    refreshAssignButton();
}

function isHoldingFood()        // bool
{
    return heldItemStack && heldItemStack.item.type == "food";
}

function feedVillager(villager)
{
    villager.fed = true;

    if(heldItemStack.item.id == villager.favoriteFood)
        villager.hunger = 5;
    else
        villager.hunger = Math.min(villager.hunger + 1, 4);

    if(heldItemStack.item.id == "apple")
        villager.happiness += APPLE_HAPPINESS_BOOST;

    socket.emit("villager", roomId, villager);

    useItem(heldItemStack);
}

function healVillager()
{
    let villager = infoSelected;
    villager.sick = false;

    useAction(ACTION_COST.HEAL_VILLAGER);

    if(healChances > 0)
        healChances--;
    else
        spendBudget(Math.floor(HEAL_VILLAGER_COST * priceMultiplier));

    refreshHealButton();

    socket.emit("villager", roomId, villager);
}

function moveVillager()
{
    let pathX = Math.floor(mouse.x / (16*SCALE)) - 8;
    let pathY = Math.floor(mouse.y / (16*SCALE));

    if(pathY >= 0 && pathY <= 21 && pathX >= 0 && pathX <= 25 && paths[pathY][pathX] != 'x')
    {
        paths[movingVillager.position.y][movingVillager.position.x] = '-';

        movingVillager.position.x = pathX;
        movingVillager.position.y = pathY;
        movingVillager.interactBox.x = pathX * 16 + 128;
        movingVillager.interactBox.y = pathY * 16;

        paths[pathY][pathX] = 'x';

        socket.emit("move_villager", roomId, movingVillager, paths);
    }
}

function useMaterial(facility)
{
    if(facility.progress < facility.progressMax && facility.level < 5 && actionPoints >= ACTION_COST.USE_MATERIAL)
    {
        facility.progress += heldItemStack.item.progress;
        if(facility.progress > facility.progressMax)
            facility.progress = facility.progressMax;

        useItem(heldItemStack);
        socket.emit("facility", roomId, facility);
        socket.emit("actions", roomId, `Used ${heldItemStack.item.name} on ${facility.label}.`);

        useAction(ACTION_COST.USE_MATERIAL);
    }
}

function useItem(itemStack)
{
    itemStack.amount--;

    if(itemStack.amount == 0)
    {
        // remove item from inventory
        const index = inventory.indexOf(itemStack);
        inventory.splice(index, 1);

        if(itemStack == heldItemStack) heldItemStack = null;
    }

    saveInventory();
}

function saveInventory()
{
    let prevGame = JSON.parse(localStorage.prevGame);
    prevGame.inventory = inventory;
    localStorage.prevGame = JSON.stringify({roomId, socketId, inventory});
}

function sellItem(itemStack)
{
    useItem(itemStack);
    spendBudget(-getSellPrice());
}

function upgradeMaterial(itemStack)
{
    spendBudget(UPGRADE_MATERIAL_COST);

    let success = getUpgradeSuccessChance();

    if(Math.random() < success)
    {
        let newItem = Object.assign({}, itemStack.item);
        newItem.name += "★";
        newItem.progress = newItem.upgradedProgress;
        newItem.upgraded = true;

        useItem(itemStack);
        giveItem(newItem, 1);

        socket.emit("actions", roomId, `Upgrade ${itemStack.item.name} succeeded.`);
    }
}

function getUpgradeSuccessChance()  // float
{
    switch(facilities["education"].level)
    {
        case 1: return 0.5;
        case 2: return 0.6;
        case 3: return 0.7;
        case 4: return 0.8;
        case 5: return 1.0;
        default: return -1;
    }
}

function spendBudget(amount)
{
    budget -= amount;
    socket.emit("budget", roomId, budget);
}

function collectLoot(index)
{
    giveItem(dailyLoot[index], 1);
    dailyLoot[index] = null;
    lootAmount--;

    if(lootAmount <= 0)
    {
        windowStack.pop();
        buttons.endTurn.enabled = true;
    }
}

function purchase(shopItem)
{
    let price = Math.floor(shopItem.price * priceMultiplier);

    if(budget < price) return;

    socket.emit("budget", roomId, budget - price);
    socket.emit("purchase", roomId, socketId, shopItem);
}


// refresh ////////////////////////////////////////////////////////////////

function refreshTrees()
{
    for(let i = 0; i < trees.length; i++)
    {
        trees[i].interactBox.x = 16 * ((i*(8 / trees.length)) + 23 + (1 - trees.length / 8));
        trees[i].interactBox.width = 16;

        if(treesUnlocked)
        {
            trees[i].label = "tree";

            trees[i].interactBox.y = 16 * 2.5;
            trees[i].interactBox.height = 24;
        }
        else
        {
            trees[i].label = "?";

            trees[i].interactBox.y = 16 * 3;
            trees[i].interactBox.height = 16;
        }
    }
}

function refreshInventoryButtons()
{
    let enable = isCurrentTurn() && getActiveWindow() == "inventory" && inventoryState == INVENTORY_STATES.NORMAL;

    buttons.sellItem.enabled = enable;
    buttons.upgradeMaterial.enabled = enable && role == "engineer" && budget >= UPGRADE_MATERIAL_COST;
}

function refreshShop()
{
    for(let i = 0; i < shop.length; i++)
    {
        shop[i].interactBox.x = 16*(16 + (Math.floor(i/5) * 10));
        shop[i].interactBox.y = 16*(10+((i%5)*2));
        shop[i].interactBox.width = 16*4;
        shop[i].interactBox.height = 16*1.5;
    }
}

function refreshAssignButton()
{
    buttons.assignVillager.enabled = role == "chief" && isCurrentTurn() && actionPoints >= ACTION_COST.ASSIGN_VILLAGER;
}

function refreshHealButton()
{
    buttons.healVillager.enabled = false;

    let cost = Math.floor(HEAL_VILLAGER_COST * priceMultiplier);

    if((rolesPresent["doctor"] || npcPresent["doctor"]) && healChances > 0)
        buttons.healVillager.text = `heal (${healChances})`;
    else
        buttons.healVillager.text = `heal ($${cost})`;

    if(!isCurrentTurn() || !selectedInfoType("villager") || actionPoints < ACTION_COST.HEAL_VILLAGER)
        return;

    if(infoSelected.sick)
    {
        buttons.healVillager.enabled = healChances > 0 || budget >= cost;
    }
}

function refreshUpgradeFacilityButton()
{
    buttons.upgradeFacility.enabled = false;
    
    if(isCurrentTurn() && selectedInfoType("facility") && infoSelected.progress == infoSelected.progressMax && actionPoints >= ACTION_COST.UPGRADE_FACILITY)
    {
        let enable = true;

        if(infoSelected.label == "power")
        {
            enable = infoSelected.level == 1;
        }
        else
        {
            if(infoSelected.level >= 5)
                enable = false;
            else
            {
                Object.values(infoSelected.cost).forEach(amount => {
                    if(amount > 0)
                        enable = false;
                });
            }
        }

        buttons.upgradeFacility.enabled = enable;
    }
}

function refreshPickTreeButton()
{
    if(!isCurrentTurn() || !selectedInfoType("tree") || actionPoints < ACTION_COST.PICK_TREE)
    {
        buttons.pickTree.enabled = false;
        return;
    }

    buttons.pickTree.enabled = infoSelected.daysLeft == 0 && !infoSelected.cut;
}

function refreshCutTreeButton()
{
    if(!isCurrentTurn() || !selectedInfoType("tree") || actionPoints < ACTION_COST.CUT_TREE)
    {
        buttons.cutTree.enabled = false;
        return;
    }

    buttons.cutTree.enabled = !infoSelected.cut;
}

function refreshSkillButton()
{
    buttons.skill.enabled = isCurrentTurn() && actionState == ACTION_STATES.NORMAL && actionPoints >= ACTION_COST.SKILL;
}


// drawing ////////////////////////////////////////////////////////////////

function getTextColor(text)
{
    switch(text)
    {
        case "water":       return "#33CCFF";
        case "farming":     return "#00CC33";
        case "education":   return "#FFCC66";
        case "housing":     return "#FF6666";
        case "power":       return "#FFFF00";

        case "most eff:":
        case "most fav:":
            return "gold";

        case "least eff:":
        case "least fav:":
            return "mediumpurple";

        case "immune":
            if(selectedInfoType("villager"))
                return infoSelected.immune ? "aqua" : null;

        case "(none)":
            return "gray";

        default:
            return null;
    }
}

function drawLabel()
{
    if(labelSelected == null) return;

    let obj = labelSelected;

    let labelColor = "white";

    if(obj.infoType == "facility")
        labelColor = getTextColor(obj.label);

    if(obj.infoType == "villager")
        labelColor = obj.sick ? "rgb(0,191,0)" : "white";

    drawTooltip(obj.interactBox, obj.label, labelColor);
}

function drawItemLabel(interactBox, item)
{
    ctx.font = '16px Kenney Mini Square';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let nameRect = ctx.measureText(item.name);
    let typeRect = ctx.measureText(item.type);

    let textWidth = Math.max(nameRect.width, typeRect.width);
    let textHeight = nameRect.fontBoundingBoxAscent + nameRect.fontBoundingBoxDescent;
    let padding = 8;

    if(item.type == "material")
    {
        ctx.fillStyle = "black";
        ctx.fillRect(
            (interactBox.x + interactBox.width/2) * SCALE - textWidth/2 - padding,
            (interactBox.y * SCALE) - 60 - padding/2 - (textHeight + padding),
            textWidth + 2 * padding,
            (textHeight + padding) * 3);

        ctx.fillStyle = "white";
        ctx.fillText(item.name, (interactBox.x + interactBox.width/2) * SCALE, (interactBox.y * SCALE) - 84);
        ctx.fillStyle = item.upgraded ? "orange" : "gray";
        ctx.fillText("+" + item.progress, (interactBox.x + interactBox.width/2) * SCALE, (interactBox.y * SCALE) - 60);
        ctx.fillStyle = "dodgerblue";
        ctx.fillText(item.type, (interactBox.x + interactBox.width/2) * SCALE, (interactBox.y * SCALE) - 36);
    }
    else
    {
        ctx.fillStyle = "black";
        ctx.fillRect(
            (interactBox.x + interactBox.width/2) * SCALE - textWidth/2 - padding,
            (interactBox.y * SCALE) - 60 - padding/2,
            textWidth + 2 * padding,
            (textHeight + padding) * 2);

        ctx.fillStyle = "white";
        ctx.fillText(item.name, (interactBox.x + interactBox.width/2) * SCALE, (interactBox.y * SCALE) - 60);
        ctx.fillStyle = "dodgerblue";
        ctx.fillText(item.type, (interactBox.x + interactBox.width/2) * SCALE, (interactBox.y * SCALE) - 36);
    }
}

function drawTooltip(interactBox, text, color)
{
    ctx.font = "16px Kenney Mini Square";
    let textRect = ctx.measureText(text);
    let textWidth = textRect.width;
    let textHeight = textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent;
    let padding = 8;

    ctx.fillStyle = "black";
    ctx.fillRect(
        (interactBox.x + interactBox.width/2) * SCALE - textWidth/2 - padding,
        (interactBox.y * SCALE) - 32 - padding/2,
        textWidth + 2 * padding,
        textHeight + padding);

    ctx.fillStyle = color;
    ctx.fillText(text, (interactBox.x + interactBox.width/2) * SCALE - textRect.width/2, (interactBox.y * SCALE) - 32);
}

function drawTooltips()
{
    // upgrade facility
    if(selectedInfoType("facility") && mouseInteract(buttons.upgradeFacility))
        drawTooltip(buttons.upgradeFacility.interactBox, `cost: ${ACTION_COST.UPGRADE_FACILITY}✦`, "magenta");

    // plant crop
    if(heldItemStack?.item.type == "seed")
    {
        for(let i = 0; !farm[i].locked; i++)
        {
            if(!farm[i].crop && mouseInteract(farm[i]))
            {
                setLabel(null);
                drawTooltip(farm[i].interactBox, `cost: ${ACTION_COST.PLANT_CROP}✦`, "magenta");
                break;
            }
        }   
    }

    // harvest crop
    if(selectedInfoType("farmland") && mouseInteract(buttons.harvestCrop))
        drawTooltip(buttons.harvestCrop.interactBox, `cost: ${ACTION_COST.HARVEST_CROP}✦`, "magenta");

    
    if(treesUnlocked)
    {
        // pick tree
        if(selectedInfoType("tree") && !infoSelected.cut && infoSelected.daysLeft == 0 && mouseInteract(buttons.pickTree))
            drawTooltip(buttons.pickTree.interactBox, `cost: ${ACTION_COST.PICK_TREE}✦`, "magenta");

        // cut tree
        if(selectedInfoType("tree") && !infoSelected.cut && mouseInteract(buttons.cutTree))
            drawTooltip(buttons.cutTree.interactBox, `cost: ${ACTION_COST.CUT_TREE}✦`, "magenta");
    }
    

    // assign villager
    if(selectedInfoType("villager") && mouseInteract(buttons.assignVillager))
        drawTooltip(buttons.assignVillager.interactBox, `cost: ${ACTION_COST.ASSIGN_VILLAGER}✦`, "magenta");

    // heal villager
    if(selectedInfoType("villager") && mouseInteract(buttons.healVillager))
        drawTooltip(buttons.healVillager.interactBox, `cost: ${ACTION_COST.HEAL_VILLAGER}✦`, "magenta");

    // use material
    if(heldItemStack?.item.type == "material")
    {
        let f = Object.values(facilities);
        for(let i = 0; i < f.length; i++)
        {
            if(mouseInteract(f[i]))
            {
                setLabel(null);
                drawTooltip(f[i].interactBox, `cost: ${ACTION_COST.USE_MATERIAL}✦`, "magenta");
                break;
            }
        }
    }

    // skill
    if(mouseInteract(buttons.skill))
        drawTooltip(buttons.skill.interactBox, `cost: ${ACTION_COST.SKILL}✦`, "magenta");

    // upgrade material
    if(role == "engineer" && getActiveWindow() == "inventory" && mouseInteract(buttons.upgradeMaterial))
        drawTooltip(buttons.upgradeMaterial.interactBox, `success: ${getUpgradeSuccessChance() * 100}%`, "cyan");
}

function drawVillagers()
{
    villagers.forEach(villager => {

        drawVillager(villager,
            villager.position.x * 16 + 128,
            villager.position.y * 16,
            1);


        // draw food popup

        if(isHoldingFood())
        {
            let obj = {
                interactBox: {
                    x: (villager.position.x * 16 + 128),
                    y: (villager.position.y * 16 - 22),
                    width: 16,
                    height: 16
                }
            };

            ctx.save();

            let canFeed = !villager.fed && villager.hunger < 5;

            // if villager can be fed
            if(canFeed)
            {
                if(mouseInteract(obj))
                {
                    ctx.fillStyle = "lightgray";
                    setLabel(null);
                }
                else
                    ctx.fillStyle = "white";
            }
            else
            {
                ctx.globalAlpha = 0.75;
                ctx.fillStyle = "gray";
            }
            
            ctx.fillRect(
                obj.interactBox.x * SCALE,
                obj.interactBox.y * SCALE,
                16*SCALE, 16*SCALE);

            ctx.drawImage(img[villager.favoriteFood],
                (villager.position.x * 16 + 128 + 2) * SCALE,
                (villager.position.y * 16 - 20) * SCALE,
                12*SCALE, 12*SCALE);

            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "18px Kenney Mini Square";
            ctx.fillText(villager.hunger, (obj.interactBox.x + 8) * SCALE, (obj.interactBox.y + 8) * SCALE);

            if(canFeed)
            {
                ctx.strokeStyle = "black";
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    obj.interactBox.x * SCALE,
                    obj.interactBox.y * SCALE,
                    16*SCALE, 16*SCALE);
            }

            ctx.restore();
        }

        // draw happiness popup
        if(displayHappiness && role == "sociologist")
        {
            ctx.save();

            ctx.drawImage(img.heart,
                (villager.position.x * 16 + 128) * SCALE,
                (villager.position.y * 16) * SCALE,
                16*SCALE, 16*SCALE);

            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "16px Kenney Mini Square";
            ctx.fillText(villager.happiness, (villager.position.x * 16 + 128 + 8) * SCALE, (villager.position.y * 16 + 6) * SCALE);

            ctx.restore();
        }

        // ctx.lineWidth = 4;
        // ctx.strokeStyle = "black";
        // ctx.strokeRect(
        //     villager.interactBox.x * SCALE,
        //     villager.interactBox.y * SCALE,
        //     villager.interactBox.width * SCALE,
        //     villager.interactBox.height * SCALE);

        if(getActiveWindow() == "main" && !isHoldingFood() && mouseInteract(villager))
            setLabel(villager);
    });
}

function drawPaths()
{
    if(!movingVillager) return;

    ctx.save();

    ctx.globalAlpha = 0.3;

    for(let i = 0; i < paths.length; i++)
    {
        for(let j = 0; j < paths[i].length; j++)
        {
            if(paths[i][j] == 'x')
                ctx.fillStyle = "red";
            else
                ctx.fillStyle = "white";

            ctx.fillRect(
                16 * (j + 8) * SCALE,
                16 * (i + 0) * SCALE,
                16 * SCALE, 16 * SCALE);
        }
    }

    ctx.globalAlpha = 0.5;

    
    let pathX = Math.floor(mouse.x / (16*SCALE));
    let pathY = Math.floor(mouse.y / (16*SCALE));

    if(pathY >= 0 && pathY <= 21 && pathX - 8 >= 0 && pathX - 8 <= 25)
    {
        ctx.fillStyle = "blue";
        ctx.fillRect(
            pathX * (16*SCALE),
            pathY * (16*SCALE),
            16*SCALE, 16*SCALE);
    }

    ctx.restore();
}

function drawFacilities()
{
    ctx.drawImage(img.facilityWater, 176 * SCALE, 112 * SCALE, img.facilityWater.width * SCALE, img.facilityWater.height * SCALE);
    ctx.drawImage(img.facilityEducation, 176 * SCALE, 240 * SCALE, img.facilityEducation.width * SCALE, img.facilityEducation.height * SCALE);
    ctx.drawImage(img.facilityHousing, 368 * SCALE, 240 * SCALE, img.facilityHousing.width * SCALE, img.facilityHousing.height * SCALE);

    if(Object.keys(facilities).length > 0)
    {
        // ctx.drawImage(facilities["power"].level > 1 ? img.powerOn : img.powerOff, 16*16*SCALE, 16*1*SCALE, img.powerOff.width * SCALE, img.powerOn.height * SCALE);
        
        ctx.drawImage(facilities["power"].level > 1 ? powerOnAnimation.getFrame() : img.powerOff, 16*16*SCALE, 16*1*SCALE, img.powerOff.width * SCALE, img.powerOn.height * SCALE);

        Object.values(facilities).forEach(facility => {
            if(getActiveWindow() == "main" && mouseInteract(facility))
                setLabel(facility);
        });
    }
}

function drawFarmland()
{
    farm.forEach(obj => {
        let farmImg = obj.locked ? img.farmlandLocked : img.farmland;
        if(obj.fertilized) farmImg = img.farmlandFertilized;

        ctx.drawImage(farmImg, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);

        if(obj.crop)
        {
            let cropImg = obj.daysLeft == 0 ? img[obj.crop.food.id] : img.plant;
            ctx.drawImage(cropImg, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);
        }

        if(heldItemStack && heldItemStack.item.type == "material")
            return;

        if(getActiveWindow() == "main" && !assigningVillager && !obj.locked && mouseInteract(obj))
            setLabel(obj);
    });
}

function drawTrees()
{
    trees.forEach(obj => {

        if(treesUnlocked)
        {
            let image = img.treeRipe;

            if(obj.cut)
                image = img.treeStump;
            else if(obj.daysLeft > 0)
                image = img.treeBare;
            else if(obj.fertilized)
                image = img.treeFertilized;

            ctx.drawImage(image, obj.interactBox.x * SCALE, (obj.interactBox.y - 8) * SCALE, 16 * SCALE, 32 * SCALE);
        }
        else
            ctx.drawImage(img.plant, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);


        if(getActiveWindow() == "main" && mouseInteract(obj))
            setLabel(obj);
    });
}

function drawEventEffects()
{
    if(!event) return;

    if(event.blocked) return;

    if(event.id == "cloudy_day")
    {
        ctx.globalAlpha = 0.25;
        cloudShadows.forEach(cloud => {
            ctx.drawImage(img.cloudShadows, 64*cloud.type, 0, 64, 64, cloud.x*SCALE, cloud.y*SCALE, 64*SCALE, 64*SCALE);
        });
        ctx.globalAlpha = 1;
    }
    else if(event.id == "flood")
    {
        ctx.globalAlpha = 0.6;
        cloudShadows.forEach(cloud => {
            ctx.drawImage(img.puddles, 16*cloud.type, 0, 16, 16, cloud.x*SCALE, cloud.y*SCALE, 32*SCALE, 32*SCALE);
        });
        ctx.globalAlpha = 1;
    }
    else if(event.id == "rainy_day")
    {
        ctx.globalAlpha = 0.25;
        let image = rainAnimation.getFrame();
        ctx.drawImage(image, 0, 0, image.width/2, image.height/2, 16*8*SCALE, 0, image.width*SCALE, image.height*SCALE);
        ctx.globalAlpha = 1;
    }
}

function drawTitleBar()
{
    ctx.save();

    ctx.textAlign = "left";
    ctx.font = "20px Kenney Mini Square";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;

    let currentTurnText = "current turn:   " + players[currentTurn].name;
    let x = 16*8.5*SCALE;
    let y = 16*0.5*SCALE;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "black";
    ctx.strokeText(currentTurnText, x, y);
    ctx.fillText(currentTurnText, x, y);
    
    ctx.textAlign = "right";
    let fleeText = "💨".repeat(Math.max(Math.min(maxVillagers - villagers.length, 4), 0));
    let reputationText = fleeText + "        " + "👑   " + reputation + "        " + "🏠   " + upgrades;
    x = 16*33.5*SCALE;
    y = 16*0.5*SCALE;
    ctx.strokeStyle = "white";
    ctx.strokeText(reputationText, x, y);
    ctx.fillStyle = "black";
    ctx.fillText(reputationText, x, y);

    ctx.restore();
}

function drawInfoPanel()
{
    ctx.font = '20px Kenney Mini Square';
    ctx.fillStyle = "sienna";
    ctx.textAlign = "center";
    ctx.fillText(role, 16*4*SCALE, 16*1*SCALE);
    ctx.textAlign = "left";

    if(!infoSelected) return;

    switch(infoSelected.infoType)
    {
        case "villager":
        {
            let villager = infoSelected;

            drawVillager(villager, 3*16, 2.5*16, 2);
            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(villager.name, 16*4*SCALE, 16*6*SCALE);

            ctx.beginPath();
            ctx.roundRect(16*0.5*SCALE, 16*7.75*SCALE, 16*7*SCALE, 16*9.5*SCALE, 4*SCALE);
            ctx.fill();

            ctx.font = '16px Kenney Mini Square';

            let textLeft = [
                "status:",
                "happiness:",
                "hunger:",
                "most eff:",
                "most fav:",
                "least eff:",
                "least fav:",
                "favorite:"
            ];

            let textRight = [
                villager.sick ? "sick" :
                    villager.immune ? "immune" : "healthy",
                (role == "sociologist" || npcPresent["sociologist"] ? villager.happiness : "?") + " / 100",
                villager.hunger + " / 5",
                villager.mostEffectiveTask,
                villager.mostFavoriteTask,
                (villager.leastEffectiveTask == "") ? "(none)" : villager.leastEffectiveTask,
                (villager.leastFavoriteTask == "") ? "(none)" : villager.leastFavoriteTask,
                villager.favoriteFood
            ];  

            // ctx.fillStyle = "white";
            for(let i = 0; i < textLeft.length; i++)
            {
                ctx.fillStyle = getTextColor(textLeft[i]) || "white";
                ctx.textAlign = "left";
                ctx.fillText(textLeft[i], 16 * SCALE, 16 * (i * 0.75 + 8) * SCALE);

                ctx.fillStyle = getTextColor(textRight[i]) || "white";
                ctx.textAlign = "right";
                ctx.fillText(textRight[i], 16 * 7 * SCALE, 16 * (i * 0.75 + 8) * SCALE);
            }

            ctx.textAlign = "right";
            ctx.fillStyle = getTextColor(villager.currentTask) || "gray";
            ctx.fillText(villager.currentTask ? villager.currentTask : "(none)", 16 * 7 * SCALE, 16*14.5*SCALE);
            ctx.textAlign = "left";
            ctx.fillStyle = "white";
            ctx.fillText("working:", 16 * SCALE, 16*14.5*SCALE);

            if(villager.quest)
            {
                ctx.fillText("quest:", 16 * SCALE, 16*15.75*SCALE);
                ctx.fillStyle = "goldenrod";
                ctx.fillText(villager.quest.description, 16 * SCALE, 16*16.5*SCALE);
            }
            
            drawButton(buttons.assignVillager);
            drawButton(buttons.healVillager);

            break;
        }
        case "facility":
        {
            let facility = infoSelected;

            ctx.font = "32px Kenney Mini Square";
            ctx.fillStyle = "black";
            ctx.textAlign = "center";

            if(facility.label == "power")
            {
                ctx.fillText(facility.label, 16*4*SCALE, 16*7*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText("level: " + facility.level, 16*4*SCALE, 16*9*SCALE);

                if(facility.level == 1)
                    ctx.fillText("progress: " + (+facility.progress.toFixed(2)) + " / " + facility.progressMax, 16*4*SCALE, 16*10*SCALE);
                else
                {
                    ctx.fillText("the next event", 16*4*SCALE, 16*10*SCALE);
                    ctx.fillText("will be blocked", 16*4*SCALE, 16*11*SCALE);
                }
            }
            else
            {
                ctx.fillText(facility.label, 16*4*SCALE, 16*7*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText("level: " + facility.level, 16*4*SCALE, 16*9*SCALE);

                if(facility.level < 5)
                    ctx.fillText("progress: " + (+facility.progress.toFixed(2)) + " / " + facility.progressMax, 16*4*SCALE, 16*10*SCALE);
                else
                    ctx.fillText("max level", 16*4*SCALE, 16*10*SCALE);

                // ctx.fillStyle = facility.progress == facility.progressMax ? "black" : "gray";
                // ctx.fillText("upgrade cost", 16*4*SCALE, 16*9*SCALE);
                // let i = 0;
                // for (const [item, amount] of Object.entries(facility.cost)) {
                //     ctx.fillText(item + ": " + amount, 16*4*SCALE, 16*(10+i)*SCALE);
                //     i++;
                // }
            }

            ctx.fillStyle = "black";
            ctx.fillText("assigned villagers:", 16*4*SCALE, 16*13*SCALE);

            let rows = Math.floor(facility.assignedVillagers.length / 6);
            let remaining = facility.assignedVillagers.length % 6;

            for(let i = 0; i < facility.assignedVillagers.length; i++)
            {
                if(i < rows * 6)
                {
                    drawVillager(villagers.find(v => v.name == facility.assignedVillagers[i]),
                    16*(1 + (i % 6)),
                    16*(14.25 + Math.floor(i/6) * 1.5),
                    1);
                }
                else
                {
                    drawVillager(villagers.find(v => v.name == facility.assignedVillagers[i]),
                    16*(4 - remaining*0.5 + (i % 6)),
                    16*(14.25 + Math.floor(i/6) * 1.5),
                    1);
                }
            }

            if(facility.assignedVillagers.length == 0)
                ctx.fillText("(none)", 16*4*SCALE, 16*14*SCALE);

            if(!(facility.label == "power" && facility.level > 1))
                drawButton(buttons.upgradeFacility);
            
            ctx.textAlign = "left";
            break;
        }
        case "farmland":
        {
            let farmland = infoSelected;

            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText("farmland", 16*4*SCALE, 16*8*SCALE);

            if(farmland.crop)
            {
                ctx.drawImage(img[farmland.crop.food.id],
                    16*3*SCALE,
                    16*5*SCALE,
                    16*2*SCALE,
                    16*2*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText(farmland.crop.food.name, 16*4*SCALE, 16*10*SCALE);

                let cropMin = 2 + (farmland.fertilized ? FERTILIZED_BONUS : 0);
                let cropMax = farmland.amount + (farmland.fertilized ? FERTILIZED_BONUS : 0);
                ctx.fillText((cropMax > cropMin ? `+ ${cropMin}-` : "+ ") + cropMax, 16*4*SCALE, 16*11*SCALE);

                if(farmland.daysLeft == 0)
                {
                    ctx.fillText(farmland.label + " to harvest", 16*4*SCALE, 16*12*SCALE);
                    drawButton(buttons.harvestCrop);
                }
                else
                    ctx.fillText(farmland.label + " until mature", 16*4*SCALE, 16*12*SCALE);
            }
            else
            {
                ctx.font = '16px Kenney Mini Square';
                ctx.fillText(farmland.label, 16*4*SCALE, 16*10*SCALE);
            }

            if(farmland.fertilized)
            {
                ctx.fillStyle = "maroon";
                ctx.fillText("fertilized", 16*4*SCALE, 16*14*SCALE);
            }

            ctx.textAlign = "left";

            break;
        }
        case "tree":
        {
            let tree = infoSelected;

            ctx.save();

            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";

            if(treesUnlocked)
            {
                let image = img.treeRipe;
                let text = "days until ripe: " + tree.daysLeft;

                if(tree.cut)
                {
                    image = img.treeStump;
                    text = "cut";
                }
                else if(tree.daysLeft > 0)
                    image = img.treeBare;
                else if(tree.fertilized)
                    image = img.treeFertilized;

                ctx.drawImage(image, 16*3 * SCALE, 16*5 * SCALE, 16*2 * SCALE, 32*2 * SCALE);
                ctx.fillText(tree.label, 16*4*SCALE, 16*10*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText(text, 16*4*SCALE, 16*12*SCALE);

                if(tree.fertilized)
                {
                    ctx.fillStyle = "maroon";
                    ctx.fillText("fertilized", 16*4*SCALE, 16*14*SCALE);
                }

                if(!tree.cut)
                {
                    if(tree.daysLeft == 0)
                        drawButton(buttons.pickTree);
                    drawButton(buttons.cutTree);
                }
            }
            else
            {
                ctx.font = "24px Kenney Mini Square";
                ctx.fillText("unidentified", 16*4*SCALE, 16*9*SCALE);
                ctx.fillText("plant", 16*4*SCALE, 16*10*SCALE);
            }

            ctx.restore();

            break;
        }
        default:
            break;
    }
}

function drawActionPanel()
{
    //ctx.drawImage(img.musicOn, 16*41*SCALE, 16*1*SCALE, 16*SCALE, 16*SCALE);
    drawButton(buttons.music);
    drawButton(buttons.sound);
    drawButton(buttons.inventory);
    drawButton(buttons.help);

    ctx.font = "24px Kenney Mini Square";
    ctx.fillStyle = "black";
    ctx.textAlign = "right";
    ctx.fillText("$" + budget, 16*41*SCALE, 16*1*SCALE);

    ctx.textAlign = "left";
    ctx.fillText("budget: ", 16*35*SCALE, 16*1*SCALE);
    ctx.fillText("day  " + day, 16*35*SCALE, 16*2*SCALE);
    ctx.fillText(season, 16*35*SCALE, 16*3*SCALE);

    ctx.font = "15px Kenney Mini Square";
    ctx.fillText(daysUntilNextSeason + " days until " + nextSeason, 16*35*SCALE, 16*4*SCALE);

    ctx.fillText("current event: ", 16*35*SCALE, 16*6*SCALE);
    if(event)
    {
        if(event.blocked)
            drawGrayscale(img["event_" + event.id], 16*35*SCALE, 16*7*SCALE, 16*6*SCALE, 16*2.5*SCALE);
        else
            ctx.drawImage(img["event_" + event.id], 16*35*SCALE, 16*7*SCALE, 16*6*SCALE, 16*2.5*SCALE);

        ctx.strokeRect(16*35*SCALE, 16*7*SCALE, 16*6*SCALE, 16*2.5*SCALE);
    }
    // ctx.fillText(event ? event.name : "", 16*35*SCALE, 16*7*SCALE);

    if(role == "scientist" && skillUsed)
    {
        ctx.fillText("next event: " + (nextEvent ? (nextEvent.type == 0 ? "good" : "bad") : "none"), 16*35*SCALE, 16*11*SCALE);
    }

    ctx.font = "20px Kenney Mini Square";
    ctx.fillText("action points:   " + actionPoints + "✦", 16*35*SCALE, 16*12*SCALE);


    drawButton(buttons.skill);
    drawButton(buttons.shop);
    drawButton(buttons.endTurn);
}

function drawLoot()
{
    if(getActiveWindow() != "daily_loot") return;

    ctx.save();

    ctx.fillStyle = "#FFDD55";

    let lootBoxWidth = 16*(2 + Math.min(dailyLoot.length, 8) * INVENTORY_BOX_SIZE);
    let lootBoxHeight = 16*(3+2.5*Math.ceil(dailyLoot.length/8));

    ctx.fillRect((16*21 - lootBoxWidth/2)*SCALE, 16*7*SCALE, lootBoxWidth*SCALE, lootBoxHeight*SCALE);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeRect((16*21 - lootBoxWidth/2)*SCALE, 16*7*SCALE, lootBoxWidth*SCALE, lootBoxHeight*SCALE);

    ctx.font = '24px Kenney Mini Square';
    ctx.fillStyle = "black";
    ctx.fillText("daily loot", (16*22 - lootBoxWidth/2)*SCALE, 16*7.5*SCALE);

    ctx.textAlign = "right";
    ctx.fillText("pick " + lootAmount, (16*20 + lootBoxWidth/2)*SCALE, 16*7.5*SCALE);
    ctx.textAlign = "left";

    for(let i = 0; i < dailyLoot.length; i++)
    {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "black";

        const obj = {
            interactBox: {
                x: 16*(22 + (i % 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN) - lootBoxWidth/2,
                y: 16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN),
                width: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN),
                height: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN)
            }
        };

        ctx.fillStyle = "white";
        ctx.fillRect(
            obj.interactBox.x * SCALE,
            obj.interactBox.y * SCALE,
            obj.interactBox.width * SCALE,
            obj.interactBox.height * SCALE);
        
        ctx.strokeRect(
            obj.interactBox.x * SCALE,
            obj.interactBox.y * SCALE,
            obj.interactBox.width * SCALE,
            obj.interactBox.height * SCALE);

        if(dailyLoot[i])
        {
            if(mouseInteract(obj))
            {
                ctx.fillStyle = "#EEEEEE";
                ctx.fillRect(
                    obj.interactBox.x * SCALE,
                    obj.interactBox.y * SCALE,
                    obj.interactBox.width * SCALE,
                    obj.interactBox.height * SCALE);

                drawItemLabel(obj.interactBox, dailyLoot[i]);
            }

            ctx.font = '24px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";

            let itemName = dailyLoot[i].id;
            ctx.drawImage(img[itemName],
                (16*(22 + (i % 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_SIZE/2 - 1) - lootBoxWidth/2)*SCALE,
                16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_SIZE/2 - 1)*SCALE,
                16*2*SCALE,
                16*2*SCALE);
        }
    }

    ctx.restore();
}

function drawInventory()
{
    if(getActiveWindow() != "inventory") return;

    ctx.save();

    ctx.fillStyle = "white";
    ctx.fillRect(16*10*SCALE, 16*7*SCALE, 16*22*SCALE, 16*13*SCALE);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeRect(16*10*SCALE, 16*7*SCALE, 16*22*SCALE, 16*13*SCALE);

    ctx.font = '24px Kenney Mini Square';
    ctx.fillStyle = "black";
    ctx.fillText("inventory", 16*11*SCALE, 16*7.5*SCALE);

    drawButton(buttons.sellItem);
    if(role == "engineer") drawButton(buttons.upgradeMaterial);

    for(let i = 0; i < INVENTORY_SIZE; i++)
    {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.fillStyle = "black";
        // ctx.strokeRect(
        //     16*(11 + (i % 8) * INVENTORY_BOX_SIZE)*SCALE,
        //     16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE)*SCALE,
        //     16*(INVENTORY_BOX_SIZE)*SCALE,
        //     16*(INVENTORY_BOX_SIZE)*SCALE);

        const obj = {
            interactBox: {
                x: 16*(11 + (i % 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN),
                y: 16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_MARGIN),
                width: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN),
                height: 16*(INVENTORY_BOX_SIZE - 2*INVENTORY_BOX_MARGIN)
            }
        };
        
        ctx.strokeRect(
            obj.interactBox.x * SCALE,
            obj.interactBox.y * SCALE,
            obj.interactBox.width * SCALE,
            obj.interactBox.height * SCALE);

        if(i < inventory.length)
        {
            let valid = false;
            switch(inventoryState)
            {
                case INVENTORY_STATES.NORMAL:
                    valid = true;
                    break;
                case INVENTORY_STATES.SELLING:
                    valid = inventory[i].item.type == "food";
                    break;
                case INVENTORY_STATES.UPGRADING:
                    valid = inventory[i].item.type == "material" && !inventory[i].item.upgraded;
                    break;
                default: break;
            }

            if(!valid)
            {
                ctx.fillStyle = "#888888";
                ctx.fillRect(
                    obj.interactBox.x * SCALE,
                    obj.interactBox.y * SCALE,
                    obj.interactBox.width * SCALE,
                    obj.interactBox.height * SCALE);
            }

            if(valid && mouseInteract(obj))
            {
                ctx.fillStyle = "#EEEEEE";
                ctx.fillRect(
                    obj.interactBox.x * SCALE,
                    obj.interactBox.y * SCALE,
                    obj.interactBox.width * SCALE,
                    obj.interactBox.height * SCALE);

                drawItemLabel(obj.interactBox, inventory[i].item);
            }

            ctx.font = '24px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";

            let itemName = inventory[i].item.id;
            ctx.drawImage(img[itemName],
                16*(11 + (i % 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_SIZE/2 - 1)*SCALE,
                16*(9 + Math.floor(i / 8) * INVENTORY_BOX_SIZE + INVENTORY_BOX_SIZE/2 - 1)*SCALE,
                16*2*SCALE,
                16*2*SCALE);

            ctx.strokeStyle = "white";
            ctx.strokeText(inventory[i].amount,
                16*(11 + ((i % 8) + 1) * INVENTORY_BOX_SIZE - 0.25)*SCALE,
                16*(9 + (Math.floor(i / 8) + 1) * INVENTORY_BOX_SIZE - 0.25)*SCALE);

            ctx.fillText(inventory[i].amount,
                16*(11 + ((i % 8) + 1) * INVENTORY_BOX_SIZE - 0.25)*SCALE,
                16*(9 + (Math.floor(i / 8) + 1) * INVENTORY_BOX_SIZE - 0.25)*SCALE);


            if(inventory[i].item.type == "material" && inventory[i].item.upgraded)
            {
                ctx.fillStyle = "orange";
                ctx.fillText("★",
                    16*(11 + ((i % 8) + 1) * INVENTORY_BOX_SIZE - 0.25)*SCALE,
                    16*(9 + (Math.floor(i / 8) + 1) * INVENTORY_BOX_SIZE - 1.75)*SCALE);
            }

            if(inventory[i].item.type == "food" && inventoryState == INVENTORY_STATES.SELLING)
            {
                ctx.font = '18px Kenney Mini Square';
                ctx.fillStyle = "green";
                ctx.textBaseline = "top";
                ctx.textAlign = "left";

                ctx.strokeText("$" + getSellPrice(),
                    16*(11 + ((i % 8) + 0) * INVENTORY_BOX_SIZE + 0.25)*SCALE,
                    16*(9 + (Math.floor(i / 8) + 0) * INVENTORY_BOX_SIZE + 0.2)*SCALE);

                ctx.fillText("$" + getSellPrice(),
                    16*(11 + ((i % 8) + 0) * INVENTORY_BOX_SIZE + 0.25)*SCALE,
                    16*(9 + (Math.floor(i / 8) + 0) * INVENTORY_BOX_SIZE + 0.2)*SCALE);
            }
        }
    }

    ctx.restore();
}

function drawShop()
{
    if(getActiveWindow() != "shop") return;

    ctx.save();

    ctx.fillStyle = "white";
    ctx.fillRect(16*10*SCALE, 16*7*SCALE, 16*22*SCALE, 16*13*SCALE);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.strokeRect(16*10*SCALE, 16*7*SCALE, 16*22*SCALE, 16*13*SCALE);

    ctx.font = "24px Kenney Mini Square";
    ctx.fillStyle = "black";
    ctx.fillText("shop", 16*11*SCALE, 16*7.5*SCALE);

    ctx.font = "16px Kenney Mini Square";
    for(let i = 0; i < shop.length; i++)
    {
        ctx.fillStyle = "black";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(shop[i].name, 16*(11 + (Math.floor(i/5) * 10))*SCALE, 16*(10+((i%5)*2))*SCALE);
        
        if(mouseInteract(shop[i]))
        {
            ctx.fillStyle = "lightgray";
            ctx.fillRect(shop[i].interactBox.x*SCALE, shop[i].interactBox.y*SCALE, shop[i].interactBox.width*SCALE, shop[i].interactBox.height*SCALE);

            // draw shop item description
            ctx.fillStyle = "black";
            ctx.fillText(shop[i].description, 16*16*SCALE, 16*7.5*SCALE);
        }

        ctx.strokeStyle = "gray";
        ctx.strokeRect(shop[i].interactBox.x*SCALE, shop[i].interactBox.y*SCALE, shop[i].interactBox.width*SCALE, shop[i].interactBox.height*SCALE);

        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let price = shop[i].price;

        if(priceMultiplier != 1)
        {
            ctx.fillStyle = "green";
            price = Math.floor(price * priceMultiplier);
        }

        ctx.fillText("$" + price, (shop[i].interactBox.x + shop[i].interactBox.width/2)*SCALE, (shop[i].interactBox.y + shop[i].interactBox.height/2)*SCALE);
    }

    ctx.restore();
}

function drawHeldItemStack()
{
    if(!heldItemStack) return;

    ctx.save();

    ctx.font = '24px Kenney Mini Square';
    ctx.fillStyle = "black";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    let itemName = heldItemStack.item.id;
    ctx.drawImage(img[itemName],
        mouse.x - (16/2)*SCALE,
        mouse.y - (16/2)*SCALE,
        16*SCALE,
        16*SCALE);

    ctx.strokeStyle = "white";
    ctx.strokeText(heldItemStack.amount,
        mouse.x + (16)*SCALE,
        mouse.y + (16)*SCALE);

    ctx.fillText(heldItemStack.amount,
        mouse.x + (16)*SCALE,
        mouse.y + (16)*SCALE);

    ctx.restore();
}

function drawNotification()
{
    if(!currentNotif) return;

    ctx.fillStyle = "black";

    ctx.globalAlpha = 0.9;

    let nb = notificationBox;
    if(nb.x > 16*8)
    {
        nb.x -= 16;
        nb.width += 16;
    }
    ctx.fillRect(nb.x*SCALE, nb.y*SCALE, nb.width*SCALE, nb.height*SCALE);

    ctx.globalAlpha = 1;

    if(nb.x <= 16*8)
    {
        ctx.save();
        currentNotif.draw(ctx, SCALE);
        ctx.restore();
    }
}

export function draw()
{
    labelSelected = null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img.background, 0, 0, img.background.width * SCALE, img.background.height * SCALE);
    
    drawFacilities();
    drawFarmland();
    drawTrees();
    drawVillagers();
    
    drawPaths();

    drawEventEffects();

    drawTitleBar();
    drawActionPanel();
    drawInfoPanel();

    drawLoot();
    drawInventory();
    drawShop();

    drawTooltips();
    drawLabel();
    drawHeldItemStack();
    drawNotification();

    

    DayNotification.draw();


    if(sm.currentScene == sm.SCENE.game)
        requestAnimationFrame(draw);
}