import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";

let ready = false;

let difficulty = "easy";

const buttons = {
    chief:          new Button(20*16, 4*16, 5.5*16, 1.5*16, "blue", "chief"),
    doctor:         new Button(26*16, 4*16, 5.5*16, 1.5*16, "blue", "doctor"),
    scientist:      new Button(20*16, 6*16, 5.5*16, 1.5*16, "blue", "scientist"),
    sociologist:    new Button(26*16, 6*16, 5.5*16, 1.5*16, "blue", "sociologist"),
    farmer:         new Button(20*16, 8*16, 5.5*16, 1.5*16, "blue", "farmer"),
    engineer:       new Button(26*16, 8*16, 5.5*16, 1.5*16, "blue", "engineer"),

    easy:           new Button(14*16, 0.5*16, 4*16, 1.5*16, "purple", "easy"),
    normal:         new Button(18.5*16, 0.5*16, 4*16, 1.5*16, "purple", "normal"),
    hard:           new Button(23*16, 0.5*16, 4*16, 1.5*16, "purple", "hard"),
    speed:          new Button(9.5*16, 0.5*16, 4*16, 1.5*16, "purple", "speed"),

    ready:          new Button(13.5*16, 20*16, 4*16, 1.5*16, "red", "ready"),
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

socket.on("select_difficulty", (_difficulty) => {
    difficulty = _difficulty;
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

    if(buttonClick(buttons.easy))           { socket.emit("select_difficulty", roomId, "easy"); return; }
    if(buttonClick(buttons.normal))         { socket.emit("select_difficulty", roomId, "normal"); return; }
    if(buttonClick(buttons.hard))           { socket.emit("select_difficulty", roomId, "hard"); return; }
    if(buttonClick(buttons.speed))          { socket.emit("select_difficulty", roomId, "speed"); return; }

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
    canvas.width = 32*16 * SCALE;
    canvas.height = 22*16 * SCALE;

    ready = false;
    Object.values(buttons).forEach(button => button.enabled = true);
    buttons.ready.enabled = false;
    canvas.addEventListener("click", onClick);

    buttons.easy.enabled = isHost;
    buttons.normal.enabled = isHost;
    buttons.hard.enabled = isHost;
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
}

export function draw()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(img.lobby, 0, 0, img.lobby.width * SCALE, img.lobby.height * SCALE);

    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();
    
    ctx.font = "20px Arial Black";
    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(("lobby: " + roomId).toUpperCase(), 1*16*SCALE, 1*16*SCALE);

    ctx.textAlign = "right";
    ctx.fillText((difficulty).toUpperCase(), canvas.width - (16*SCALE), 16*SCALE);

    ctx.textAlign = "left";
    ctx.font = "20px Kenney Mini Square";

    for(let i = 0; i < 6; ++i)
        ctx.fillText((i + 1) + ".", 4*16*SCALE, (4 + i*1.5)*16*SCALE);

    for(let i = 0; i < players.length; i++)
    {
        ctx.fillStyle = "black";
        ctx.fillText(players[i].name, 5*16*SCALE, (4 + i*1.5)*16*SCALE);
        ctx.fillStyle = "gray";
        ctx.fillText(players[i].role, 12*16*SCALE, (4 + i*1.5)*16*SCALE);

        if(players[i].ready)
        {
            ctx.fillStyle = "blue";
            ctx.fillText("ready", 1*16*SCALE, (4 + i*1.5)*16*SCALE);
        }
    }

    Object.values(buttons).forEach(button => drawButton(button));

    // role and difficulty descriptions
    switch(true)
    {
        case mouseInteract(buttons.speed):
            ctx.fillStyle = "purple";
            ctx.font = "20px o mono";
            ctx.fillText("Speed mode", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("8 villagers", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("6 days per season", 3*16*SCALE, 16*16*SCALE);
            ctx.fillText("Easier to upgrade building", 3*16*SCALE, 17*16*SCALE);
            ctx.fillText("More frequent changes in event with standard probability", 3*16*SCALE, 18*16*SCALE);
            break;
        case mouseInteract(buttons.easy):
            ctx.fillStyle = "purple";
            ctx.font = "20px o mono";
            ctx.fillText("Easy difficulty", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("8 villagers", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("Standard event probabilities", 3*16*SCALE, 16*16*SCALE);
            break;
        case mouseInteract(buttons.normal):
            ctx.fillStyle = "purple";
            ctx.font = "20px o mono";
            ctx.fillText("Normal difficulty", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("10 villagers", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("Standard event probabilities", 3*16*SCALE, 16*16*SCALE);
            break;
        case mouseInteract(buttons.hard):
            ctx.fillStyle = "purple";
            ctx.font = "20px o mono";
            ctx.fillText("Normal difficulty", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("12 villagers", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("Bad events only", 3*16*SCALE, 16*16*SCALE);
            break;

        case mouseInteract(buttons.chief):
            ctx.fillStyle = "black";
            ctx.font = "20px o mono";
            ctx.fillText("Chief (required)", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("- The only role who can assign villagers to facilities", 3*16*SCALE, 15*16*SCALE);
            ctx.fillStyle = "cornflowerblue";
            ctx.fillText("- Skill: village reputation increases by 1", 3*16*SCALE, 16*16*SCALE);
            ctx.fillText("- If reputation reaches 3, a new villager joins the village", 3*16*SCALE, 17*16*SCALE);
            break;
        case mouseInteract(buttons.doctor):
            ctx.fillStyle = "black";
            ctx.font = "20px o mono";
            ctx.fillText("Doctor", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("- Can heal 2 sick villagers per day for free", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("- Number of free heals increases per level of housing", 3*16*SCALE, 16*16*SCALE);
            ctx.fillText("- Other players receive 1 free heal per day", 3*16*SCALE, 17*16*SCALE);
            ctx.fillStyle = "cornflowerblue";
            ctx.fillText("- Skill: makes a villager immune from sickness until the next mutation", 3*16*SCALE, 18*16*SCALE);
            break;
        case mouseInteract(buttons.scientist):
            ctx.fillStyle = "black";
            ctx.font = "20px o mono";
            ctx.fillText("Scientist", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("- Makes apple trees available", 3*16*SCALE, 15*16*SCALE);
            ctx.fillStyle = "cornflowerblue";
            ctx.fillText("- Skill: predicts if the next event is good or bad", 3*16*SCALE, 16*16*SCALE);
            break;
        case mouseInteract(buttons.sociologist):
            ctx.fillStyle = "black";
            ctx.font = "20px o mono";
            ctx.fillText("Sociologist", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("- Can view villagers' exact happiness levels (hotkey = shift)", 3*16*SCALE, 15*16*SCALE);
            ctx.fillStyle = "cornflowerblue";
            ctx.fillText("- Skill: eliminates a villager's least effective and least favorite", 3*16*SCALE, 16*16*SCALE);
            ctx.fillText("  task until the next mutation", 3*16*SCALE, 17*16*SCALE);
            break;
        case mouseInteract(buttons.farmer):
            ctx.fillStyle = "black";
            ctx.font = "20px o mono";
            ctx.fillText("Farmer", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("- Seeds planted by the farmer grow faster by 1 day", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("- Can purchase seeds from the shop", 3*16*SCALE, 16*16*SCALE);
            ctx.fillStyle = "cornflowerblue";
            ctx.fillText("- Skill: turns a piece of farmland into fertilized farmland", 3*16*SCALE, 17*16*SCALE);
            ctx.fillText("- Fertilized farmland produce more crops than normal", 3*16*SCALE, 18*16*SCALE);
            break;
        case mouseInteract(buttons.engineer):
            ctx.fillStyle = "black";
            ctx.font = "20px o mono";
            ctx.fillText("Engineer", 3*16*SCALE, 14*16*SCALE);
            ctx.fillText("- Can upgrade materials with money, success chance increases with", 3*16*SCALE, 15*16*SCALE);
            ctx.fillText("  education level", 3*16*SCALE, 16*16*SCALE);
            ctx.fillText("- Upgraded materials increase more progress when used on facilities", 3*16*SCALE, 17*16*SCALE);
            ctx.fillText("- Can purchase steel from the shop", 3*16*SCALE, 18*16*SCALE);
            ctx.fillStyle = "cornflowerblue";
            ctx.fillText("- Skill: converts every brick in inventory into steel", 3*16*SCALE, 19*16*SCALE);
            break;

        default:
            break;
    }

    if(sm.currentScene == sm.SCENE.lobby)
        requestAnimationFrame(draw);
}