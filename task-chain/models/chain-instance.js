
class ChainInstance {
    constructor() {
        this.id = null;
        this.chainDefinitionId = null;
        this.version = null;
        this.description = null;
        this.nextExecution = null;
        this.status = null;
        this.data = null;
        this.executionPointers = [];
    }
}

exports.ChainInstance = ChainInstance;
