const Item = require("./Item");

class Material extends Item {
    constructor(name, id, progress)
    {
        super(name, id, "material");

        this.progress = progress;
    }
};

module.exports = Material;