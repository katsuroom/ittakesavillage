import { Notification } from "./Notification.js";

export class NotificationEvent extends Notification {

    // Event obj
    constructor(event, image)
    {
        let text = "New event";
        super(text, 3000);

        this.image = image;
        this.description = event.description;
    }

    draw(ctx, scale)
    {
        // super.draw(ctx);
        ctx.font = '16px Kenney Mini Square';
        ctx.fillStyle = "white";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(this.text, 16*21*scale, 16*9*scale);

        ctx.drawImage(this.image, 16*18*scale, 16*10*scale, 16*6*scale, 16*2.5*scale);

        ctx.font = '16px Kenney Mini Square';
        ctx.fillText(this.description, 16*21*scale, 16*13*scale);
    }
};