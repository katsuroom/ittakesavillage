const Interactable = require("./Interactable");

class Farmland extends Interactable {
    constructor(locked)
    {
        super();

        this.id = 0;
        this.crop = null;
        this.daysLeft = 0;
        this.locked = locked;
        
        this.infoType = "farmland";
    }
}

module.exports = Farmland;