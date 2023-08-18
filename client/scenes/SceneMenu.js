import * as global from "../global.js";
Object.entries(global).forEach(([name, exported]) => window[name] = exported);

import * as sm from "../src/SceneManager.js";
import { Button } from "../src/Button.js";
import { TextField } from "../src/TextField.js";


const buttons = {
    hostGame: new Button(3*16, 4*16, 6*16, 2*16, "pink", "host game"),
    reconnect: new Button(10*16, 4*16, 6*16, 2*16, "pink", "reconnect"),
    joinGame: new Button(7*16, 11*16, 6*16, 2*16, "pink", "join game")
};

const textFields = {
    playerName: new TextField(5*16, 2*16, 10*16, 1*16, "player name", 20),
    roomCode: new TextField(7*16, 9*16, 6*16, 1*16, "room code", 4),
};

let selectedTextField = null;

let errorMessage = "";


function onClick(e)
{
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

    if(buttonClick(buttons.hostGame))
    {
        playerName = textFields.playerName.text;
        socket.emit("host_game", playerName);
        sm.loadScene(sm.SCENE.lobby);
        return;
    }

    if(buttonClick(buttons.reconnect))
    {
        // reconnect previous game
        if(localStorage.prevGame)
        {
            let prevGame = JSON.parse(localStorage.prevGame);
            console.log(prevGame);
            roomId = prevGame.roomId;
            socket.emit("reconnect", prevGame.roomId, prevGame.socketId);
        }
    }

    if(buttonClick(buttons.joinGame))
    {
        playerName = textFields.playerName.text;
        socket.emit("join_game", playerName, textFields.roomCode.text);
        return;
    }

    selectedTextField = null;
}

function onKeyDown(e)
{
    if(sm.currentScene != sm.SCENE.menu) return;

    if(selectedTextField)
    {
        if(e.key.length == 1)
        {
            if(selectedTextField.text.length < selectedTextField.charLimit)
                selectedTextField.text += e.key;
            
            if(selectedTextField == textFields.roomCode) errorMessage = "";
        }
        else if(e.key == "Backspace")
        {
            selectedTextField.text = selectedTextField.text.substring(0, selectedTextField.text.length - 1);
            if(selectedTextField == textFields.roomCode) errorMessage = "";
        }

        buttons.hostGame.enabled = (textFields.playerName.text.length > 0);
        buttons.joinGame.enabled = (textFields.playerName.text.length > 0 && textFields.roomCode.text.length > 0);
    }
}

socket.on("join_lobby", () => {
    sm.loadScene(sm.SCENE.lobby);
});

socket.on("error_message", (_message) => {
    errorMessage = _message;
});

socket.on("reconnect", (_player) => {
    playerName = _player.name;
    role = _player.role;

    sm.loadScene(sm.SCENE.game);
});


export function init()
{
    canvas.width = 320 * SCALE;
    canvas.height = 240 * SCALE;

    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    buttons.hostGame.enabled = false;
    buttons.joinGame.enabled = false;

    canvas.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);

    buttons.reconnect.enabled = localStorage.prevGame != null;
}

export function exit()
{
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
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
    drawButton(buttons.reconnect);

    ctx.fillStyle = "red";
    ctx.fillText(errorMessage, 10*16*SCALE, 13.5*16*SCALE);

    if(sm.currentScene == sm.SCENE.menu)
        requestAnimationFrame(draw);
}