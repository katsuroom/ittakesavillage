export class TextField {
    constructor(x, y, width, height, label = "", charLimit)
    {
        this.interactBox = { x, y, width, height };
        this.label = label;
        this.charLimit = charLimit;
        this.text = "";
    }
}