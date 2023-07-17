const Item = require("./Item");

class Seed extends Item {
    constructor(name, id, food)
    {
        super(name, id, "seed");

        this.food = food;
    }
};

module.exports = Seed;