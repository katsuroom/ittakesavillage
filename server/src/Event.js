class Event {
    constructor(name, id, description = "")
    {
        this.name = name;                   // string
        this.id = id;                       // string
        this.description = description;     // string
        
        this.duration = 0;
    }
}

module.exports = Event;