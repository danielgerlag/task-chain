
class Task {
    constructor() {
        this.id = null;
        this.name = null;
        this.body = null;
        this.outcomes = [];
        this.inputs = [];
        this.outputs = [];
        this.errorBehavior = null;
        this.retryInterval = null;
    }
}

exports.Task = Task;
