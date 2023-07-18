// server setup ////////////////////////////////////////////////////////////////

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {});

app.use(express.static("../client"));

httpServer.listen(5000);


// game variables ////////////////////////////////////////////////////////////////

const Game = require("./src/Game.js");
const Player = require("./src/Player.js");

const MAX_PLAYERS = 6;


// lobby ////////////////////////////////////////////////////////////////

let games = {};     // dictionary of waiting and ongoing games, key = roomId

function hostGame(socket, playerName)
{
    console.log("host: " + socket.id);

    let roomId = generateRoomId();
    let game = new Game(roomId);
    game.players.push(new Player(playerName, socket.id));

    socket.emit("refresh_lobby", game.players, roomId);

    games[roomId] = game;
}

function joinGame(socket, playerName, roomId)
{
    roomId = roomId.toLowerCase();

    if(games[roomId])
    {
        if(games[roomId].players.length == MAX_PLAYERS)
        {
            socket.emit("error_message", "game is full");
            return;
        }

        if(games[roomId].started)
        {
            socket.emit("error_message", "game has already started");
            return;
        }

        games[roomId].players.push(new Player(playerName, socket.id));
        socket.emit("join_lobby");
        socket.emit("refresh_roles", games[roomId].rolesPresent);

        games[roomId].players.forEach(player => {
            io.sockets.to(player.id).emit("refresh_lobby", games[roomId].players, roomId);
        });
    }
    else
        socket.emit("error_message", "game not found");
}

function generateRoomId()   // returns 4 letter string
{
    let roomId = "";
    const characters = "abcdefghijklmnopqrstuvwxyz";
    for(let i = 0; i < 4; i++)
        roomId += characters.charAt(Math.floor(Math.random() * characters.length));

    // check for existing id
    if(games[roomId])
        return generateRoomId();

    return roomId;
}

function selectRole(socket, roomId, newRole)
{
    // if role is not taken
    if(newRole != "" && !games[roomId].rolesPresent[newRole])
    {
        // set role to true
        games[roomId].rolesPresent[newRole] = true;

        let player = games[roomId].players.find(player => player.id == socket.id);

        // free old role
        if(player.role != "") games[roomId].rolesPresent[player.role] = false;

        player.role = newRole;
        socket.emit("select_role", newRole);

        games[roomId].players.forEach(player => {
            io.sockets.to(player.id).emit("refresh_roles", games[roomId].rolesPresent);
            io.sockets.to(player.id).emit("refresh_lobby", games[roomId].players, roomId);
        });
    }

    else if(newRole == "")
    {
        let player = games[roomId].players.find(player => player.id == socket.id);

        // player already has no role, do nothing
        if(player.role == "") return;

        games[roomId].rolesPresent[player.role] = false;
        player.role = newRole;
        socket.emit("select_role", newRole);

        games[roomId].players.forEach(player => {
            io.sockets.to(player.id).emit("refresh_roles", games[roomId].rolesPresent);
            io.sockets.to(player.id).emit("refresh_lobby", games[roomId].players, roomId);
        });
    }
}

function ready(socket, roomId)
{
    let player = games[roomId].players.find(player => player.id == socket.id);
    player.ready = true;

    let start = true;
    games[roomId].players.forEach(player => {
        if(!player.ready)
        start = false;
    });

    games[roomId].players.forEach(player => {
        io.sockets.to(player.id).emit("refresh_lobby", games[roomId].players, roomId);
    });

    if(start)
        startGame(roomId);
}

function startGame(roomId)
{
    let game = games[roomId];

    game.initPaths();
    game.initVillagers();
    game.initFacilities();
    game.initItems();
    game.initFarmland();
    game.initTrees();
    game.started = true;

    game.players.forEach(player => {
        io.sockets.to(player.id).emit("start_game");

        io.sockets.to(player.id).emit("day", game.day, game.daysUntilNextSeason);
        io.sockets.to(player.id).emit("season", game.season);
        io.sockets.to(player.id).emit("budget", game.budget);
        io.sockets.to(player.id).emit("villagers", game.villagers);
        io.sockets.to(player.id).emit("facilities", game.facilities);
        io.sockets.to(player.id).emit("inventory", game.inventory);
        io.sockets.to(player.id).emit("farm", game.farm);
        io.sockets.to(player.id).emit("trees", game.trees, false);
    });
}

function disconnect(socket)
{
    console.log("disconnected: " + socket.id);

    // remove player from game
    let found = false;
    for (const [id, game] of Object.entries(games))
    {
        for(let j = 0; j < games[id].players.length; j++)
        {
            if(socket.id == games[id].players[j].id)
            {
                // free role
                if(games[id].players[j].role != "") games[id].rolesPresent[games[id].players[j].role] = false;

                games[id].players.splice(j, 1);

                // if last player disconnected, remove game
                if(games[id].players.length == 0)
                    delete games[id];

                else
                {
                    for(j = 0; j < games[id].players.length; j++)
                    {
                        io.sockets.to(games[id].players[j].id).emit("refresh_roles", games[id].rolesPresent);
                        io.sockets.to(games[id].players[j].id).emit("refresh_lobby", games[id].players, games[id].roomId);
                    }
                }

                found = true;
                break;
            }
        }

        if(found) break;
    }
}


// calculations ////////////////////////////////////////////////////////////////

function addProgress(facility, amount)
{
    facility.progress += amount;
    if(facility.progress > facility.progressMax)
        facility.progress = facility.progressMax;
}

function updateFacilityProgress(game)
{
    game.villagers.forEach(villager => {
        
        let baseProgress, leastEffectiveMult, mostEffectiveMult = 0;

        switch(game.facilities["education"].level)
        {
            case 1:
                baseProgress = 2;
                leastEffectiveMult = 0.75;
                mostEffectiveMult = 1.5;
                break;
            case 2:
                baseProgress = 3;
                leastEffectiveMult = 0.8;
                mostEffectiveMult = 1.6;
                break;
            case 3:
                baseProgress = 4;
                leastEffectiveMult = 0.85;
                mostEffectiveMult = 1.7;
                break;
            case 4:
                baseProgress = 5;
                leastEffectiveMult = 0.9;
                mostEffectiveMult = 1.85;
                break;
            case 5:
                baseProgress = 8;
                leastEffectiveMult = 1;
                mostEffectiveMult = 2;
                break;
            default:
                break;
        }

        if(!villager.currentTask) return;

        if(villager.currentTask == villager.mostEffectiveTask)
            addProgress(game.facilities[villager.currentTask], baseProgress * mostEffectiveMult);

        else if(villager.currentTask == villager.leastEffectiveTask)
            addProgress(game.facilities[villager.currentTask], baseProgress * leastEffectiveMult);

        else
            addProgress(game.facilities[villager.currentTask], baseProgress);

    });
}

function updateCropGrowth(game)
{
    game.farm.forEach((farmland) => {
        if(farmland.daysLeft > 0)
        {
            farmland.daysLeft--;
            if(farmland.daysLeft == 0)
                farmland.label = "ready";
            else
                farmland.label = farmland.daysLeft + " days";
        }
    });
}

function updateVillagers(game)
{
    game.villagers.forEach(villager => {
        
        // update happiness based on hunger, except for day 1
        if(game.day > 1)
        {
            if(villager.hunger == 5)
                villager.happiness += 5;
            else if(villager.hunger == 2 || villager.hunger == 1)
                villager.happiness -= 5;
            else if(villager.hunger == 0)
                villager.happiness -= 10;
        }

        // subtract hunger
        if(villager.hunger > 0) villager.hunger--;

        villager.fed = false;

    });
}

function nextDay(game)
{
    updateCropGrowth(game);
    updateVillagers(game);
    updateFacilityProgress(game);

    // increment day
    game.day++;
    game.daysUntilNextSeason--;
}



io.on("connection", (socket) => {
    console.log("connected: " + socket.id);
    
    // lobby
    socket.on("host_game", (_playerName) => hostGame(socket, _playerName));
    socket.on("join_game", (_playerName, _roomId) => joinGame(socket, _playerName, _roomId));
    socket.on("select_role", (_roomId, _newRole) => selectRole(socket, _roomId, _newRole));
    socket.on("ready", (_roomId) => ready(socket, _roomId));

    socket.on("farm", (_roomId, _farm) => {
        let game = games[_roomId];
        game.farm = _farm;
        game.players.forEach(player => io.sockets.to(player.id).emit("farm", game.farm));
    });

    socket.on("assign_villager", (_roomId, _villager, _oldFacility, _newFacility) => {
        let game = games[_roomId];

        for(let i = 0; i < game.villagers.length; i++)
        {
            if(game.villagers[i].name == _villager.name)
            {
                game.villagers[i] = _villager;
                break;
            }
        }

        if(_oldFacility)
            game.facilities[_oldFacility.label] = _oldFacility;

        game.facilities[_newFacility.label] = _newFacility;

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("villagers", game.villagers);
            io.sockets.to(player.id).emit("facilities", game.facilities);
        });

    });

    socket.on("villager", (_roomId, _villager) => {
        let game = games[_roomId];
        for(let i = 0; i < game.villagers.length; i++)
        {
            if(game.villagers[i].name == _villager.name)
            {
                game.villagers[i] = _villager;
                break;
            }
        }
    });

    socket.on("end_turn", (_roomId) => {
        let game = games[_roomId];
        nextDay(game);

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("day", game.day, game.daysUntilNextSeason);
            io.sockets.to(player.id).emit("villagers", game.villagers);
            io.sockets.to(player.id).emit("facilities", game.facilities);
            io.sockets.to(player.id).emit("farm", game.farm);
        });
    });

    socket.on("disconnect", () => disconnect(socket));

    socket.on("server_info", () => {
        socket.emit("server_info", games);
    });
});

