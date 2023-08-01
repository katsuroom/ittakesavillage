class Option {
    constructor(data, weight)
    {
        this.data = data;
        this.weight = weight;
    }
}

class RandomTable {
    constructor(options)    // options: Option[]
    {
        this.options = options;

        this.total = this.options.reduce((acc, option) => acc + option.weight, 0);
    }

    getItem()
    {
        let rand = Math.floor(Math.random() * (this.total));

        for(let i = 0; i < this.options.length; i++)
        {
            rand -= this.options[i].weight;

            if(rand < 0)
                return this.options[i].data.clone();
        }

        return null;
    }
}

module.exports = {Option, RandomTable};