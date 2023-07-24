export const socket = io("ws://localhost:5000");

export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });

export const SCALE = 2;


// mouse events ////////////////////////////////////////////////////////////////

export let mouse = {x: 0, y: 0};

canvas.addEventListener("mousemove", (e) => {
    let rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * window.devicePixelRatio;
    mouse.y = (e.clientY - rect.top) * window.devicePixelRatio;
});


// game variables ////////////////////////////////////////////////////////////////

export let players = [];

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