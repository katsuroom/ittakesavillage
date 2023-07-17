export class TextField {
    constructor(x, y, width, height, label = "")
    {
        this.interactBox = { x, y, width, height };
        this.label = label;
        this.text = "";
    }
}