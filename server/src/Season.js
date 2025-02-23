class Season {
    constructor(name, days)
    {
        this.name = name;
        this.days = days;
    }

    setDays(days){
        this.days = days;
    }
};

module.exports = Season;