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
    game.initFactory();
    game.initBudget();
    game.initFarmland();
    game.initTrees();

    // assign villager quests
    game.villagers.forEach(villager => {

        let index = Math.floor(Math.random() * global.QUESTS.length);
        let quest = global.QUESTS[index];

        if(quest.type != "happiness")
            global.QUESTS.splice(index, 1);

        villager.quest = quest;
    });


    // events
    game.event = global.EVENTS["cloudy_day"];
    game.event.duration = 3;

    game.nextEvent = getNextEvent(game);

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
        io.sockets.to(player.id).emit("factory", game.factory);

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

function reconnect(socket, _roomId, _socketId)
{
    let game = games[_roomId];
    if(game)
    {
        let player = game.players.find(player => player.id == _socketId);

        if(!player)
        {
            console.log("Reconnect failed: could not find player in game " + _roomId);
            return;
        }

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
        socket.emit("factory", game.factory);

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

function removeVillagerFromFacility(villager, game)
{
    if(villager.currentTask)
    {
        let oldFacility = game.facilities[villager.currentTask];

        for(let i = 0; i < oldFacility.assignedVillagers.length; i++)
        {
            if(oldFacility.assignedVillagers[i] == villager.name)
            {
                oldFacility.assignedVillagers.splice(i, 1);
                break;
            }
        }
    }
}

function villagerFlee(villager, game)
{
    game.paths[villager.position.y][villager.position.x] = "-";
}

function villagerSick(villager)
{
    villager.sick = true;
    villager.labelColor = "rgb(0,191,0)";
}

function villagerHeal(villager)
{
    villager.sick = false;
    villager.labelColor = "white";
}

function checkDeathConditions(game) // return bool
{
    let totalHappiness = 0;
    game.villagers.forEach(villager => totalHappiness += villager.happiness);

    let avgHappiness = totalHappiness / game.villagers.length;

    return avgHappiness <= global.DEATH_THRESHOLD;
}

function generateLoot(player)     // returns array of loot items
{
    let loot = [];

    let tableAmount = Math.floor(1 + (global.LOOT_AMOUNT + player.questsComplete) * 1.5);

    for(let i = 0; i < tableAmount; i++)
        loot.push(global.DAILY_LOOT.getItem());

    return loot;
}

function eventStart(game, event)
{
    switch(event.id)
    {
        case "harvest":
            {
                let numCrops = Math.floor(7 - game.players.length * 0.5);
                let crops = [global.ITEMS.cucumber, global.ITEMS.tomato, global.ITEMS.potato, global.ITEMS.carrot];

                game.players.forEach(player => {
                    for(let i = 0; i < numCrops; i++)
                    {
                        let item = crops[Math.floor(Math.random() * crops.length)];
                        io.sockets.to(player.id).emit("give_item", item, 1);
                    }
                });
                
                break;
            }
        case "rainy_day":
            {
                game.players.forEach(player => {
                    io.sockets.to(player.id).emit("set_variable", "cropGrowthModifier", -1);
                });
                break;
            }
        case "free_cake":
            {
                let villager = game.createVillager();
                game.sortVillagers();
                break;
            }
        case "black_friday":
            {
                game.players.forEach(player => {
                    io.sockets.to(player.id).emit("set_variable", "priceMultiplier", 0.5);
                });
                break;
            }
        case "summer_day":
            {
                global.SICK_CHANCE = 0;
                game.villagers.forEach(villager => villagerHeal(villager));
                break;
            }
        case "drought":
            {
                let droughtChance = 0;
                switch(game.facilities["water"].level)
                {
                    case 1: droughtChance = 0.6; break;
                    case 2: droughtChance = 0.45; break;
                    case 3: droughtChance = 0.3; break;
                    case 4: droughtChance = 0.15; break;
                    case 5: droughtChance = 0; break;
                    default: break;
                }

                game.farm.forEach(farmland => {
                    if(Math.random() < droughtChance)
                    {
                        farmland.crop = null;
                        farmland.label = "empty";
                    }
                });

                break;
            }
        case "disease":
            {
                let diseaseChance = 0;
                switch(game.facilities["water"].level)
                {
                    case 1: diseaseChance = 0.2; break;
                    case 2: diseaseChance = 0.15; break;
                    case 3: diseaseChance = 0.1; break;
                    case 4: diseaseChance = 0.05; break;
                    case 5: diseaseChance = 0; break;
                    default: break;
                }

                game.villagers.forEach(villager => {
                    if(Math.random() < diseaseChance)
                        villagerSick(villager);
                });

                break;
            }
        case "flood":
            {
                Object.values(game.facilities).forEach(facility => {
                    facility.progress -= global.FLOOD_DAMAGE;
                    if(facility.progress < 0)
                        facility.progress = 0;
                });
            }
        default: break;
    }
}

function eventUpdate(game, event)
{
    // console.log("update");
}

function eventEnd(game, event)
{
    switch(event.id)
    {
        case "rainy_day":
            {
                game.players.forEach(player => {
                    io.sockets.to(player.id).emit("set_variable", "cropGrowthModifier", 0);
                });
                break;
            }
        case "black_friday":
            {
                game.players.forEach(player => {
                    io.sockets.to(player.id).emit("set_variable", "priceMultiplier", 1);
                });
                break;
            }
        case "summer_day":
            {
                global.SICK_CHANCE = 0.03;
                break;
            }
        case "death":
            {
                if(checkDeathConditions(game))
                {
                    let index = Math.floor(Math.random() * game.villagers.length);
                    let villager = game.villagers[index];
                    removeVillagerFromFacility(villager, game);

                    game.villagers.splice(index, 1);
                    villagerFlee(villager, game);

                    game.players.forEach(player => {
                        io.sockets.to(player.id).emit("villager_flee", villager);
                        io.sockets.to(player.id).emit("paths", game.paths);
                    });
                }
                break;
            }
        default: break;
    }
}

function updateEvent(game)
{
    game.event.duration--;

    if(game.event.duration == 0)
    {
        eventEnd(game, game.event);

        // switch to next event
        
        if(game.facilities["power"].level > 1)
        {
            let duration = game.nextEvent.duration;
            game.event = global.EVENTS.cloudy_day.clone();
            game.event.duration = duration;

            game.facilities["power"].level = 1;
            game.facilities["power"].progress = 0;
        }
        else
            game.event = game.nextEvent;

        eventStart(game, game.event);

        // set next event
        game.nextEvent = getNextEvent(game);
    }
    else
        eventUpdate(game, game.event);
}

function getNextEvent(game)
{
    // calculate season for next event
    let dayCount = game.day + game.event.duration;

    if(dayCount > 60) return null;

    let season = "";

    for(let i = 0; i < global.SEASONS.length; i++)
    {
        dayCount -= global.SEASONS[i].days;
        if(dayCount <= 0)
        {
            season = global.SEASONS[i].name;
            break;
        }
    }

    // get event from event table
    let event = null;

    while(true)
    {
        switch(season)
        {
            case "spring":
                event = global.EVENTS_SPRING.getItem();
                break;
            case "summer":
                event = global.EVENTS_SUMMER.getItem();
                break;
            case "autumn":
                event = global.EVENTS_AUTUMN.getItem();
                break;
            case "winter":
                event = global.EVENTS_WINTER.getItem();
                break;
            default:
                break;
        }

        if(event.id != "death")
            break;
        else
        {
            // prevents consecutive death events
            if(game.event.id != "death" && checkDeathConditions(game))
                break;
        }
    }

    

    event.duration = Math.floor(Math.random() * (global.EVENT_DURATION_MAX - global.EVENT_DURATION_MIN + 1))
        + global.EVENT_DURATION_MIN;
    return event;
}

function checkQuest(socket, game)
{
    game.villagers.forEach(villager => {
        if(villager.quest)
        {
            let completed = false;

            switch(villager.quest.type)
            {
                case "happiness":
                    completed = villager.happiness >= villager.quest.targetValue;
                    break;
                case "water":
                case "farming":
                case "education":
                case "housing":
                    completed = game.facilities[villager.quest.type].level >= villager.quest.targetValue;
                    break;
                default:
                    break;
            }

            if(completed)
            {
                game.players[game.currentTurn].questsComplete++;

                socket.emit("give_item", global.ITEMS.steel, 2);
                game.players.forEach(player => io.sockets.to(player.id).emit("quest_complete", villager, game.players[game.currentTurn].name));
                villager.quest = null;
                game.players.forEach(player => io.sockets.to(player.id).emit("villager", villager));
            }
        }
    });
}


// calculations ////////////////////////////////////////////////////////////////


io.on("connection", (socket) => {
    console.log("connected: " + socket.id);
    
    // lobby
    socket.on("host_game", (_playerName) => hostGame(socket, _playerName));
    socket.on("join_game", (_playerName, _roomId) => joinGame(socket, _playerName, _roomId));
    socket.on("select_role", (_roomId, _newRole) => selectRole(socket, _roomId, _newRole));
    socket.on("ready", (_roomId) => ready(socket, _roomId));
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

                checkQuest(socket, game);

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

        // track villagers that are already sick
        let sickVillagers = [];
        game.villagers.forEach(villager => {
            if(villager.sick) sickVillagers.push(villager);
        });

        game.nextDay();

        // check for happiness quest completion
        checkQuest(socket, game);

        updateEvent(game);

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

        // calculate capacity of sick villagers
        let sickCapacity = 0;
        switch(game.facilities["housing"].level)
        {
            case 1: sickCapacity = 3; break;
            case 2: sickCapacity = 4; break;
            case 3: sickCapacity = 5; break;
            case 4: sickCapacity = 7; break;
            case 5: sickCapacity = 9; break;
            default: break;
        }

        // check villagers with happiness <= 0, or too many are sick
        let fleeingVillagers = [];
        for(let i = game.villagers.length - 1; i >= 0; i--)
        {
            let villager = game.villagers[i];

            // if(villager.sick)
            // {
            //     let locate = sickVillagers.find(v => v.name == villager.name);

            //     if(!locate && sickVillagers.length < sickCapacity)
            //         sickVillagers.push(villager);
            //     else if(!locate)
            //     {
            //         removeVillagerFromFacility(villager, game);
            //         game.villagers.splice(i, 1);
            //         fleeingVillagers.push(villager);
            //     }
            // }

            if(villager.happiness <= 0)
            {
                removeVillagerFromFacility(villager, game);
                game.villagers.splice(i, 1);
                fleeingVillagers.push(villager);
                villagerFlee(villager, game);
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


            if(changeSeason)
                io.sockets.to(player.id).emit("season", game.season, game.nextSeason);

            io.sockets.to(player.id).emit("event", game.event, game.nextEvent);

            io.sockets.to(player.id).emit("villagers", game.villagers);
            io.sockets.to(player.id).emit("facilities", game.facilities);
            io.sockets.to(player.id).emit("factory", game.factory);
            io.sockets.to(player.id).emit("farm", game.farm);
            io.sockets.to(player.id).emit("trees", game.trees, game.rolesPresent["scientist"] || game.npcPresent["scientist"]);

            io.sockets.to(player.id).emit("change_turn", game.currentTurn);
        });

        let currentPlayer = game.players[game.currentTurn];
        io.sockets.to(currentPlayer.id).emit("daily_loot", generateLoot(currentPlayer), global.LOOT_AMOUNT + currentPlayer.questsComplete);
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
        
        let hasApple = game.trees.find(tree => tree.id == _treeId).daysLeft == 0;
        game.cutTree(_treeId);

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("trees", game.trees, true);
        });

        if(hasApple)
            socket.emit("give_item", global.ITEMS.apple, 1);

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

    socket.on("add_progress", (_roomId, _facility, _amount) => {
        let game = games[_roomId];
        let facility = game.facilities[_facility.label];

        facility.progress += _amount;

        let upgrade = false;
        while(facility.progress >= facility.progressMax)
        {
            upgrade = true;

            let remaining = facility.progress - facility.progressMax;
            game.upgradeFacility(facility);
            facility.progress += remaining;

            checkQuest(socket, game);
        }

        game.players.forEach(player => {
            io.sockets.to(player.id).emit("facility", facility);

            if(upgrade)
            {
                if(facility.label == "water" && facility.level < 5)
                io.sockets.to(player.id).emit("farm", game.farm);

                if(facility.label == "farming")
                    io.sockets.to(player.id).emit("farm", game.farm);
            }
        });
    });

    socket.on("upgrade_facility", (_roomId, _facility) => {
        let game = games[_roomId];
        let facility = game.facilities[_facility.label];
        game.upgradeFacility(facility);

        checkQuest(socket, game);

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

