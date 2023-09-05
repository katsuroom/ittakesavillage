// server setup ////////////////////////////////////////////////////////////////

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    }
});

app.use(express.static("../client"));

httpServer.listen(5000);


// game variables ////////////////////////////////////////////////////////////////

const Game = require("./src/Game.js");
const Player = require("./src/Player.js");

const global = require("./global.js");

const MAX_PLAYERS = 6;


// lobby ////////////////////////////////////////////////////////////////

Game.io = io;
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

    // chief goes first
    let chiefIndex = game.players.findIndex(player => player.role == "chief");
    if(chiefIndex != -1)
    {
        let chief = game.players[chiefIndex];
        game.players.splice(chiefIndex, 1);
        game.players.unshift(chief);
    }

    game.initPaths();
    game.initVillagers();
    game.initFacilities();
    game.initBudget();
    game.initFarmland();
    game.initTrees();
    game.initEvent();

    // events
    game.started = true;

    game.players.forEach(player => {

        player.connected = true;

        io.sockets.to(player.id).emit("refresh_lobby", games[roomId].players, roomId);

        io.sockets.to(player.id).emit("start_game");
        io.sockets.to(player.id).emit("day", game.day, game.daysUntilNextSeason);
        io.sockets.to(player.id).emit("season", game.season, game.nextSeason);
        io.sockets.to(player.id).emit("budget", game.budget);
        io.sockets.to(player.id).emit("villagers", game.villagers);
        io.sockets.to(player.id).emit("paths", game.paths);
        io.sockets.to(player.id).emit("facilities", game.facilities);

        let inventory = game.initInventory();
        inventory.forEach(item => io.sockets.to(player.id).emit("give_item", item, 1));

        io.sockets.to(player.id).emit("farm", game.farm);
        io.sockets.to(player.id).emit("trees", game.trees, game.rolesPresent["scientist"]);
        io.sockets.to(player.id).emit("event", game.event, game.nextEvent);
        io.sockets.to(player.id).emit("change_turn", game.currentTurn);
        io.sockets.to(player.id).emit("refresh_npcs", game.npcPresent);

        // shop
        let shop = [];
        for (const [role, present] of Object.entries(game.rolesPresent)) {
            if(role != "chief" && !present)
                shop.push(global.SHOP["npc_" + role]);
        }
        if(player.role == "farmer")
        {
            shop.push(global.SHOP["cucumber_seed"]);
            shop.push(global.SHOP["tomato_seed"]);
            shop.push(global.SHOP["potato_seed"]);
            shop.push(global.SHOP["carrot_seed"]);
        }
        if(player.role == "engineer")
            shop.push(global.SHOP["steel"]);

        io.sockets.to(player.id).emit("shop", shop);
    });

    io.sockets.to(game.players[game.currentTurn].id).emit("daily_loot", generateLoot(game.players[game.currentTurn]), global.LOOT_AMOUNT);
}

function disconnectLobby(game, index)   // index of player in game.players
{
    // free role
    if(game.players[index].role != "") game.rolesPresent[game.players[index].role] = false;

    game.players.splice(index, 1);

    // if last player disconnected, remove game
    if(game.players.length == 0)
        delete games[game.roomId];
    else
    {
        for(let i = 0; i < game.players.length; i++)
        {
            io.sockets.to(game.players[i].id).emit("refresh_roles", game.rolesPresent);
            io.sockets.to(game.players[i].id).emit("refresh_lobby", game.players, game.roomId);
        }
    }
}

function disconnectGame(game, index)
{
    game.players[index].connected = false;

    // remove game if every player is disconnected
    let removeGame = true;
    for(let i = 0; i < game.players.length; i++)
    {
        if(game.players[i].connected)
        {
            removeGame = false;
            break;
        }
    }

    if(removeGame)
    {
        delete games[game.roomId];
        return;
    }

    // change current player if disconnected
    if(index == game.currentTurn)
    {
        game.changeTurn();

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("change_turn", game.currentTurn);
        });
    }

}

function checkReconnect(socket, _roomId, _socketId)
{
    let game = games[_roomId];
    if(!game)
    {
        socket.emit("check_reconnect", false);
        return false;
    }

    let player = game.players.find(player => player.id == _socketId);

    if(!player)
    {
        socket.emit("check_reconnect", false);
        return false;
    }

    socket.emit("check_reconnect", true);
    return true;
}

function reconnect(socket, _roomId, _socketId)
{
    let game = games[_roomId];
    if(checkReconnect(socket, _roomId, _socketId))
    {
        let player = game.players.find(player => player.id == _socketId);

        player.id = socket.id;
        player.connected = true;

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("refresh_lobby", game.players, _roomId);
        });

    
        socket.emit("reconnect", player);
        socket.emit("day", game.day, game.daysUntilNextSeason);
        socket.emit("season", game.season, game.nextSeason);
        socket.emit("budget", game.budget);
        socket.emit("villagers", game.villagers);
        socket.emit("paths", game.paths);
        socket.emit("facilities", game.facilities);

        // let inventory = game.initInventory();
        // inventory.forEach(item => io.sockets.to(player.id).emit("give_item", item, 1));

        socket.emit("farm", game.farm);
        socket.emit("trees", game.trees, game.rolesPresent["scientist"]);
        socket.emit("event", game.event, game.nextEvent);
        socket.emit("change_turn", game.currentTurn);
        socket.emit("refresh_npcs", game.npcPresent);

        // shop
        let shop = [];
        for (const [role, present] of Object.entries(game.rolesPresent)) {
            if(role != "chief" && !present)
                shop.push(global.SHOP["npc_" + role]);
        }
        if(player.role == "farmer")
        {
            shop.push(global.SHOP["cucumber_seed"]);
            shop.push(global.SHOP["tomato_seed"]);
            shop.push(global.SHOP["potato_seed"]);
            shop.push(global.SHOP["carrot_seed"]);
        }
        if(player.role == "engineer")
            shop.push(global.SHOP["steel"]);

        socket.emit("shop", shop);
    }
}


// updates



function generateLoot(player)     // returns array of loot items
{
    let loot = [];

    let tableAmount = Math.floor(1 + (global.LOOT_AMOUNT + player.questsComplete) * 1.5);

    for(let i = 0; i < tableAmount; i++)
        loot.push(global.DAILY_LOOT.getItem());

    return loot;
}

function endTurn(_roomId)
{
    let game = games[_roomId];

    game.nextDay();

    // check villagers with happiness <= 0
    let fleeingVillagers = [];
    for(let i = game.villagers.length - 1; i >= 0; i--)
    {
        let villager = game.villagers[i];

        if(villager.happiness <= 0)
        {
            game.removeVillagerFromFacility(villager);
            game.villagers.splice(i, 1);
            fleeingVillagers.push(villager);
            game.villagerFlee(villager);
        }
    }

    // change player turn
    game.changeTurn();

    game.players.forEach(player => {
        io.sockets.to(player.id).emit("day", game.day, game.daysUntilNextSeason);

        fleeingVillagers.forEach(villager => {
            io.sockets.to(player.id).emit("villager_flee", villager);
        });

        if(fleeingVillagers.length > 0)
            io.sockets.to(player.id).emit("paths", game.paths);


        io.sockets.to(player.id).emit("season", game.season, game.nextSeason);
        io.sockets.to(player.id).emit("event", game.event, game.nextEvent);

        if(game.mutate)
            io.sockets.to(player.id).emit("mutate");

        io.sockets.to(player.id).emit("villagers", game.villagers);
        io.sockets.to(player.id).emit("facilities", game.facilities);
        io.sockets.to(player.id).emit("farm", game.farm);
        io.sockets.to(player.id).emit("trees", game.trees, game.rolesPresent["scientist"] || game.npcPresent["scientist"]);

        io.sockets.to(player.id).emit("change_turn", game.currentTurn);
    });

    game.mutate = false;

    let currentPlayer = game.players[game.currentTurn];
    io.sockets.to(currentPlayer.id).emit("daily_loot", generateLoot(currentPlayer), global.LOOT_AMOUNT + currentPlayer.questsComplete);
}




// calculations ////////////////////////////////////////////////////////////////


io.on("connection", (socket) => {
    console.log("connected: " + socket.id);
    
    // lobby
    socket.on("host_game", (_playerName) => hostGame(socket, _playerName));
    socket.on("join_game", (_playerName, _roomId) => joinGame(socket, _playerName, _roomId));
    socket.on("select_role", (_roomId, _newRole) => selectRole(socket, _roomId, _newRole));
    socket.on("ready", (_roomId) => ready(socket, _roomId));
    socket.on("check_reconnect", (_roomId, _socketId) => checkReconnect(socket, _roomId, _socketId));
    socket.on("reconnect", (_roomId, _socketId) => reconnect(socket, _roomId, _socketId));

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

        if(_newFacility)
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

                game.checkQuest();

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

    socket.on("end_turn", (_roomId) => endTurn(_roomId));

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
        
        let hasApple = game.trees.find(tree => tree.id == _treeId).daysLeft == 0;
        game.cutTree(_treeId);

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("trees", game.trees, true);
        });

        if(hasApple)
            socket.emit("give_item", global.ITEMS.apple, 1);

        socket.emit("give_item", global.ITEMS.wood, 5);
    });

    socket.on("budget", (_roomId, _budget) => {
        let game = games[_roomId];
        game.budget = _budget;
        game.players.forEach(player => {
            io.sockets.to(player.id).emit("budget", game.budget);
        });
    });

    socket.on("upgrade_facility", (_roomId, _facility) => {
        let game = games[_roomId];
        let facility = game.facilities[_facility.label];
        game.upgradeFacility(facility);

        game.checkQuest();

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("facility", facility);

            if(facility.label == "water" && facility.level < 5)
                io.sockets.to(player.id).emit("farm", game.farm);

            if(facility.label == "farming")
                io.sockets.to(player.id).emit("farm", game.farm);
        });
    });

    socket.on("purchase", (_roomId, _socketId, _shopItem) => {
        let game = games[_roomId];

        switch(_shopItem.id)
        {
            case "npc_doctor":
            case "npc_scientist":
            case "npc_sociologist":
            case "npc_farmer":
            case "npc_engineer":

                if(_shopItem.id == "npc_farmer")
                {
                    game.players.forEach(player => io.sockets.to(player.id).emit("add_shop_item", global.SHOP["cucumber_seed"]));
                    game.players.forEach(player => io.sockets.to(player.id).emit("add_shop_item", global.SHOP["tomato_seed"]));
                    game.players.forEach(player => io.sockets.to(player.id).emit("add_shop_item", global.SHOP["potato_seed"]));
                    game.players.forEach(player => io.sockets.to(player.id).emit("add_shop_item", global.SHOP["carrot_seed"]));
                }

                if(_shopItem.id == "npc_engineer")
                    game.players.forEach(player => io.sockets.to(player.id).emit("add_shop_item", global.SHOP["steel"]));

                game.npcPresent[_shopItem.id.substring(4)] = true;
                game.players.forEach(player => io.sockets.to(player.id).emit("purchase_npc", game.npcPresent));
                break;

            case "cucumber_seed":
                socket.emit("give_item", global.ITEMS.cucumberSeed, 1);
                break;
            case "tomato_seed":
                socket.emit("give_item", global.ITEMS.tomatoSeed, 1);
                break;
            case "potato_seed":
                socket.emit("give_item", global.ITEMS.potatoSeed, 1);
                break;
            case "carrot_seed":
                socket.emit("give_item", global.ITEMS.carrotSeed, 1);
                break;
            case "steel":
                socket.emit("give_item", global.ITEMS.steel, 1);
                break;
            default:
                break;
        }
    });

    socket.on("engineer_skill", (_inventory) => {
        _inventory.forEach(itemStack => {
            
        });
    });

    socket.on("disconnect", () => {
        console.log("disconnected: " + socket.id);
        
        let found = false;
        for(const [id, game] of Object.entries(games))
        {
            for(let j = 0; j < games[id].players.length; j++)
            {
                if(socket.id == games[id].players[j].id)
                {
                    if(games[id].started)
                    {
                        // game has already started
                        disconnectGame(games[id], j);
                    }
                    else
                    {
                        // game is still in lobby
                        disconnectLobby(games[id], j);
                    }

                    break;
                }
            }

            if(found) break;
        }

        
    });

    socket.on("server_info", () => {
        socket.emit("server_info", games);
    });
});

