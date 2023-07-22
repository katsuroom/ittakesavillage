const Interactable = require("./Interactable");

class Tree extends Interactable {
    constructor()
    {
        super();

        this.id = 0;

        this.daysLeft = 0;
        this.cut = false;
        
        this.infoType = "tree";
    }
}

module.exports = Tree;