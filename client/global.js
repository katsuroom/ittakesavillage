export const socket = io("ws://localhost:5000");

export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });

export const SCALE = 2;

import {img} from "../assets.js";


// mouse events ////////////////////////////////////////////////////////////////

export let mouse = {x: 0, y: 0};

canvas.addEventListener("mousemove", (e) => {
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
});


// game variables ////////////////////////////////////////////////////////////////

export let players = [];
export let rolesPresent = {};
export let npcPresent = {};

export let playerName = "";
export let role = "";
export let roomId = "";
export let socketId = "";


// functions ////////////////////////////////////////////////////////////////

export function buttonClick(button)
{
    if(!button.enabled) return false;

    return mouseInteract(button);
}

export function mouseInteract(obj)
{
    if(mouse.x < obj.interactBox.x * SCALE) return false;
    if(mouse.x > obj.interactBox.x * SCALE + obj.interactBox.width * SCALE) return false;
    if(mouse.y < obj.interactBox.y * SCALE) return false;
    if(mouse.y > obj.interactBox.y * SCALE + obj.interactBox.height * SCALE) return false;
    return true;
}

export function drawButton(button)
{
    ctx.fillStyle = button.colorA;
    ctx.fillRect(
        button.interactBox.x * SCALE,
        button.interactBox.y * SCALE,
        button.interactBox.width * SCALE,
        button.interactBox.height * SCALE);

    ctx.fillStyle = button.colorB;
    ctx.fillRect(
        (button.interactBox.x + 1) * SCALE,
        (button.interactBox.y + 1) * SCALE,
        (button.interactBox.width - 2) * SCALE,
        (button.interactBox.height - 2) * SCALE);

    ctx.fillStyle = button.colorA;
    ctx.fillRect(
        (button.interactBox.x + 3) * SCALE,
        (button.interactBox.y + 3) * SCALE,
        (button.interactBox.width - 6) * SCALE,
        (button.interactBox.height - 6) * SCALE);

    ctx.save();

    ctx.font = "24px Kenney Mini Square";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(button.text,
        (button.interactBox.x + button.interactBox.width / 2) * SCALE,
        (button.interactBox.y + button.interactBox.height / 2 - 3) * SCALE);

    if(button.enabled && mouseInteract(button))
    {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
            button.interactBox.x * SCALE,
            button.interactBox.y * SCALE,
            button.interactBox.width * SCALE,
            button.interactBox.height * SCALE);
    }

    if(!button.enabled)
    {
        ctx.fillStyle = "black";
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
            button.interactBox.x * SCALE,
            button.interactBox.y * SCALE,
            button.interactBox.width * SCALE,
            button.interactBox.height * SCALE);
    }

    ctx.restore();
}

export function drawVillager(villager, x, y, scale)
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