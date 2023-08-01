class Event {
    constructor(name, id, description = "")
    {
        this.name = name;                   // string
        this.id = id;                       // string
        this.description = description;     // string
        
        this.duration = 0;
    }

    clone()
    {
        return new Event(this.name, this.id, this.description);
    }
}

module.exports = Event;