"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../src");
const memory_persistence_provider_1 = require("../../src/services/memory-persistence-provider");
var outcomeForkScope = {
    taskATicker: 0,
    taskBTicker: 0,
    taskCTicker: 0
};
describe("multiple outcomes", () => {
    class TaskA extends src_1.StepBody {
        run(context) {
            outcomeForkScope.taskATicker++;
            return src_1.ExecutionResult.resolveOutcome(true);
        }
    }
    class TaskB extends src_1.StepBody {
        run(context) {
            outcomeForkScope.taskBTicker++;
            return src_1.ExecutionResult.resolveNext();
        }
    }
    class TaskC extends src_1.StepBody {
        run(context) {
            outcomeForkScope.taskCTicker++;
            return src_1.ExecutionResult.resolveNext();
        }
    }
    class Outcome_Workflow {
        constructor() {
            this.id = "outcome-workflow";
            this.version = 1;
        }
        build(builder) {
            var taskA = builder.startWith(TaskA);
            taskA.when(false)
                .then(TaskB);
            taskA.when(true)
                .then(TaskC);
        }
    }
    var chainId = null;
    var instance = null;
    var host = new src_1.WorkflowHost();
    var persistence = new memory_persistence_provider_1.MemoryPersistenceProvider();
    host.usePersistence(persistence);
    host.useLogger(console);
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
    beforeAll((done) => {
        host.registerChain(new Outcome_Workflow());
        host.start()
            .then(() => {
            host.startChain("outcome-workflow", 1)
                .then(id => {
                chainId = id;
                var counter = 0;
                var callback = () => {
                    persistence.getChainInstance(chainId)
                        .then(result => {
                        instance = result;
                        if ((instance.status == src_1.ChainStatus.Runnable) && (counter < 60)) {
                            counter++;
                            setTimeout(callback, 500);
                        }
                        else {
                            done();
                        }
                    })
                        .catch(done.fail);
                };
                setTimeout(callback, 500);
            });
        });
    });
    afterAll(() => {
        host.stop();
    });
    it("should be marked as complete", function () {
        expect(instance.status).toBe(src_1.ChainStatus.Complete);
    });
    it("should have executed task A once", function () {
        expect(outcomeForkScope.taskATicker).toBe(1);
    });
    it("should not have executed task B", function () {
        expect(outcomeForkScope.taskBTicker).toBe(0);
    });
    it("should have executed task C once", function () {
        expect(outcomeForkScope.taskCTicker).toBe(1);
    });
});
