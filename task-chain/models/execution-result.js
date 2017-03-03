
class ExecutionResult {
    constructor() {
        this.proceed = null;
        this.outcomeValue = null;
        this.persistenceData = null;
        this.sleep = null;
    }

    static outcome(value) {
        var result = new ExecutionResult();
        result.outcomeValue = value;
        result.proceed = true;
        return result;
    }

    static resolveOutcome(value) {
        var result = new ExecutionResult();
        result.outcomeValue = value;
        result.proceed = true;
        return Promise.resolve(result);
    }

    static next() {
        var result = new ExecutionResult();
        result.outcomeValue = null;
        result.proceed = true;
        return result;
    }

    static resolveNext() {
        var result = new ExecutionResult();
        result.outcomeValue = null;
        result.proceed = true;
        return Promise.resolve(result);
    }

    static persist(persistenceData) {
        var result = new ExecutionResult();
        result.proceed = false;
        result.persistenceData = persistenceData;
        return result;
    }

    static resolvePersist(persistenceData) {
        var result = new ExecutionResult();
        result.proceed = false;
        result.persistenceData = persistenceData;
        return Promise.resolve(result);
    }

    static sleep(until, persistenceData) {
        var result = new ExecutionResult();
        result.proceed = false;
        result.persistenceData = persistenceData;
        result.sleep = until;
        return result;
    }

    static resolveSleep(until, persistenceData) {
        var result = new ExecutionResult();
        result.proceed = false;
        result.persistenceData = persistenceData;
        result.sleep = until;
        return Promise.resolve(result);
    }
}

exports.ExecutionResult = ExecutionResult;
