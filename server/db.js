const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GameSchema = new Schema({
    roomId: {type: String},
    playerCount: {type: Number},
    days: []
}, {timestamps: true});


const GameModel = mongoose.model("game", GameSchema);


function addNewGame(game)
{
    let model = GameModel({
        roomId: game.roomId,
        playerCount: game.players.length,
        days: []
    });

    model.save();

    addDay(game);
}

function addNewGame1(game)
{
    console.log("Room ID: " + game.roomId);
    console.log("Players: " + game.players.length);
}

function addDay1(game)
{
    let day = {
        budget: game.budget,
        event: game.event.name,
        player: {},
        villagers: [],
        facilities: [],
        actions: game.actions
    };

    day.player = {
        name: game.players[game.currentTurn].name,
        role: game.players[game.currentTurn].role
    };

    game.villagers.forEach(villager => {
        day.villagers.push({
            name: villager.name,
            sick: villager.sick,
            hunger: villager.hunger,
            happiness: villager.happiness
        });
    });

    for (let [key, value] of Object.entries(game.facilities))
    {
        day.facilities.push({
            name: key,
            level: value.level,
            progress: value.progress
        });
    }

    console.log("Room ID: " + game.roomId);
    console.log(day);

    game.actions = [];
}

async function addDay(game)
{
    let day = {
        day: game.day,
        budget: game.budget,
        event: game.event.name,
        player: {},
        villagers: [],
        facilities: [],
        // actions: game.actions
        actions: []
    };

    day.player = {
        name: game.players[game.currentTurn].name,
        role: game.players[game.currentTurn].role
    };

    game.villagers.forEach(villager => {
        day.villagers.push({
            name: villager.name,
            sick: villager.sick,
            hunger: villager.hunger,
            happiness: villager.happiness
        });
    });

    for (let [key, value] of Object.entries(game.facilities))
    {
        day.facilities.push({
            name: key,
            level: value.level,
            progress: value.progress
        });
    }

    try
    {
        let models = await GameModel.find({roomId: game.roomId});
        let model = models[0];

        if(model.days.length > 0)
            model.days[model.days.length - 1].actions = game.actions;

        model.days.push(day);

        let index = model.days.length - 1;
        model.markModified(`days.${index}`);
        model.save();
    }
    catch(err)
    {
        console.log(err);
        console.log("Room ID: " + game.roomId);
        console.log(day);
    }
    
    game.actions = [];
}

module.exports = {
    addNewGame, addDay
};