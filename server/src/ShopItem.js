const Interactable = require("./Interactable");

class ShopItem extends Interactable {
    constructor(name, id, price, stock, description)
    {
        super();

        this.name = name;       // string
        this.id = id;           // string
        this.price = price;     // int
        this.stock = stock;     // int, -1 if unlimited stock
        this.description = description // string
    }
}

module.exports = ShopItem;