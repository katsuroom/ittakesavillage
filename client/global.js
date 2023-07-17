export const socket = io("ws://localhost:5000");

export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d", { willReadFrequently: true });

export const SCALE = 2;


// scene management ////////////////////////////////////////////////////////////////

export const SCENE = {
    menu: 0,
    game: 1,
};

export let currentScene = undefined;


// mouse events ////////////////////////////////////////////////////////////////

export let mouse = {x: 0, y: 0};

canvas.addEventListener("mousemove", (e) => {
    let rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * window.devicePixelRatio;
    mouse.y = (e.clientY - rect.top) * window.devicePixelRatio;
});


// game variables ////////////////////////////////////////////////////////////////
export let playerName = "";


// functions ////////////////////////////////////////////////////////////////

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
    // let tilesX = Math.floor(button.interactBox.width / 16);
    // let tilesY = Math.floor(button.interactBox.height / 16);
    
    // for(let i = 0; i < tilesY; i++)
    // {
    //     for(let j = 0; j < tilesX; j++)
    //     {
    //         let imgX = 0;
    //         let imgY = 0;

    //         if(j == 0) imgX = 0;
    //         else if(j < tilesX - 1) imgX = 16;
    //         else if(j == tilesX - 1) imgX = 2 * 16;

    //         if(i == 0) imgY = 0;
    //         else if(i < tilesY - 1) imgY = 16;
    //         else if(i == tilesY - 1) imgY = 2 * 16;

    //         ctx.drawImage(img.buttonLarge,
    //             imgX, imgY,
    //             16, 16,
    //             (button.interactBox.x + j * 16) * SCALE,
    //             (button.interactBox.y + i * 16) * SCALE,
    //             16 * SCALE, 16 * SCALE);
    //     }
    // }

    ctx.fillStyle = "hsl(" + button.hue + ", 100%, 70%)";
    ctx.fillRect(
        button.interactBox.x * SCALE,
        button.interactBox.y * SCALE,
        button.interactBox.width * SCALE,
        button.interactBox.height * SCALE);

    ctx.fillStyle = "hsl(" + button.hue + ", 100%, 75%)";
    ctx.fillRect(
        (button.interactBox.x + 1) * SCALE,
        (button.interactBox.y + 1) * SCALE,
        (button.interactBox.width - 2) * SCALE,
        (button.interactBox.height - 2) * SCALE);

    ctx.fillStyle = "hsl(" + button.hue + ", 100%, 70%)";
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