
class ExecutionPointer {
    constructor() {
        this.taskId = null;
        this.active = null;
        this.sleepUntil = null;
        this.persistenceData = null;
        this.startTime = null;
        this.endTime = null;
        this.eventName = null;
        this.eventKey = null;
        this.eventPublished = null;
        this.eventData = null;
        this.concurrentFork = null;
        this.pathTerminal = null;
        this.errors = [];
    }
}

exports.ExecutionPointer = ExecutionPointer;
