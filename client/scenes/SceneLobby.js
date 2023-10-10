import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import {img} from "../assets.js";

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";

let ready = false;

const buttons = {
    chief:          new Button(16*16, 4*16, 6*16, 1.5*16, "blue", "chief"),
    doctor:         new Button(16*16, 6*16, 6*16, 1.5*16, "blue", "doctor"),
    scientist:      new Button(16*16, 8*16, 6*16, 1.5*16, "blue", "scientist"),
    sociologist:    new Button(16*16, 10*16, 6*16, 1.5*16, "blue", "sociologist"),
    farmer:         new Button(16*16, 12*16, 6*16, 1.5*16, "blue", "farmer"),
    engineer:       new Button(16*16, 14*16, 6*16, 1.5*16, "blue", "engineer"),
    ready:          new Button(4*16, 16*16, 6*16, 1.5*16, "red", "ready"),
};

socket.on("refresh_lobby", (_players, _roomId) => {
    players = _players;
    roomId = _roomId;
});

socket.on("select_role", (_role) => {
    role = _role;

    if(role == "")
        buttons.ready.enabled = false;
    else
        buttons.ready.enabled = true;
});

socket.on("refresh_roles", (_rolesPresent) => {

    rolesPresent = _rolesPresent;

    for(const [role, present] of Object.entries(_rolesPresent))
        buttons[role].enabled = !present;
});

socket.on("start_game", () => {
    localStorage.prevGame = JSON.stringify({roomId, socketId, inventory: []});

    sm.loadScene(sm.SCENE.game);
});

function onClick(e)
{
    if(ready) return;

    if(buttonClick(buttons.chief))          { socket.emit("select_role", roomId, "chief"); return; }
    if(buttonClick(buttons.doctor))         { socket.emit("select_role", roomId, "doctor"); return; }
    if(buttonClick(buttons.scientist))      { socket.emit("select_role", roomId, "scientist"); return; }
    if(buttonClick(buttons.sociologist))    { socket.emit("select_role", roomId, "sociologist"); return; }
    if(buttonClick(buttons.farmer))         { socket.emit("select_role", roomId, "farmer"); return; }
    if(buttonClick(buttons.engineer))       { socket.emit("select_role", roomId, "engineer"); return; }

    if(buttonClick(buttons.ready))
    {
        socket.emit("ready", roomId);
        ready = true;
        Object.values(buttons).forEach(button => button.enabled = false);

        return;
    }

    socket.emit("select_role", roomId, "");
}

export function init()
{
    ready = false;
    Object.values(buttons).forEach(button => button.enabled = true);
    buttons.ready.enabled = false;
    canvas.addEventListener("click", onClick);
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
}

export function draw()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img.menu, 0, 0, img.menu.width * SCALE, img.menu.height * SCALE);

    ctx.font = "20px Arial Black";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText(("lobby: " + roomId).toUpperCase(), 2*16*SCALE, 2*16*SCALE);

    ctx.font = "20px Kenney Mini Square";
    for(let i = 0; i < players.length; i++)
    {
        ctx.fillStyle = "black";
        ctx.fillText(players[i].name, 4*16*SCALE, (5 + i*1.5)*16*SCALE);
        ctx.fillStyle = "gray";
        ctx.fillText(players[i].role, 11*16*SCALE, (5 + i*1.5)*16*SCALE);

        if(players[i].ready)
        {
            ctx.fillStyle = "blue";
            ctx.fillText("!", 3.5*16*SCALE, (5 + i*1.5)*16*SCALE);
        }
    }

    Object.values(buttons).forEach(button => drawButton(button));

    if(sm.currentScene == sm.SCENE.lobby)
        requestAnimationFrame(draw);
}