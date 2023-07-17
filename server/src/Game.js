class Game {
    constructor(roomId)
    {
        this.roomId = roomId;
        this.players = [];
        this.ongoing = false;
    }
};

module.exports = Game;