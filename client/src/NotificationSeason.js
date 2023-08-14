import { Notification } from "./Notification.js";

export class NotificationSeason extends Notification {

    constructor(season)
    {
        let text = "the season is now " + season;
        super(text, 3000);
    }

    draw(ctx, scale)
    {
        ctx.font = '24px Kenney Mini Square';
        ctx.fillStyle = "white";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(this.text, 16*21*scale, 16*11*scale);
    }
};