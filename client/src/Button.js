export class Button {
    constructor(x, y, width, height, hue, text = "")
    {
        this.interactBox = { x, y, width, height };
        this.hue = hue;
        this.text = text;

        this.enabled = true;
    }
}