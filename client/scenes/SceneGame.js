import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import {img} from "../assets.js";

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";
import { HarvestNotif } from "../src/HarvestNotif.js";
import { ItemStack } from "../src/ItemStack.js";


// game variables ////////////////////////////////////////////////////////////////

const INVENTORY_SIZE = 32;

let day = 0;
let season = "";
let daysUntilNextSeason = 0;
let budget = 0;

let villagers = [];             // array of all villagers
let facilities = {};            // dictionary of each of the 4 facilities
let farm = [];                  // array of available farmland

let treesUnlocked = false;      // whether or not trees are unlocked
let trees = [];                 // array of apple trees

let inventory = [];             // array of ItemStack objects in inventory


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
    endTurn: new Button(35*16, 19*16, 6*16, 2*16, 326, "end turn"),
    assignVillager: new Button(1*16, 16*16, 6*16, 1.5*16, 25, "assign"),
    healVillager: new Button(1*16, 17.75*16, 6*16, 1.5*16, 200, "heal"),
    harvestCrop: new Button(1*16, 16*16, 6*16, 1.5*16, 120, "harvest")
};

// socket messages ////////////////////////////////////////////////////////////////

socket.on("day", (_day, _daysUntilNextSeason) => {
    day = _day;
    daysUntilNextSeason = _daysUntilNextSeason;
});

socket.on("season", (_season) => {
    season = _season;
});

socket.on("budget", (_budget) => {
    budget = _budget;
});

socket.on("villagers", (_villagers) => {
    villagers = _villagers;

    if(infoSelected && infoSelected.infoType == "villager")
        infoSelected = villagers.find(obj => obj.name == infoSelected.name);
});

socket.on("facilities", (_facilities) => {
    facilities = _facilities;

    if(infoSelected && infoSelected.infoType == "facility")
        infoSelected = facilities[infoSelected.label];
});

socket.on("inventory", (_inventory) => {
    inventory = _inventory;
});

socket.on("farm", (_farm) => {
    farm = _farm;

    if(infoSelected && infoSelected.infoType == "farmland")
        infoSelected = farm.find(obj => obj.id == infoSelected.id);
});

socket.on("trees", (_trees, _treesUnlocked) => {
    trees = _trees;
    treesUnlocked = _treesUnlocked;
});


// event handlers ////////////////////////////////////////////////////////////////

function onClick(e)
{
    if(getActiveWindow() == "notification") return;

    if(mouseInteract(button.endTurn))
    {
        closeInventory();
        socket.emit("end_turn", roomId);
        return;
    }

    if(infoSelected && infoSelected.infoType == "farmland" && mouseInteract(button.harvestCrop))
    {
        harvestCrop();
        return;
    }

    if(infoSelected && infoSelected.infoType == "villager" && button.assignVillager.enabled && mouseInteract(button.assignVillager))
    {
        startAssign();
        return;
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
            farm.forEach(farmland => {
                if(!farmland.locked && mouseInteract(farmland))
                {
                    if(!heldItemStack || farmland.crop)
                        infoSelected = farmland;
                    else if(heldItemStack.item.type == "seed")
                    {
                        plantCrop(farmland);
                        useItem = true;
                    }
                }
            });
        }

        if(infoSelected) return;

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
                    else
                        infoSelected = facility;
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
            }
        });

        trees.forEach(tree => {
            if(mouseInteract(tree))
            {
                if(selectedVillager)
                {
                    selectedVillager = null;
                    button.assignVillager.enabled = true;
                }
                infoSelected = tree;
            }
        })

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
                heldItemStack = inventory[i];
                closeInventory();
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


// main ////////////////////////////////////////////////////////////////

export function init()
{
    canvas.width = img.background.width * SCALE;
    canvas.height = img.background.height * SCALE;

    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    canvas.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
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

function openInventory()
{
    if(getActiveWindow() != "inventory")
    {
        windowStack.push("inventory");
        heldItemStack = null;
        selectedVillager = null;

        button.assignVillager.enabled = false;
        button.healVillager.enabled = false;
    }
}

function closeInventory()
{
    if(getActiveWindow() == "inventory")
    {
        windowStack.pop();

        button.assignVillager.enabled = true;
        button.healVillager.enabled = true;
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

    useItem();
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

    notifications.push(new HarvestNotif(playerName, foodName, 2));
    triggerNotifications();
}

function giveItem(item, amount)
{
    for(let i = 0; i < inventory.length; i++)
    {
        if(inventory[i].item.id == item.id)
        {
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

    if(heldItemStack.item.id == villager.favoriteFood)
        villager.hunger = 5;
    else
        villager.hunger = Math.min(villager.hunger + 2, 5);

    socket.emit("villager", roomId, villager);

    useItem();
}

function useItem()
{
    heldItemStack.amount--;

    if(heldItemStack.amount == 0)
    {
        // remove item from inventory
        const index = inventory.indexOf(heldItemStack);
        inventory.splice(index, 1);

        heldItemStack = null;
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

function drawFacilities()
{
    ctx.drawImage(img.facilityWater, 176 * SCALE, 112 * SCALE, img.facilityWater.width * SCALE, img.facilityWater.height * SCALE);
    ctx.drawImage(img.facilityEducation, 176 * SCALE, 240 * SCALE, img.facilityEducation.width * SCALE, img.facilityEducation.height * SCALE);
    ctx.drawImage(img.facilityHousing, 368 * SCALE, 240 * SCALE, img.facilityHousing.width * SCALE, img.facilityHousing.height * SCALE);

    Object.values(facilities).forEach(facility => {
        if(getActiveWindow() == "main" && mouseInteract(facility))
            setLabel(facility);
    });
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

        if(getActiveWindow() == "main" && !selectedVillager && !obj.locked && mouseInteract(obj))
            setLabel(obj);
    });
}

function drawTrees()
{
    trees.forEach(obj => {

        if(!treesUnlocked)
        {
            ctx.drawImage(img.plant, obj.interactBox.x * SCALE, obj.interactBox.y * SCALE, 16 * SCALE, 16 * SCALE);

            if(getActiveWindow() == "main" && mouseInteract(obj))
                setLabel(obj);
        }
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
            let villager = infoSelected;

            drawVillager(villager, 3*16, 2.5*16, 2);
            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(villager.name, 16*4*SCALE, 16*6*SCALE);

            ctx.font = '16px Kenney Mini Square';

            let textLeft = [
                "status: ",
                "happiness: ",
                "hunger: ",
                "most eff: ",
                "least eff: ",
                "most fav: ",
                "least fav: ",
                "favorite: "
            ];

            let textRight = [
                villager.sick == true ? "sick" : "healthy",
                villager.happiness + " / 100",
                villager.hunger + " / 5",
                villager.mostEffectiveTask,
                villager.leastEffectiveTask,
                villager.mostFavoriteTask,
                villager.leastFavoriteTask,
                villager.favoriteFood
            ];  

            for(let i = 0; i < textLeft.length; i++)
            {
                ctx.textAlign = "left";
                ctx.fillText(textLeft[i], 16 * SCALE, 16 * (i * 0.75 + 8) * SCALE);
                ctx.textAlign = "right";
                ctx.fillText(textRight[i], 16 * 7 * SCALE, 16 * (i * 0.75 + 8) * SCALE);
            }

            ctx.textAlign = "right";
            ctx.fillText(villager.currentTask ? villager.currentTask : "(none)", 16 * 7 * SCALE, 16 * 15 * SCALE);
            ctx.textAlign = "left";
            ctx.fillText("working:", 16 * SCALE, 16 * 15 * SCALE);
            
            drawButton(button.assignVillager);
            drawButton(button.healVillager);

            break;
        }
        case "facility":
        {
            let facility = infoSelected;
            
            ctx.font = '32px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText(facility.label, 16*4*SCALE, 16*7*SCALE);

            ctx.font = '16px Kenney Mini Square';
            ctx.fillText("level: " + facility.level, 16*4*SCALE, 16*9*SCALE);
            ctx.fillText("progress: " + facility.progress + " / " + facility.progressMax, 16*4*SCALE, 16*10*SCALE);

            ctx.fillText("assigned villagers:", 16*4*SCALE, 16*12*SCALE);

            let villagerCount = 0;
            facility.assignedVillagers.forEach(villager => {
                ctx.fillText(villager, 16*4*SCALE, 16*(13 + villagerCount)*SCALE);
                villagerCount++;
            });

            if(villagerCount == 0)
                ctx.fillText("(none)", 16*4*SCALE, 16*13*SCALE);

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
            ctx.font = '24px Kenney Mini Square';
            ctx.fillStyle = "black";
            ctx.textAlign = "center";
            ctx.fillText("unidentified", 16*4*SCALE, 16*7*SCALE);
            ctx.fillText("plant", 16*4*SCALE, 16*8*SCALE);

            ctx.textAlign = "left";

            break;
        }
        default:
            break;
    }
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
    ctx.fillText(daysUntilNextSeason + " days until fall", 16*35*SCALE, 16*4*SCALE);

    ctx.fillText("current event: ", 16*35*SCALE, 16*6*SCALE);
    ctx.fillText("next event: ", 16*35*SCALE, 16*8*SCALE);

    drawButton(button.endTurn);
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
            if(mouseInteract(obj))
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

    ctx.drawImage(img.background, 0, 0, img.background.width * SCALE, img.background.height * SCALE);
    
    drawFacilities();
    drawFarmland();
    drawVillagers();
    
    drawTrees();
    drawActionPanel();
    drawInfoPanel();
    drawInventory();
    drawLabel();
    drawHeldItemStack();
    drawNotification();

    if(sm.currentScene == sm.SCENE.game)
        requestAnimationFrame(draw);
}