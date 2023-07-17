import { Notification } from "./Notification.js";

export class HarvestNotif extends Notification {

    // string, string, int
    constructor(playerName, food, amount)
    {
        let text = playerName + " received " + food + " x" + amount;
        super(text);
    }

    draw(ctx, scale)
    {
        // super.draw(ctx);
        ctx.font = '24px Kenney Mini Square';
        ctx.fillStyle = "white";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(this.text, 16*21*scale, 16*11*scale);
    }
};