class Player {
    constructor(name, id)
    {
        this.name = name;
        this.id = id;

        this.role = "";
        this.lootAmount = 2;
        this.ready = false;
    }
};

module.exports = Player;