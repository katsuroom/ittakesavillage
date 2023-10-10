import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import {img} from "../assets.js";

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";

class Record
{
    constructor(name, value)
    {
        this.name = name;
        this.value = value;
    }
}

let records = [];

let game = null;


const buttons = {
    menu: new Button(16*10, 16*18, 6*16, 2*16, "red", "menu"),
}

socket.on("game", (_game) => {
    game = _game;

    records = [
        new Record("day", game.day),
        new Record("villagers remaining", game.villagers.length),
        new Record("budget remaining", game.budget),
        new Record("average happiness", game.villagers.reduce((a, b) => a + b.happiness, 0) /  game.villagers.length),
        new Record("quests completed", game.villagers.reduce((a, b) => a + (b.quest ? 0 : 1), 0)),
        new Record("most quests completed", game.players.reduce((a, b) => b.questsComplete > a.questsComplete ? b : a, game.players[0]).name),
    ];
});

function onClick(e)
{
    if(buttonClick(buttons.menu))
    {
        sm.loadScene(sm.SCENE.menu);

        players = [];
        rolesPresent = {};
        npcPresent = {};

        playerName = "";
        role = "";
        roomId = "";
        socketId = "";
        inventory = [];
    }
}

export function init()
{
    canvas.width = img.menu.width * SCALE;
    canvas.height = img.menu.height * SCALE;

    socket.emit("game", roomId);

    canvas.addEventListener("click", onClick);
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
}

export function draw()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.font = "48px Kenney Mini Square";
    ctx.textAlign = "center";
    ctx.fillText("you win!", canvas.width / 2, 16*3*SCALE);

    ctx.font = "20px Kenney Mini Square";

    ctx.textAlign = "left";
    for(let i = 0; i < records.length; i++)
        ctx.fillText(records[i].name, 16*4*SCALE, 16*(6+(1.5*i))*SCALE);

    ctx.textAlign = "right";
    for(let i = 0; i < records.length; i++)
        ctx.fillText(records[i].value, 16*21*SCALE, 16*(6+(1.5*i))*SCALE);

    drawButton(buttons.menu);

    if(sm.currentScene == sm.SCENE.win)
        requestAnimationFrame(draw);
}