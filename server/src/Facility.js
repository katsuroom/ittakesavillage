const Interactable = require("./Interactable");

class Facility extends Interactable {
    constructor(progressMax)
    {
        super();

        this.level = 1;
        this.progress = 0;
        this.progressMax = progressMax;
        this.assignedVillagers = [];    // string array of villager names
        
        this.infoType = "facility";
    }
}

module.exports = Facility;