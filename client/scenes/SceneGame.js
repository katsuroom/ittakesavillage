import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import {img} from "../assets.js";

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";
import { HarvestNotif } from "../src/HarvestNotif.js";
import { ItemStack } from "../src/ItemStack.js";


// game variables ////////////////////////////////////////////////////////////////

const INVENTORY_SIZE = 32;
const UPGRADE_MATERIAL_COST = 10;
const HEAL_VILLAGER_COST = 100;

let game = null;                //Holding all game info
let currentTurn = 0;

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
let factory = null;
let farm = [];                  // array of available farmland

let treesUnlocked = false;      // whether or not trees are unlocked
let trees = [];                 // array of apple trees

let inventory = [];             // array of ItemStack objects in inventory

let dailyLoot = [];             // array of available loot items
let lootAmount = 0;


// role specific

let healChances = 0;            // for doctor only
let isUpgrading = false;        // for engineer only


// ui ////////////////////////////////////////////////////////////////

const INVENTORY_BOX_SIZE = 2.5;
const INVENTORY_BOX_MARGIN = 0.1;
const NOTIFICATION_TIME = 1500;     // number of milliseconds notifications display for

let heldItemStack = null;           // currently held item stack
let selectedVillager = null;        // currently selected villager for assigning

let infoSelected = null;            // current selected Interactable object in info panel
let labelSelected = null;           // current highlighted Interactable object label

let windowStack = ["main"];         // stack of open windows

let notifications = [];             // list of notification cards
let currentNotif = null;            // currently displayed notification

// buttons ////////////////////////////////////////////////////////////////

const button = {
    endTurn: new Button(35*16, 19*16, 6*16, 2*16, "pink", "end turn"),

    assignVillager: new Button(1*16, 16*16, 6*16, 1.5*16, "orange", "assign"),
    healVillager: new Button(1*16, 17.75*16, 6*16, 1.5*16, "blue", "heal"),
    redeemQuest: new Button(1*15.5, 19.5*16, 6*16, 1.5*16, "green", "redeem"),

    collectBricks: new Button(1*16, 16*16, 6*16, 1.5*16, "red", "collect"),
    harvestCrop: new Button(1*16, 16*16, 6*16, 1.5*16, "green", "harvest"),
    
    pickTree: new Button(1*16, 16*16, 6*16, 1.5*16, "green", "pick apple"),
    cutTree: new Button(1*16, 17.75*16, 6*16, 1.5*16, "red", "cut"),

    upgradeMaterial: new Button(27*16, 7.25*16, 4*16, 1.5*16, "red", "🡅 $" + UPGRADE_MATERIAL_COST),
    upgradeFacility: new Button(1*16, 19.5*16, 6*16, 1.5*16, "red", "upgrade")
    
};

// socket messages ////////////////////////////////////////////////////////////////
socket.on("game", (_game) => {
    game = _game;
})

socket.on("change_turn", (_currentTurn) => {
    currentTurn = _currentTurn;

    button.endTurn.enabled = isCurrentTurn();
    button.assignVillager.enabled = role == "chief" && isCurrentTurn();
    button.redeemQuest.enabled = isCurrentTurn();

    button.collectBricks.enabled = factory.bricks > 0 && isCurrentTurn();
    button.harvestCrop.enabled = isCurrentTurn();
    button.pickTree.enabled = isCurrentTurn();
    button.cutTree.enabled = isCurrentTurn();

    button.upgradeMaterial.enabled = role == "engineer" && isCurrentTurn() && budget >= UPGRADE_MATERIAL_COST;

    healChances = role == "doctor" ? 3 : 1;
    if(rolesPresent["doctor"])
        button.healVillager.text = `heal (${healChances})`;

    if(selectedInfoType("villager"))
    {
        infoSelected = villagers.find(obj => obj.name == infoSelected.name);
        refreshHealButton();
    }
});

socket.on("daily_loot", (_loot, amount) => {
    windowStack.push("daily_loot");

    dailyLoot = _loot;
    lootAmount = amount;
});

socket.on("day", (_day, _daysUntilNextSeason) => {
    day = _day;
    daysUntilNextSeason = _daysUntilNextSeason;
});

socket.on("season", (_season, _nextSeason) => {
    season = _season;
    nextSeason = _nextSeason;
});

socket.on("event", (_event, _nextEvent) => {
    event = _event;
    nextEvent = _nextEvent;
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
    villagers = _villagers;

    if(selectedInfoType("villager"))
        infoSelected = villagers.find(obj => obj.name == infoSelected.name);
});

socket.on("paths", (_paths) => {
    paths = _paths;
});

socket.on("facility", (_facility) => {
    facilities[_facility.label] = _facility;

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

socket.on("factory", (_factory) => {
    factory = _factory;
    button.collectBricks.enabled = factory.bricks > 0;

    if(selectedInfoType("factory"))
        infoSelected = factory;
});

socket.on("inventory", (_inventory) => {
    inventory = _inventory;
});

socket.on("farm", (_farm) => {
    farm = _farm;

    if(selectedInfoType("farmland"))
        infoSelected = farm.find(obj => obj.id == infoSelected.id);
});

socket.on("trees", (_trees, _treesUnlocked) => {
    trees = _trees;
    treesUnlocked = _treesUnlocked;

    for(let i = 0; i < trees.length; i++)
    {
        trees[i].interactBox.x = 16 * (i % 8 + 23);
        trees[i].interactBox.width = 16;

        if(treesUnlocked)
        {
            trees[i].interactBox.y = 16 * 2.5;
            trees[i].interactBox.height = 24;
        }
        else
        {
            trees[i].interactBox.y = 16 * 3;
            trees[i].interactBox.height = 16;
        }
    }

    if(selectedInfoType("tree"))
    {
        infoSelected = trees.find(obj => obj.id == infoSelected.id);
        let tree = infoSelected;
        button.pickTree.enabled = tree.daysLeft == 0 && !tree.cut;
        button.cutTree.enabled = !tree.cut;
    }
});

socket.on("give_item", (_item, _amount) => {
    giveItem(_item, _amount);
});

socket.on("heal_chances", (_healChances) => {
    healChances = _healChances;
});

socket.on("quest_result", (_result) => {
    if(_result != undefined){
        button.redeemQuest.enabled = false;
        giveItem(_result, 3);
    }
});


// event handlers ////////////////////////////////////////////////////////////////

function onClick(e)
{
    if(getActiveWindow() == "notification") return;

    if(buttonClick(button.endTurn))
    {
        closeInventory();
        socket.emit("end_turn", roomId);
        return;
    }

    if(selectedInfoType("factory") && buttonClick(button.collectBricks))
    {
        socket.emit("collect_bricks", roomId);
        return;
    }

    if(selectedInfoType("farmland") && buttonClick(button.harvestCrop))
    {
        harvestCrop();
        return;
    }

    if(selectedInfoType("facility") && buttonClick(button.upgradeFacility))
    {
        socket.emit("upgrade_facility", roomId, infoSelected);
        return;
    }

    if(selectedInfoType("villager"))
    {
        if(buttonClick(button.assignVillager))
        {
            startAssign();
            return;
        }
        else if(buttonClick(button.healVillager))
        {
            healVillager();
            return;
        }
        else if(buttonClick(button.redeemQuest)){
            redeemQuest();
            return;
        }
        
    }

    if(selectedInfoType("tree"))
    {
        if(buttonClick(button.pickTree))
        {
            pickTree();
            return;
        }
        
        else if(buttonClick(button.cutTree))
        {
            cutTree();
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

        if(!selectedVillager)
        {
            if(mouseInteract(factory))
            {
                infoSelected = factory;
                button.collectBricks.enabled = factory.bricks > 0;
                return;
            }

            for(let i = 0; i < farm.length; i++)
            {
                let farmland = farm[i];
                if(!farmland.locked && mouseInteract(farmland))
                {
                    if(!heldItemStack || farmland.crop)
                    {
                        infoSelected = farmland;
                        return;
                    }
                    else if(heldItemStack.item.type == "seed")
                    {
                        plantCrop(farmland);
                        useItem = true;
                        break;
                    }
                }
            }
        }

        if(!useItem)
        {
            Object.values(facilities).forEach(facility => {
                if(mouseInteract(facility))
                {
                    if(selectedVillager)
                    {
                        finishAssign(facility);
                        infoSelected = prevSelected;
                    }
                    else if(heldItemStack && heldItemStack.item.type == "material")
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
                if(selectedVillager)
                {
                    selectedVillager = null;
                    button.assignVillager.enabled = true;
                }
                infoSelected = villager;
                //redeem button
                button.redeemQuest.enabled = !villager.quest.redeemed;
                refreshHealButton();

                if(rolesPresent["doctor"])
                    button.healVillager.text = `heal (${healChances})`;
                else
                    button.healVillager.text = `heal ($${HEAL_VILLAGER_COST})`;
            }
        });

        trees.forEach(tree => {
            if(mouseInteract(tree))
            {
                if(isCurrentTurn())
                {
                    button.pickTree.enabled = tree.daysLeft == 0 && !tree.cut;
                    button.cutTree.enabled = !tree.cut;
                }

                infoSelected = tree;
            }
        });

        if(infoSelected) return;

        // past this point: nothing was clicked

        if(useItem)
        {
            infoSelected = prevSelected;
            return;
        }

        if(selectedVillager)
        {
            finishAssign(null);
            infoSelected = prevSelected;
            return;
        }

        heldItemStack = null;
    }

    if(getActiveWindow() == "inventory")
    {
        if(!isCurrentTurn() || lootAmount > 0) return;

        if(buttonClick(button.upgradeMaterial))
        {
            isUpgrading = true;
            button.upgradeMaterial.enabled = false;
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
                if(!isUpgrading)
                {
                    heldItemStack = inventory[i];
                    closeInventory();
                }
                else if(inventory[i].item.type == "material")
                {
                    upgradeMaterial(inventory[i]);
                    button.upgradeMaterial.enabled = budget >= UPGRADE_MATERIAL_COST;
                    isUpgrading = false;
                }
            }
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
                    break;
                }
            }
        }
    }
}

function onKeyDown(e)
{
    if(getActiveWindow() == "notification") return;

    switch(e.key)
    {
        case 'e':
        {
            if(getActiveWindow() == "inventory")
                closeInventory();
            else
                openInventory();

            break;
        }
        default:
            break;
    }
}

function onMouseDown(e)
{
    if(e.button == 2) // right click
    {
        if(getActiveWindow() == "main")
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
        if(movingVillager)
            moveVillager();

        movingVillager = null;
    }
}

// main ////////////////////////////////////////////////////////////////

export function init()
{
    canvas.width = img.background.width * SCALE;
    canvas.height = img.background.height * SCALE;

    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    canvas.addEventListener("click", onClick);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("mousedown", onMouseDown);
    canvas.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("keydown", onKeyDown);
}

function isCurrentTurn()    // bool
{
    return players[currentTurn].id == socketId;
}

function triggerNotifications()
{
    if(notifications.length > 0)
    {
        closeInventory();
        windowStack.push("notification");
        currentNotif = notifications[0];
        setTimeout(() => {
            currentNotif = null;
            notifications.shift();
            windowStack.pop();
            triggerNotifications();
        }, NOTIFICATION_TIME);
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

function openInventory()
{
    if(getActiveWindow() != "inventory")
    {
        windowStack.push("inventory");
        heldItemStack = null;
        selectedVillager = null;

        button.assignVillager.enabled = false;
        button.healVillager.enabled = false;
        button.redeemQuest.enabled = false;
    }
}

function closeInventory()
{
    if(getActiveWindow() == "inventory")
    {
        windowStack.pop();

        button.assignVillager.enabled = role == "chief" && isCurrentTurn();
        refreshRedeemButton();
        refreshHealButton();
        if(isUpgrading)
        {
            isUpgrading = false;
            button.upgradeMaterial.enabled = true;
        }
    }
}

function setLabel(obj)
{
    labelSelected = obj;
}

function plantCrop(farmland)
{
    farmland.crop = heldItemStack.item;
    farmland.daysLeft = 4;
    farmland.label = farmland.daysLeft + " days";
    socket.emit("farm", roomId, farm);

    useItem(heldItemStack);
}

function harvestCrop()
{
    let farmland = infoSelected;
    let foodName = farmland.crop.food.name;
    giveItem(farmland.crop.food, 2);

    farmland.crop = null;
    farmland.label = "empty";
    socket.emit("farm", roomId, farm);

    infoSelected = null;

    // notifications.push(new HarvestNotif(playerName, foodName, 2));
    // triggerNotifications();
}

function pickTree()
{
    let tree = infoSelected;
    socket.emit("pick_tree", roomId, tree.id);
}

function cutTree()
{
    let tree = infoSelected;
    socket.emit("cut_tree", roomId, tree.id);
}

function giveItem(item, amount)
{
    for(let i = 0; i < inventory.length; i++)
    {
        if(inventory[i].item.id == item.id)
        {
            if(inventory[i].item.type == "material" && inventory[i].item.upgraded != item.upgraded)
                continue;

            inventory[i].amount += amount;
            return;
        }
    }

    inventory.push(new ItemStack(item, amount));
}

function startAssign()
{
    heldItemStack = null;

    selectedVillager = infoSelected;
    button.assignVillager.enabled = false;
}

function finishAssign(facility)
{
    if(facility == facilities["power"] && facilities["power"].assignedVillagers.length > 0)
    {
        button.assignVillager.enabled = true;
        return;
    }

    // villager is assigned to same facility
    if(selectedVillager.currentTask == facility.label)
    {
        selectedVillager = null;
        button.assignVillager.enabled = true;
        return;
    }

    // remove villager from current assigned facility
    let oldFacility = null;

    if(selectedVillager.currentTask)
    {
        oldFacility = facilities[selectedVillager.currentTask];

        for(let i = 0; i < oldFacility.assignedVillagers.length; i++)
        {
            if(oldFacility.assignedVillagers[i] == selectedVillager.name)
            {
                oldFacility.assignedVillagers.splice(i, 1);
                break;
            }
        }
    }

    // add villager to new facility
    facilities[facility.label].assignedVillagers.push(selectedVillager.name);


    if(facility)
        selectedVillager.currentTask = facility.label;
    else
        selectedVillager.currentTask = null;

    socket.emit("assign_villager", roomId, selectedVillager, oldFacility, facility);

    selectedVillager = null;
    button.assignVillager.enabled = true;
}

function isHoldingFood()        // bool
{
    return heldItemStack && heldItemStack.item.type == "food";
}

function feedVillager(villager)
{
    villager.fed = true;
    if(heldItemStack.item.id == villager.favoriteFood){
        villager.hunger = 5;
        villager.favoriteFoodFedDays += 1;
    }
        
    else{
        villager.favoriteFoodFedDays = 0;
        villager.hunger = Math.min(villager.hunger + 2, 5);
    }
        

    socket.emit("villager", roomId, villager);

    useItem(heldItemStack);
}

function healVillager()
{
    let villager = infoSelected;
    villager.sick = false;
    villager.labelColor = "white";

    if(rolesPresent["doctor"])
    {
        healChances--;
        button.healVillager.text = `heal (${healChances})`;
    }
    else
        spendBudget(HEAL_VILLAGER_COST);

    socket.emit("villager", roomId, villager);
}

function redeemQuest()
{
    let villager = infoSelected;
    socket.emit("quest", roomId, villager);
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
    if(facility.progress == facility.progressMax)
    {
        if(facility.cost[heldItemStack.item.id] > 0)
        {
            facility.cost[heldItemStack.item.id]--;
            useItem(heldItemStack);
            socket.emit("facility", roomId, facility);
        }
    }
    else
    {   
        facility.progress += heldItemStack.item.progress;
        if(facility.progress > facility.progressMax)
            facility.progress = facility.progressMax;

        useItem(heldItemStack);
        socket.emit("facility", roomId, facility);
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
}

function upgradeMaterial(itemStack)
{
    spendBudget(UPGRADE_MATERIAL_COST);

    let success = 0;
    switch(facilities["education"].level)
    {
        case 1: success = 0.6; break;
        case 2: success = 0.7; break;
        case 3: success = 0.8; break;
        case 4: success = 0.9; break;
        case 5: success = 1.0; break;
        default: break;
    }

    if(Math.random() < success)
    {
        let newItem = Object.assign({}, itemStack.item);
        newItem.name += "★";
        newItem.progress = newItem.upgradedProgress;
        newItem.upgraded = true;

        useItem(itemStack);
        giveItem(newItem, 1);
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

    if(lootAmount == 0)
        windowStack.pop();
}

// refresh ////////////////////////////////////////////////////////////////
function refreshRedeemButton()
{
    let holder = false;
    villagers.forEach((e) => {
        holder = holder || (e == infoSelected && !e.quest.redeemed)
    })
    if(holder)
        button.redeemQuest.enabled = isCurrentTurn();
    
}

function refreshHealButton()
{
    button.healVillager.enabled = false;

    if(!isCurrentTurn() || !selectedInfoType("villager"))
        return;

    if(infoSelected.sick)
    {
        if(rolesPresent["doctor"])
            button.healVillager.enabled = healChances > 0;
        else
            button.healVillager.enabled = budget >= HEAL_VILLAGER_COST;
    }
}

function refreshUpgradeFacilityButton()
{
    button.upgradeFacility.enabled = false;
    
    if(isCurrentTurn() && selectedInfoType("facility") && infoSelected.progress == infoSelected.progressMax)
    {
        let enable = true;

        if(infoSelected.label != "power")
        {
            Object.values(infoSelected.cost).forEach(amount => {
                if(amount > 0)
                    enable = false;
            });
        }

        button.upgradeFacility.enabled = enable;
    }
}

// drawing ////////////////////////////////////////////////////////////////

function drawLabel()
{
    if(labelSelected == null) return;

    let obj = labelSelected;

    ctx.font = "16px Kenney Mini Square";
    let textRect = ctx.measureText(obj.label);
    let textWidth = textRect.width;
    let textHeight = textRect.fontBoundingBoxAscent + textRect.fontBoundingBoxDescent;
    let padding = 8;

    ctx.fillStyle = "black";
    ctx.fillRect(
        (obj.interactBox.x + obj.interactBox.width/2) * SCALE - textWidth/2 - padding,
        (obj.interactBox.y * SCALE) - 32 - padding/2,
        textWidth + 2 * padding,
        textHeight + padding);

    ctx.fillStyle = obj.labelColor;
    ctx.fillText(obj.label, (obj.interactBox.x + obj.interactBox.width/2) * SCALE - textRect.width/2, (obj.interactBox.y * SCALE) - 32);
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

function drawVillager(villager, x, y, scale)
{
    ctx.drawImage(img.villagerShirt,
        x * SCALE,
        (y - 16) * SCALE,
        16 * scale * SCALE, 32 * scale * SCALE);
    
    let shirtData = ctx.getImageData(
        x * SCALE,
        y * SCALE,
        16 * scale * SCALE, 32 * scale * SCALE);

    for(let i = 0; i < shirtData.data.length; i += 4)
    {
        if(shirtData.data[i] == 255 && shirtData.data[i+1] == 0 && shirtData.data[i+2] == 255)
        {
            shirtData.data[i] = villager.shirtColor.r;
            shirtData.data[i+1] = villager.shirtColor.g;
            shirtData.data[i+2] = villager.shirtColor.b;
        }
    }

    ctx.putImageData(shirtData, 
        x * SCALE,
        y * SCALE);

    ctx.drawImage(img.villagerHeadarms,
        x * SCALE,
        (y - 16) * SCALE,
        16 * scale * SCALE, 32 * scale * SCALE);

    ctx.drawImage(img.villagerHair,
        x * SCALE,
        (y - 16) * SCALE,
        16 * scale * SCALE, 32 * scale * SCALE);

    let hairData = ctx.getImageData(
        x * SCALE,
        (y - 16) * SCALE,
        16 * scale * SCALE, 24 * scale * SCALE);

    for(let i = 0; i < hairData.data.length; i += 4)
    {
        if(hairData.data[i] == 255 && hairData.data[i+1] == 0 && hairData.data[i+2] == 255)
        {
            hairData.data[i] = villager.hairColor.r;
            hairData.data[i+1] = villager.hairColor.g;
            hairData.data[i+2] = villager.hairColor.b;
        }

        // turn skin green if sick
        if(villager.sick && i > hairData.data.length / 2)
        {
            if(hairData.data[i] == 255 && hairData.data[i+1] == 215 && hairData.data[i+2] == 190)
            {
                hairData.data[i] = 180;
                hairData.data[i+1] = 240;
                hairData.data[i+2] = 170;
            }
        }
    }

    ctx.putImageData(hairData,
        x * SCALE,
        (y - 16) * SCALE);
}

function drawVillagers()
{
    villagers.forEach(villager => {

        drawVillager(villager,
            villager.position.x * 16 + 128,
            villager.position.y * 16,
            1);


        // draw food popup

        if(isHoldingFood() && !villager.fed && villager.hunger < 5)
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

            if(mouseInteract(obj))
            {
                ctx.fillStyle = "lightgray";
                setLabel(null);
            }
            else
                ctx.fillStyle = "white";


            ctx.fillRect(
                obj.interactBox.x * SCALE,
                obj.interactBox.y * SCALE,
                16*SCALE, 16*SCALE);

            ctx.drawImage(img[villager.favoriteFood],
                (villager.position.x * 16 + 128 + 2) * SCALE,
                (villager.position.y * 16 - 20) * SCALE,
                12*SCALE, 12*SCALE);

            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.strokeRect(
                obj.interactBox.x * SCALE,
                obj.interactBox.y * SCALE,
                16*SCALE, 16*SCALE);

            

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

    ctx.drawImage(img.powerOff, 16*16*SCALE, 16*1*SCALE, img.powerOff.width * SCALE, img.powerOn.height * SCALE);

    Object.values(facilities).forEach(facility => {
        if(getActiveWindow() == "main" && mouseInteract(facility))
            setLabel(facility);
    });
}

function drawFactory()
{
    if(!factory) return;

    if(heldItemStack && heldItemStack.item.type == "material")
        return;

    if(getActiveWindow() == "main" && !selectedVillager && mouseInteract(factory))
        setLabel(factory);
}

function drawFarmland()
{
    farm.forEach(obj => {
        let farmImg = obj.locked ? img.farmlandLocked : img.farmland;
        ctx.drawImage(farmImg, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);

        if(obj.crop)
        {
            let cropImg = obj.daysLeft == 0 ? img[obj.crop.food.id] : img.plant;
            ctx.drawImage(cropImg, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);
        }

        if(heldItemStack && heldItemStack.item.type == "material")
            return;

        if(getActiveWindow() == "main" && !selectedVillager && !obj.locked && mouseInteract(obj))
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

            ctx.drawImage(image, obj.interactBox.x * SCALE, (obj.interactBox.y - 8) * SCALE, 16 * SCALE, 32 * SCALE);
        }
        else
            ctx.drawImage(img.plant, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);

        

        if(getActiveWindow() == "main" && mouseInteract(obj))
            setLabel(obj);
    });
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
            const Y_MULTIPLIER = 0.85;
            let villager = infoSelected;
            let questValue = null;
            drawVillager(villager, 3*16, 2.5*16 * Y_MULTIPLIER, 2);
            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(villager.name, 16*4*SCALE, 16*6*SCALE * Y_MULTIPLIER);

            ctx.font = '16px Kenney Mini Square';

            let textLeft = [
                "status: ",
                "happiness: ",
                "hunger: ",
                "most eff: ",
                "least eff: ",
                "most fav: ",
                "least fav: ",
                "favorite: ",
                "Quest status: ",
                "Quest: "
            ];

            switch(villager.quest.criteria){
                case "happiness": questValue = (role == "sociologist" ? game.totalHappiness : "?")+ " / 100"; break;
                case "education": questValue = game.facilities.education.level+ " / 5"; break;
                case "house": questValue = game.facilities.housing.level+ " / 5"; break;
                case "water": questValue = game.facilities.water.level+ " / 5"; break;
                case "farm": questValue = game.facilities.farming.level+ " / 5"; break;
                case "power": questValue = game.facilities.power.level+ " / 2"; break;
                case "quest": questValue = game.finishedQuest; break;
                case "money": questValue = game.budget + "$"; break;
                case "keepFeedFavorite": questValue = villager.favoriteFoodFedDays+ " Days"; break;
                case "participateBuilding": questValue = villager.participatedBuildings.length+ " / 5"; break;
                case "nosickAll": questValue = game.nosickAll+ " Days"; break;
                case "nosick": questValue = villager.nosick + " Days"; break;
                case "sick": questValue = game.totalSick+ " people"; break;
                case "notWorking": questValue = villager.notworking+ " Days"; break;
            }
            
            let textRight = [
                villager.sick == true ? "sick" : "healthy",
                (role == "sociologist" ? villager.happiness : "?") + " / 100",
                villager.hunger + " / 5",
                villager.mostEffectiveTask,
                villager.leastEffectiveTask,
                villager.mostFavoriteTask,
                villager.leastFavoriteTask,
                villager.favoriteFood,
                questValue,
            ];  

            for(let i = 0; i < textLeft.length; i++)
            {   
                ctx.fillStyle = "black";
                ctx.globalAlpha = 1;
                if(textLeft[i] == "Quest status: "){
                    if(villager.quest.redeemed) ctx.globalAlpha = 0.3;
                    ctx.textAlign = "left";
                    ctx.fillText(textLeft[i], 16 * SCALE, 16 * (i * 0.75 + 8) * SCALE * Y_MULTIPLIER * 1.03);
                    ctx.textAlign = "right";
                    ctx.fillStyle = villager.quest.fulfilled && !villager.quest.redeemed? 'green' : ctx.fillStyle;
                    ctx.fillText(textRight[i], 16 * 7 * SCALE, 16 * (i * 0.75 + 8) * SCALE * Y_MULTIPLIER * 1.03);   
                }
                else if(textLeft[i] == "Quest: ")
                {
                    if(villager.quest.redeemed) ctx.globalAlpha = 0.3;
                    ctx.textAlign = "left";
                    ctx.fillText(textLeft[i], 16 * SCALE, 16 * (i * 0.75 + 8) * SCALE * Y_MULTIPLIER * 1.025);
                    ctx.textAlign = "left";
                    wrapText(ctx, villager.quest.questString,  16 * SCALE, 16 * (i * 0.75*1.1 + 8) * SCALE* Y_MULTIPLIER* 1.025, 16 * 6.4 * SCALE , (0.75 + 8) * SCALE);
                    // ctx.fillText(textRight[i], 16 * 7 * SCALE, 16 * (i * 0.75 + 8) * SCALE); 
                }
                else 
                {
                    ctx.textAlign = "left";
                    ctx.fillText(textLeft[i], 16 * SCALE, 16 * (i * 0.75 + 8) * SCALE * Y_MULTIPLIER);
                    ctx.textAlign = "right";
                    ctx.fillText(textRight[i], 16 * 7 * SCALE, 16 * (i * 0.75 + 8) * SCALE * Y_MULTIPLIER);   
                }     
            }
            
            ctx.globalAlpha = 1;
            ctx.fillStyle = "black";
            ctx.textAlign = "right";
            ctx.fillText(villager.currentTask ? villager.currentTask : "(none)", 16 * 7 * SCALE, 16 * 15 * SCALE);
            ctx.textAlign = "left";
            ctx.fillText("working:", 16 * SCALE, 16 * 15 * SCALE);
            
            drawButton(button.assignVillager);
            drawButton(button.healVillager);
            drawButton(button.redeemQuest);

            break;
        }
        case "facility":
        {
            let facility = infoSelected;

            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";

            if(facility.label == "power")
            {
                ctx.fillText(facility.label, 16*4*SCALE, 16*7*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText("level: " + facility.level, 16*4*SCALE, 16*9*SCALE);
                ctx.fillText("progress: " + facility.progress + " / " + facility.progressMax, 16*4*SCALE, 16*10*SCALE);
            }
            else
            {
                ctx.fillText(facility.label, 16*4*SCALE, 16*4*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText("level: " + facility.level, 16*4*SCALE, 16*6*SCALE);
                ctx.fillText("progress: " + facility.progress + " / " + facility.progressMax, 16*4*SCALE, 16*7*SCALE);

                ctx.fillStyle = facility.progress == facility.progressMax ? "black" : "gray";
                ctx.fillText("upgrade cost", 16*4*SCALE, 16*9*SCALE);
                let i = 0;
                for (const [item, amount] of Object.entries(facility.cost)) {
                    ctx.fillText(item + ": " + amount, 16*4*SCALE, 16*(10+i)*SCALE);
                    i++;
                }
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

            drawButton(button.upgradeFacility);
            
            ctx.textAlign = "left";
            break;
        }
        case "factory":
        {
            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText("factory", 16*4*SCALE, 16*7*SCALE);

            ctx.font = '16px Kenney Mini Square';
            ctx.fillText("bricks: " + factory.bricks, 16*4*SCALE, 16*9*SCALE);
            ctx.fillText("brick progress: " + factory.brickProgress + " / 10", 16*4*SCALE, 16*10*SCALE);
            ctx.textAlign = "left";

            drawButton(button.collectBricks);
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

                if(farmland.daysLeft == 0)
                {
                    ctx.fillText(farmland.label + " to harvest", 16*4*SCALE, 16*11*SCALE);
                    drawButton(button.harvestCrop);
                }
                else
                    ctx.fillText(farmland.label + " until mature", 16*4*SCALE, 16*11*SCALE);
            }
            else
            {
                ctx.font = '16px Kenney Mini Square';
                ctx.fillText(farmland.label, 16*4*SCALE, 16*10*SCALE);
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

                ctx.drawImage(image, 16*3 * SCALE, 16*5 * SCALE, 16*2 * SCALE, 32*2 * SCALE);
                ctx.fillText(tree.label, 16*4*SCALE, 16*10*SCALE);

                ctx.font = '16px Kenney Mini Square';
                ctx.fillText(text, 16*4*SCALE, 16*12*SCALE);

                if(!tree.cut)
                {
                    if(tree.daysLeft == 0)
                        drawButton(button.pickTree);
                    drawButton(button.cutTree);
                }
            }
            else
            {
                ctx.font = '24px Kenney Mini Square';
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

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
  
    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + ' ';
      var metrics = context.measureText(testLine);
      var testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
}

function drawActionPanel()
{
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
        ctx.drawImage(img["event_" + event.id], 16*35*SCALE, 16*7*SCALE, 16*6*SCALE, 16*2.5*SCALE);
        ctx.strokeRect(16*35*SCALE, 16*7*SCALE, 16*6*SCALE, 16*2.5*SCALE);
    }
    // ctx.fillText(event ? event.name : "", 16*35*SCALE, 16*7*SCALE);

    ctx.fillText("next event: ", 16*35*SCALE, 16*11*SCALE);
    ctx.fillText(nextEvent ? nextEvent.name : "", 16*35*SCALE, 16*12*SCALE);

    drawButton(button.endTurn);
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

    if(role == "engineer") drawButton(button.upgradeMaterial);

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
            if(isUpgrading && inventory[i].item.type != "material")
            {
                ctx.fillStyle = "#888888";
                ctx.fillRect(
                    obj.interactBox.x * SCALE,
                    obj.interactBox.y * SCALE,
                    obj.interactBox.width * SCALE,
                    obj.interactBox.height * SCALE);
            }

            if((!isUpgrading || inventory[i].item.type == "material") && mouseInteract(obj))
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
        }
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
    ctx.fillRect(16*8*SCALE, 16*8*SCALE, 16*26*SCALE, 16*6*SCALE);

    ctx.save();
    currentNotif.draw(ctx, SCALE);
    ctx.restore();
}

export function draw()
{
    labelSelected = null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img.background, 0, 0, img.background.width * SCALE, img.background.height * SCALE);
    
    drawFacilities();
    drawFactory();
    drawFarmland();
    drawVillagers();
    
    drawTrees();
    drawPaths();

    drawActionPanel();
    drawInfoPanel();

    drawLoot();
    drawInventory();

    drawLabel();
    drawHeldItemStack();
    drawNotification();

    if(sm.currentScene == sm.SCENE.game)
        requestAnimationFrame(draw);
}