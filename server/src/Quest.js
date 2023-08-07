const global = require('../global');
const { Option, RandomTable } = require('./RandomTable.js');

class Quest {
    static questList = [
    ["happiness", (x) => x >= 80],
    ["happiness", (x) => x >= 95],
    ["happiness", (x) => x >= 75],
    ["education", (x) => x >= 3],
    ["house", (x) => x >= 2],
    ["water", (x) => x >= 3],
    ["farm", (x) => x >= 4],
    ["power", (x) => x == 2],
    ["quest", (x) => x >= 5],
    ["quest", (x) => x >= 9],
    ["money", (x) => x >= 300],
    ["keepFeedFavorite", (x) => x >= 7],
    ["participateBuilding", (x) => x >= 3],
    ["nosickAll", (x) => x >= 3],
    ["nosickAll", (x) => x >= 5],
    ["nosick", (x) => x >= 7],
    ["nosick", (x) => x >= 10],
    ["sick", (x) => x >= 7],
    ["notWorking", (x) => x >= 8]
    ];
    static questString = ["All villagers happiness greater than 80", "All villagers happiness greater than 95"
        , "All villagers happiness greater than 95", "Education facility upgrade to level 3 or above"
        , "House facility upgrade to level 2 or above", "Water facility upgrade to level 3 or above"
        , "Farm facility upgrade to level 4 or above", "Power facility upgrade to level 2"
        , "Complete 5 quests in total", "Complete 9 quests in total"
        , "Give me 300", "Feed me my favorite food for 7 days"
        , "Let me work on at least 3 different facility", "No one sick for 3 days straight!"
        , "No one sick for 5 days straight!", "Keep me no sick for 7 days straight"
        , "Keep me no sick for 10 days straight", "More than 7 people sick at one point!?"
        , "Not letting me work for 8 days in total"];
    static reward = global.ITEMS.steel;

    constructor() {
        this.usedQuest = [];
    }

    assignQuest() {
        let unusedQuest = []                    //List of index for selected quest 
        for (let i = 0; i < Quest.questList.length; i++) {
            if (!this.usedQuest.includes(i))
                unusedQuest.push(new Option({"key":i}, 1));
        }
        if (unusedQuest.length > 0) {
            let randomQuestTable = new RandomTable(unusedQuest);
            let index = randomQuestTable.getItem().key;
            let quest = Quest.questList[index];
            let questString = Quest.questString[index];
            this.usedQuest.push(index);
            return new questHolder(quest[0], index, Quest.reward, questString);
        }
        return;
    }
}

class questHolder {
    constructor(criteria, index, reward, questString) {
        this.criteria = criteria;
        this.index = index;
        this.requirement = Quest.questList[this.index][1];
        this.questString = questString;
        this.reward = reward;
        this.fulfilled = false;
        this.redeemed = false;
    }

    fulfillCheck(game, villager) {    //Game instance variable
        let result = true;
        switch (this.criteria) {
            case "happiness": result = result && this.requirement(game.totalHappiness); break;
            case "education": result = result && this.requirement(game.facilities.education.level); break;
            case "house": result = result && this.requirement(game.facilities.housing.level); break;
            case "water": result = result && this.requirement(game.facilities.water.level); break;
            case "farm": result = result && this.requirement(game.facilities.farming.level); break;
            case "power": result = result && this.requirement(game.facilities.power.level); break;
            case "quest": result = result && this.requirement(game.finishedQuest); break;
            case "money": result = result && this.requirement(game.budget); break;
            case "keepFeedFavorite": result = result && this.requirement(villager.favoriteFoodFedDays); break;
            case "participateBuilding": result = result && this.requirement(villager.participatedBuildings.length); break;
            case "nosickAll": result = result && this.requirement(game.nosickAll); break;
            case "nosick": result = result && this.requirement(villager.nosick); break;
            case "sick": result = result && this.requirement(game.totalSick); break;
            case "notWorking": result = result && this.requirement(villager.notworking); break;
        }
        return result;
    }

    redeem(game, villager) {
        if (this.redeemed)
            return;
        if (this.fulfillCheck(game, villager)) {
            this.redeemed = true;
            game.finishedQuest += 1;
            if(this.criteria == "money"){
                game.budget -= 300;
            }
            return this.reward;
        }
        return;
    }
}

module.exports = {Quest, questHolder};