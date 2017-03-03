"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../src");
const memory_persistence_provider_1 = require("../../src/services/memory-persistence-provider");
var basicWorkflowScope = {
    task1Ticker: 0,
    task2Ticker: 0
};
describe("basic workflow", () => {
    class Step1 extends src_1.StepBody {
        run(context) {
            basicWorkflowScope.task1Ticker++;
            return src_1.ExecutionResult.resolveNext();
        }
    }
    class Step2 extends src_1.StepBody {
        run(context) {
            basicWorkflowScope.task2Ticker++;
            return src_1.ExecutionResult.resolveNext();
        }
    }
    class Basic_Workflow {
        constructor() {
            this.id = "basic-workflow";
            this.version = 1;
        }
        build(builder) {
            builder
                .startWith(Step1)
                .then(Step2);
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
        host.registerChain(new Basic_Workflow());
        host.start()
            .then(() => {
            host.startChain("basic-workflow", 1)
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
    it("should have an id", function () {
        expect(chainId).toBeDefined();
    });
    it("should be marked as complete", function () {
        expect(instance.status).toBe(src_1.ChainStatus.Complete);
    });
    it("should have executed step 1 once", function () {
        expect(basicWorkflowScope.task1Ticker).toBe(1);
    });
    it("should have executed step 2 once", function () {
        expect(basicWorkflowScope.task2Ticker).toBe(1);
    });
});
