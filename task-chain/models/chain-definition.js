
class ChainDefinition {
    constructor() {
        this.id = null;
        this.version = null;
        this.description = null;
        this.initialTask = null;
        this.tasks = [];
        this.errorBehavior = null;
        this.retryInterval = null;
    }
}

exports.ChainDefinition = ChainDefinition;
