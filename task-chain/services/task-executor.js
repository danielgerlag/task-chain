const models = require("../models");
const _ = require("underscore");

class TaskExecutor {

    constructor(host, persistence, registry, logger) {
        this.host = host;
        this.persistence = persistence;
        this.registry = registry;
        this.logger = logger;
    }

    async execute(instance) {
        var self = this;
        self.logger.log("Execute task chain: " + instance.id);        
        
        var def = self.registry.getDefinition(instance.chainDefinitionId, instance.version);
        if (!def) {
            throw "No chain definition in registry for " + instance.chainDefinitionId + ":" + instance.version;
        }

        var exePointers = _.where(instance.executionPointers, { active: true });

        for (let pointer of exePointers) {
            var task = _.findWhere(def.tasks, { id: pointer.taskId });
            if (task) {
                try {
                    if ((task instanceof models.SubscriptionTask) && (!pointer.eventPublished)) {
                        pointer.eventKey = task.eventKey;
                        pointer.eventName = task.eventName;
                        pointer.active = false;
                        await self.persistence.persistChain(instance);
                        var subTask = task;
                        self.host.subscribeEvent(instance.id, pointer.taskId, subTask.eventName, subTask.eventKey);
                        continue;
                    }
                    if (!pointer.startTime)
                        pointer.startTime = new Date();

                    //log starting task
                    var stepContext = new models.TaskExecutionContext();
                    stepContext.persistenceData = pointer.persistenceData;
                    stepContext.task = task;
                    stepContext.chain = instance;
                    var body = new task.body(); //todo: di

                    //inputs
                    for (let input of task.inputs) {
                        input(body, instance.data);
                    }

                    //set event data
                    if (body instanceof models.SubscriptionTaskBody) {
                        body.eventData = pointer.eventData;
                    }

                    //execute
                    var taskResult = await body.run(stepContext);
                    if (taskResult.proceed) {

                        //outputs
                        for (let output of task.outputs) {
                            output(body, instance.data);
                        }

                        pointer.active = false;
                        pointer.endTime = new Date();
                        var noOutcomes = true;
                        var forkCounter = 1;
                        for (let outcome of _.where(task.outcomes, { value: taskResult.outcomeValue })) {
                            noOutcomes = false;
                            var newPointer = new models.ExecutionPointer();
                            newPointer.active = true;
                            newPointer.taskId = outcome.nextTask;
                            newPointer.concurrentFork = (forkCounter * pointer.concurrentFork);
                            instance.executionPointers.push(newPointer);
                            forkCounter++;
                        }
                        pointer.pathTerminal = noOutcomes;
                    }
                    else {
                        pointer.persistenceData = taskResult.persistenceData;
                        if (taskResult.sleep)
                            pointer.sleepUntil = taskResult.sleep.getTime();
                    }
                }
                catch (err) {
                    self.logger.error("Error executing chain %s on task %s - %o", instance.id, pointer.taskId, err);
                    switch (task.errorBehavior) {
                        case models.ErrorBehavior.Retry:
                            pointer.sleepUntil = (Date.now() + task.retryInterval);
                            break;
                        case models.ErrorBehavior.Suspend:
                            instance.status = models.ChainStatus.Suspended;
                            break;
                        case models.ErrorBehavior.Terminate:
                            instance.status = models.ChainStatus.Terminated;
                            break;
                        default:
                            pointer.sleepUntil = (Date.now() + 60000);
                            break;
                    }
                    var perr = new models.ExecutionError();
                    perr.message = err.message;
                    perr.errorTime = new Date();
                    pointer.errors.push(perr);
                }
            }
            else {
                self.logger.error("Could not find task on chain %s %s", instance.id, pointer.taskId);
                pointer.sleepUntil = (Date.now() + 60000); //todo: make configurable
            }
        }
        self.determineNextExecutionTime(instance);
        await self.persistence.persistChain(instance);
    }

    determineNextExecutionTime(instance) {
        instance.nextExecution = null;
        for (let pointer of instance.executionPointers.filter(value => value.active)) {
            if (!pointer.sleepUntil) {
                instance.nextExecution = 0;
                return;
            }
            instance.nextExecution = Math.min(pointer.sleepUntil, instance.nextExecution ? instance.nextExecution : pointer.sleepUntil);
        }
        if (instance.nextExecution === null) {
            var forks = 1;
            var terminals = 0;
            for (let pointer of instance.executionPointers) {
                forks = Math.max(pointer.concurrentFork, forks);
                if (pointer.pathTerminal)
                    terminals++;
            }
            if (forks <= terminals)
                instance.status = models.ChainStatus.Complete;
        }
    }
}

exports.TaskExecutor = TaskExecutor;
