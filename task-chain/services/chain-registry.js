const services = require("../services");
const _ = require("underscore");


class ChainRegistry {
    
    constructor() {
        this.registry = [];
    }
    
    getDefinition(id, version) {
        var item = _.findWhere(this.registry, { id: id, version: version });
        if (!item)
            throw "Chain not registered";
        return item.defintion;
    
}
    registerChain(chain) {
        var entry = {};
        entry.id = chain.id;
        entry.version = chain.version;
        var builder = new services.ChainBuilder();
        chain.build(builder);
        entry.defintion = builder.build(chain.id, chain.version);
        this.registry.push(entry);
    }
}

exports.ChainRegistry = ChainRegistry;

