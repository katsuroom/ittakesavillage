const Interactable = require("./Interactable");

class Tree extends Interactable {
    constructor()
    {
        super();

        this.daysLeft = 0;
        this.cut = false;
        
        this.infoType = "tree";
    }
}

module.exports = Tree;