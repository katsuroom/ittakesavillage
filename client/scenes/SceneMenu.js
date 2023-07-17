import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import { Button } from "../src/Button.js";
import { TextField } from "../src/TextField.js";

import { loadScene } from "../index.js";


const buttons = {
    hostGame: new Button(7*16, 4*16, 6*16, 2*16, 326, "host game"),
    joinGame: new Button(7*16, 11*16, 6*16, 2*16, 326, "join game")
};

const textFields = {
    playerName: new TextField(5*16, 2*16, 10*16, 1*16, "player name"),
    roomCode: new TextField(7*16, 9*16, 6*16, 1*16, "room code"),
};

let selectedTextField = null;


canvas.addEventListener("click", (e) => {

    if(currentScene != SCENE.menu) return;

    if(mouseInteract(textFields.playerName))
    {
        selectedTextField = textFields.playerName;
        return;
    }

    if(mouseInteract(textFields.roomCode))
    {
        selectedTextField = textFields.roomCode;
        return;
    }

    if(mouseInteract(buttons.hostGame))
    {
        playerName = textFields.playerName.text;
        // loadScene(SCENE.game);
        return;
    }

    selectedTextField = null;
});

window.addEventListener("keydown", (e) => {

    if(currentScene != SCENE.menu) return;

    if(selectedTextField)
    {
        if(e.key.length == 1)
            selectedTextField.text += e.key;
        else if(e.key == "Backspace")
            selectedTextField.text = selectedTextField.text.substring(0, selectedTextField.text.length - 1);
    }
});


export function init()
{
    canvas.width = 320 * SCALE;
    canvas.height = 240 * SCALE;

    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
}

function drawTextField(textField)
{
    ctx.save();

    ctx.strokeStyle = (selectedTextField == textField) ? "dodgerblue" : "black";
    ctx.strokeRect(
        textField.interactBox.x * SCALE,
        textField.interactBox.y * SCALE,
        textField.interactBox.width * SCALE,
        textField.interactBox.height * SCALE);

    ctx.font = "20px Kenney Mini Square";
   
    ctx.textAlign = "left";

    if(textField.text == "")
    {
        ctx.fillStyle = "gray";
        ctx.fillText(textField.label,
            (textField.interactBox.x + 4) * SCALE,
            textField.interactBox.y * SCALE);
    }
    else
    {
        ctx.fillStyle = "black";
        ctx.fillText(textField.text,
            (textField.interactBox.x + 4) * SCALE,
            textField.interactBox.y * SCALE);
    }

    ctx.restore();
}

export function draw()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.font = '20px Kenney Mini Square';
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText("or", 10*16*SCALE, 7*16*SCALE);

    drawTextField(textFields.playerName);
    drawTextField(textFields.roomCode);
    drawButton(buttons.hostGame);
    drawButton(buttons.joinGame);

    if(currentScene == SCENE.menu)
        requestAnimationFrame(draw);
}