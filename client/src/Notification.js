export class Notification {
    constructor(text, duration)
    {
        this.text = text;
        this.duration = duration;
    }

    draw(ctx, scale)
    {
        ctx.font = "24px Kenney Mini Square";
        ctx.fillStyle = "white";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(this.text, 16*21*scale, 16*11*scale);
    }
}