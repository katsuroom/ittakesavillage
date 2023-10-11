import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import {img} from "../assets.js";

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";

const buttons = {
    menu: new Button(16*10, 16*18, 6*16, 2*16, "red", "menu"),
}

function onClick(e)
{
    if(buttonClick(buttons.menu))
    {
        sm.loadScene(sm.SCENE.menu);
    }
}

export function init()
{
    canvas.width = img.menu.width * SCALE;
    canvas.height = img.menu.height * SCALE;

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
    ctx.fillText("credits", canvas.width / 2, 16*3*SCALE);

    ctx.font = "24px Arial";
    ctx.textAlign = "left";

    ctx.fillText("Game developed by:", 16*3*SCALE, 16*6*SCALE);
    ctx.fillText("Kerrance Dai, Boming Zheng, and Paul Zou", 16*3*SCALE, 16*7*SCALE);

    ctx.fillText("Art by:", 16*3*SCALE, 16*9*SCALE);
    ctx.fillText("Paul Zou and kenney.nl", 16*3*SCALE, 16*10*SCALE);

    ctx.fillText("Music: \"神隠しの真相\" by しゃろう", 16*3*SCALE, 16*12*SCALE);
    ctx.fillText("Provided by DOVA-SYNDROME", 16*3*SCALE, 16*13*SCALE);

    ctx.fillText("Sound effects by:", 16*3*SCALE, 16*15*SCALE);
    ctx.fillText("ObsydianX (itch.io)", 16*3*SCALE, 16*16*SCALE);

    drawButton(buttons.menu);

    if(sm.currentScene == sm.SCENE.credits)
        requestAnimationFrame(draw);
}