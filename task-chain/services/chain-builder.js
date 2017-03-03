
const abstractions = require("../abstractions");
const models = require("../models");

class ChainBuilder {
    
    constructor() {
        this.tasks = [];
        this.initialTask = null;
        this.errorBehavior = models.ErrorBehavior.Retry;
        this.retryInterval = (60 * 1000);
    }

    build(id, version) {
        var result = new models.ChainDefinition();
        result.id = id;
        result.version = version;
        result.tasks = this.tasks;
        result.initialTask = this.initialTask;
        result.errorBehavior = this.errorBehavior;
        result.retryInterval = this.retryInterval;
        return result;
    
}
    addTask(task) {
        task.id = this.tasks.length;
        this.tasks.push(task);
    }

    startWith(body, setup = null) {
        var task = new models.Task();
        task.body = body;
        var taskBuilder = new TaskBuilder(this, task);

        //setup
        if (setup) {
            setup(taskBuilder);
        }

        this.addTask(task);
        this.initialTask = task.id;

        return taskBuilder;
    }

    getUpstreamTasks(id) {
        return this.tasks.filter(task => task.outcomes.filter(outcome => outcome.nextTask == id).length > 0);
    }
}

class TaskBuilder {
    
    constructor(chainBuilder, task) {
        this.chainBuilder = chainBuilder;
        this.task = task;
    }

    name(name) {
        this.task.name = name;
        return this;
    }

    then(body, setup = null) {
        var newTask = new models.Task();
        newTask.body = body;
        this.chainBuilder.addTask(newTask);
        var taskBuilder = new TaskBuilder(this.chainBuilder, newTask);

        //setup
        if (setup) {
            setup(taskBuilder);
        }

        var outcome = new models.TaskOutcome();
        outcome.nextTask = newTask.id;
        outcome.value = null;
        this.task.outcomes.push(outcome);

        return taskBuilder;
    }

    thenStep(newTask) {
        var outcome = new models.TaskOutcome();
        outcome.nextTask = newTask.task.id;
        outcome.value = null;
        this.task.outcomes.push(outcome);
        return newTask;
    }

    thenRun(task) {
        var newTask = new models.Task();
        class bodyClass extends abstractions.InlineTaskBody {
            constructor() {
                super(task);
            }
        }
        ;
        newTask.body = bodyClass;
        this.chainBuilder.addTask(newTask);
        var taskBuilder = new TaskBuilder(this.chainBuilder, newTask);
        var outcome = new models.TaskOutcome();
        outcome.nextTask = newTask.id;
        outcome.value = null;
        this.task.outcomes.push(outcome);
        return taskBuilder;
    }

    when(outcomeValue) {
        var outcome = new models.TaskOutcome();
        outcome.value = outcomeValue;
        this.task.outcomes.push(outcome);
        var outcomeBuilder = new OutcomeBuilder(this.chainBuilder, outcome);
        return outcomeBuilder;
    }

    input(expression) {
        this.task.inputs.push(expression);
        return this;
    }

    output(expression) {
        this.task.outputs.push(expression);
        return this;
    }

    waitFor(eventName, eventKey) {
        var newTask = new models.SubscriptionTask();
        newTask.eventName = eventName;
        newTask.eventKey = eventKey;
        newTask.body = models.SubscriptionTaskBody;
        this.chainBuilder.addTask(newTask);
        var outcome = new models.TaskOutcome();
        outcome.nextTask = newTask.id;
        outcome.value = null;
        this.task.outcomes.push(outcome);
        var taskBuilder = new TaskBuilder(this.chainBuilder, newTask);
        return taskBuilder;
    }

    end(taskName) {
        var ancestor = this.iterateParents(this.task.id, taskName);
        if (!ancestor)
            throw "Parent task of name " + taskName + " not found";
        return new TaskBuilder(this.chainBuilder, ancestor);
    }

    onError(behavior, retryInterval = null) {
        this.task.errorBehavior = behavior;
        this.task.retryInterval = retryInterval;
        return this;
    }

    iterateParents(id, name) {
        var upstream = this.chainBuilder.getUpstreamTasks(id);
        for (let parent of upstream) {
            if (parent.name == name)
                return parent;
        }
        for (let parent of upstream) {
            var result = this.iterateParents(parent.id, name);
            if (result)
                return result;
        }
        return null;
    }
}

class OutcomeBuilder {
    
    constructor(chainBuilder, outcome) {
        this.chainBuilder = chainBuilder;
        this.outcome = outcome;
    }

    then(body, setup = null) {
        var newTask = new models.Task();
        newTask.body = body;
        this.chainBuilder.addTask(newTask);
        var taskBuilder = new TaskBuilder(this.chainBuilder, newTask);
        
        //setup
        if (setup) {
            setup(taskBuilder);
        }
        this.outcome.nextTask = newTask.id;
        return taskBuilder;
    
}
    thenStep(newTask) {
        this.outcome.nextTask = newTask.task.id;
        return newTask;
    }

    thenRun(task) {
        var newTask = new models.Task();
        class bodyClass extends abstractions.InlineTaskBody {
            constructor() {
                super(task);
            }
        };
        newTask.body = bodyClass;
        this.chainBuilder.addTask(newTask);
        var taskBuilder = new TaskBuilder(this.chainBuilder, newTask);
        this.outcome.nextTask = newTask.id;
        return taskBuilder;
    }
}

exports.ChainBuilder = ChainBuilder;
exports.TaskBuilder = TaskBuilder;
exports.OutcomeBuilder = OutcomeBuilder;
