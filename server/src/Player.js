class Player {
    constructor(name, id)
    {
        this.name = name;
        this.id = id;

        this.role = "";
        this.ready = false;
        this.connected = false;

        this.questsComplete = 0;
    }
};

module.exports = Player;