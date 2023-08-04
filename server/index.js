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

const global = require("./global.js");

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
    game.initFactory();
    game.initInventory();
    game.initFarmland();
    game.initTrees();

    game.event = global.EVENTS["cloudy_day"];
    game.event.duration = 3;

    game.nextEvent = game.getNextEvent();
    game.nextEvent.duration = Math.floor(Math.random() * (global.EVENT_DURATION_MAX - global.EVENT_DURATION_MIN + 1))
        + global.EVENT_DURATION_MIN;

    game.started = true;

    game.players.forEach(player => {
        io.sockets.to(player.id).emit("start_game");
        io.sockets.to(player.id).emit("day", game.day, game.daysUntilNextSeason);
        io.sockets.to(player.id).emit("season", game.season, game.nextSeason);
        io.sockets.to(player.id).emit("budget", game.budget);
        io.sockets.to(player.id).emit("villagers", game.villagers);
        io.sockets.to(player.id).emit("paths", game.paths);
        io.sockets.to(player.id).emit("facilities", game.facilities);
        io.sockets.to(player.id).emit("factory", game.factory);
        io.sockets.to(player.id).emit("inventory", game.inventory);
        io.sockets.to(player.id).emit("farm", game.farm);
        io.sockets.to(player.id).emit("trees", game.trees, game.rolesPresent["scientist"]);
        io.sockets.to(player.id).emit("event", game.event, game.nextEvent);
        io.sockets.to(player.id).emit("change_turn", game.currentTurn);
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

    socket.on("move_villager", (_roomId, _villager, _paths) => {
        let game = games[_roomId];

        for(let i = 0; i < game.villagers.length; i++)
        {
            if(game.villagers[i].name == _villager.name)
            {
                game.villagers[i] = _villager;
                break;
            }
        }

        game.sortVillagers();
        game.paths = _paths;

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("paths", game.paths);
            io.sockets.to(player.id).emit("villagers", game.villagers);
        });
    });

    socket.on("villager", (_roomId, _villager) => {
        let game = games[_roomId];

        for(let i = 0; i < game.villagers.length; i++)
        {
            if(game.villagers[i].name == _villager.name)
            {
                game.villagers[i] = _villager;

                game.players.forEach(player => {
                    io.sockets.to(player.id).emit("villager", game.villagers[i]);
                });

                break;
            }
        }
    });

    socket.on("facility", (_roomId, _facility) => {
        let game = games[_roomId];
        game.facilities[_facility.label] = _facility;

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("facility", _facility);
        });
    });

    socket.on("end_turn", (_roomId) => {
        let game = games[_roomId];
        game.nextDay();

        let changeSeason = false;
        if(game.daysUntilNextSeason == 0)
        {
            changeSeason = true;

            for(let i = 0; i < global.SEASONS.length; i++)
            {
                if(global.SEASONS[i].name == game.season)
                {
                    if(i < global.SEASONS.length - 1)
                    {
                        game.season = global.SEASONS[i+1].name;
                        game.daysUntilNextSeason = global.SEASONS[i+1].days;
                    }
                    if(i < global.SEASONS.length - 2)
                        game.nextSeason = global.SEASONS[i+2].name;
                    
                    break;
                }
            }
        }

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("day", game.day, game.daysUntilNextSeason);

            if(changeSeason)
                io.sockets.to(player.id).emit("season", game.season, game.nextSeason);

            io.sockets.to(player.id).emit("villagers", game.villagers);
            io.sockets.to(player.id).emit("facilities", game.facilities);
            io.sockets.to(player.id).emit("factory", game.factory);
            io.sockets.to(player.id).emit("farm", game.farm);
            io.sockets.to(player.id).emit("trees", game.trees, game.rolesPresent["scientist"]);

            io.sockets.to(player.id).emit("event", game.event, game.nextEvent);

            io.sockets.to(player.id).emit("change_turn", game.currentTurn);
        });
    });

    socket.on("pick_tree", (_roomId, _treeId) => {

        let game = games[_roomId];
        game.pickTree(_treeId);

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("trees", game.trees, true);
        });

        socket.emit("give_item", global.ITEMS.apple, 1);
    });

    socket.on("cut_tree", (_roomId, _treeId) => {

        let game = games[_roomId];
        game.cutTree(_treeId);

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("trees", game.trees, true);
        });

        socket.emit("give_item", global.ITEMS.wood, 5);
    });

    socket.on("collect_bricks", (_roomId) => {
        let game = games[_roomId];

        socket.emit("give_item", global.ITEMS.brick, game.factory.bricks);

        game.factory.bricks = 0;

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("factory", game.factory, true);
        });
    });

    socket.on("budget", (_roomId, _budget) => {
        let game = games[_roomId];
        game.budget = _budget;
        game.players.forEach(player => {
            io.sockets.to(player.id).emit("budget", game.budget);
        });
    });

    socket.on("disconnect", () => disconnect(socket));

    socket.on("server_info", () => {
        socket.emit("server_info", games);
    });
});

