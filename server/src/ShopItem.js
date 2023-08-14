const Interactable = require("./Interactable");

class ShopItem extends Interactable {
    constructor(name, id, price, stock)
    {
        super();

        this.name = name;       // string
        this.id = id;           // string
        this.price = price;     // int
        this.stock = stock;     // int, -1 if unlimited stock
    }
}

module.exports = ShopItem;