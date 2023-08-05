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

        this.cost = {
            "brick": 0,
            "steel": 0
        };
    }
}

module.exports = Facility;