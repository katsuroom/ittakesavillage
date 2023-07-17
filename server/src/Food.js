const Item = require("./Item");

class Food extends Item {
    constructor(name, id)
    {
        super(name, id, "food");
    }
};

module.exports = Food;