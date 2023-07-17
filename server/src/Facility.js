const Interactable = require("./Interactable");

class Facility extends Interactable {
    constructor()
    {
        super();

        this.level = 1;
        this.progress = 0;
        this.progressMax = 50;
        this.assignedVillagers = [];    // string array of villager names
        
        this.infoType = "facility";
    }
}

module.exports = Facility;