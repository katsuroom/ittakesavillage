import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";

let ready = false;

const buttons = {
    chief: new Button(13*16, 2*16, 6*16, 1.5*16, "blue", "chief"),
    doctor: new Button(13*16, 4*16, 6*16, 1.5*16, "blue", "doctor"),
    scientist: new Button(13*16, 6*16, 6*16, 1.5*16, "blue", "scientist"),
    sociologist: new Button(13*16, 8*16, 6*16, 1.5*16, "blue", "sociologist"),
    farmer: new Button(13*16, 10*16, 6*16, 1.5*16, "blue", "farmer"),
    engineer: new Button(13*16, 12*16, 6*16, 1.5*16, "blue", "engineer"),
    ready: new Button(1*16, 12*16, 6*16, 1.5*16, "red", "ready"),
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

    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.font = '20px Kenney Mini Square';
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.fillText("lobby: " + roomId, 1*16*SCALE, 1*16*SCALE);

    for(let i = 0; i < players.length; i++)
    {
        ctx.fillStyle = "black";
        ctx.fillText(players[i].name, 1*16*SCALE, (3 + i*1.5)*16*SCALE);
        ctx.fillStyle = "orange";
        ctx.fillText(players[i].role, 8*16*SCALE, (3 + i*1.5)*16*SCALE);

        if(players[i].ready)
        {
            ctx.fillStyle = "blue";
            ctx.fillText("!", 0.5*16*SCALE, (3 + i*1.5)*16*SCALE);
        }
    }

    Object.values(buttons).forEach(button => drawButton(button));
    

    if(sm.currentScene == sm.SCENE.lobby)
        requestAnimationFrame(draw);
}