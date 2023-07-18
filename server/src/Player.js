class Player {
    constructor(name, id)
    {
        this.name = name;
        this.id = id;

        this.role = "";
        this.ready = false;
    }
};

module.exports = Player;