const Interactable = require("./Interactable");

class Factory extends Interactable {
    constructor()
    {
        super();

        this.bricks = 0;            // int, can increase indefinitely
        this.brickProgress = 0;     // int, max = 10
        
        this.infoType = "factory";
        this.label = "factory";
    }
}

module.exports = Factory;