import { Notification } from "./Notification.js";
import { drawVillager } from "../global.js";

export class NotificationArrival extends Notification {

    // Event obj
    constructor(villager)
    {
        let text = "a villager has arrived.";
        super(text, 3500);

        this.villager = villager;
    }

    draw(ctx, scale)
    {
        ctx.font = '16px Kenney Mini Square';
        ctx.fillStyle = "lightgreen";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(this.text, 16*21*scale, 16*9*scale);

        drawVillager(this.villager, 16*20, 16*9.25, 2);

        ctx.fillStyle = "white";
        ctx.font = '16px Kenney Mini Square';
        ctx.fillText(this.villager.name, 16*21*scale, 16*13*scale);
    }
};