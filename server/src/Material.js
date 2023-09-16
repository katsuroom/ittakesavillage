const Item = require("./Item");

class Material extends Item {
    constructor(name, id, progress, upgradedProgress)
    {
        super(name, id, "material");

        this.progress = progress;
        this.upgradedProgress = upgradedProgress;
        this.upgraded = false;
    }

    clone()
    {
        return new Material(this.name, this.id, this.progress, this.upgradedProgress);
    }
};

module.exports = Material;