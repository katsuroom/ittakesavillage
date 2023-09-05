const Interactable = require("./Interactable");

class Farmland extends Interactable {
    constructor(locked)
    {
        super();

        this.id = 0;
        this.crop = null;
        this.daysLeft = 0;
        this.locked = locked;
        this.fertilized = false;

        this.amount = 0;
        
        this.infoType = "farmland";
    }
}

module.exports = Farmland;