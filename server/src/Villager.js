const fs = require("fs");

const Interactable = require("./Interactable.js");

const facilities = ["water", "farming", "education", "housing"];
const foods = ["cucumber", "tomato", "potato", "carrot"];

class Villager extends Interactable {

    // villagers = array of Villagers
    constructor(villagers, paths)
    {
        super();

        this.gender = this.generateGender();
        this.name = this.generateName(villagers);

        this.shirtColor = this.generateShirtColor();
        this.hairColor = this.generateHairColor();
        this.hairStyle = this.generateHairStyle();

        this.position = this.generatePosition(paths);
        this.label = this.name;
        this.infoType = "villager";
        this.interactBox.x = this.position.x * 16 + 128;
        this.interactBox.y = this.position.y * 16;
        this.interactBox.width = 16;
        this.interactBox.height = 16;

        this.sick = false;
        this.happiness = 50;    // 0 - 100
        this.hunger = 5;        // 0 - 5
        this.favoriteFood = Villager.generateFavoriteFood();
        this.mostEffectiveTask = Villager.generateTask();
        this.leastEffectiveTask = Villager.generateLeastEffectiveTask(this.mostEffectiveTask);
        this.mostFavoriteTask = Villager.generateTask();
        this.leastFavoriteTask = Villager.generateLeastFavoriteTask(this.mostFavoriteTask);
        this.currentTask = null;

        this.quest = null;

        this.fed = false;

        this.immune = false;
    }

    generateGender()            // char
    {
        return Math.random() > 0.5 ? 'm' : 'f';
    }

    generateName(villagers)     // string
    {
        let filename;

        if(this.gender == 'm')
            filename = "assets/text/names-male.txt";
        else
            filename = "assets/text/names-female.txt";

        const data = fs.readFileSync(filename, { encoding: 'utf8', flag: 'r' });
        let lines = data.toString().split("\n");

        let name = lines[Math.floor(Math.random() * lines.length)];

        // search for duplicate name
        for(let i = 0; i < villagers.length; i++)
        {
            if(name == villagers[i].name)
            {
                name = lines[Math.floor(Math.random() * lines.length)];
                i = -1;
            }
        }

        return name;
    }

    generateShirtColor()            // {r, g, b}
    {
        let r = Math.floor(Math.random() * 256);
        let g = Math.floor(Math.random() * 256);
        let b = Math.floor(Math.random() * 256);
        return {r, g, b};
    }

    generateHairColor()             // {r, g, b}
    {
        let r = Math.floor(Math.random() * 256);
        let g = r * 0.75;
        let b = 0;
        return {r, g, b};
    }

    generateHairStyle()
    {
        let numHairStyles = 11;
        return Math.floor(Math.random() * numHairStyles);
    }

    generatePosition(paths)         // {x, y}
    {
        let x = 0;
        let y = 0;

        while(paths[y][x] == 'x')
        {
            x = Math.floor(Math.random() * 26);
            y = Math.floor(Math.random() * 22);
        }
        paths[y][x] = 'x';

        return {x: x, y: y};
    }

    static generateFavoriteFood()          // string
    {
        return foods[Math.floor(Math.random() * foods.length)];
    }

    static generateTask()                  // string
    {
        return facilities[Math.floor(Math.random() * facilities.length)];
    }

    static generateLeastEffectiveTask(mostEffectiveTask)    // string
    {
        let available = [];
        facilities.forEach(e => {
            if(e != mostEffectiveTask)
                available.push(e);
        });

        return available[Math.floor(Math.random() * available.length)];
    }

    static generateLeastFavoriteTask(mostFavoriteTask)     // string
    {
        let available = [];
        facilities.forEach(e => {
            if(e != mostFavoriteTask)
                available.push(e);
        });

        return available[Math.floor(Math.random() * available.length)];
    }
}

module.exports = Villager;