export class Notification {
    constructor(text)
    {
        this.text = text;
    }

    draw(ctx)
    {
        console.log(this.text);
    }
}