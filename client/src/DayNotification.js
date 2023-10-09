// notification for when a turn ends

import { canvas, ctx, SCALE } from "../global.js";

export class DayNotification {

    // constant
    static lifetime = 180;             // frames text is visible for
    static fadeThreshold = 30;        // life at which text starts fading

    // variable
    static text = "";
    static life = 0;

    static reset(day)                   // new day number
    {
        DayNotification.text = "day " + day;
        DayNotification.life = DayNotification.lifetime;
    }

    static draw()
    {
        if(DayNotification.life > 0)
        {
            ctx.save();

            ctx.fillStyle = "black";

            if(DayNotification.life < DayNotification.fadeThreshold)
                ctx.globalAlpha = DayNotification.life / DayNotification.fadeThreshold;

            // ctx.fillRect(16*19.5*SCALE, 16*4.5*SCALE, 16*3*SCALE, 16*1*SCALE);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 8;

            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "32px Kenney Mini Square";
            
            ctx.strokeText(DayNotification.text, canvas.width/2, 16*5*SCALE);
            ctx.fillText(DayNotification.text, canvas.width/2, 16*5*SCALE);

            ctx.restore();
            
            DayNotification.life--;
        }
    }

};