export class Notification {
    constructor(text, duration)
    {
        this.text = text;
        this.duration = duration;
    }

    draw(ctx)
    {
        console.log(this.text);
    }
}