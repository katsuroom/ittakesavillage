class Event {
    constructor(name, id, description = "", type = 0)
    {
        this.name = name;                   // string
        this.id = id;                       // string
        this.description = description;     // string
        this.type = type;                   // int: good = 0, bad = 1
        
        this.duration = 0;

        this.blocked = false;
    }

    clone()
    {
        return new Event(this.name, this.id, this.description);
    }

    
}

module.exports = Event;