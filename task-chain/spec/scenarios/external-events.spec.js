"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../src");
const memory_persistence_provider_1 = require("../../src/services/memory-persistence-provider");
describe("external events", () => {
    class Step1 extends src_1.StepBody {
        run(context) {
            return src_1.ExecutionResult.resolveNext();
        }
    }
    class MyDataClass {
    }
    class Event_Workflow {
        constructor() {
            this.id = "event-workflow";
            this.version = 1;
        }
        build(builder) {
            builder
                .startWith(Step1)
                .waitFor("my-event", "0")
                .output((step, data) => data.myValue = step.eventData);
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
        host.registerChain(new Event_Workflow());
        host.start()
            .then(() => {
            host.startChain("event-workflow", 1, { value1: 2, value2: 3 })
                .then(id => {
                chainId = id;
                var counter1 = 0;
                var callback1 = () => {
                    persistence.getSubscriptions("my-event", "0")
                        .then(subs => {
                        if ((subs.length == 0) && (counter1 < 60))
                            setTimeout(callback1, 500);
                        else
                            host.publishEvent("my-event", "0", "Pass");
                        counter1++;
                    })
                        .catch(done.fail);
                };
                var counter2 = 0;
                var callback2 = () => {
                    persistence.getChainInstance(chainId)
                        .then(result => {
                        instance = result;
                        if ((instance.status == src_1.ChainStatus.Runnable) && (counter2 < 60)) {
                            counter2++;
                            setTimeout(callback2, 500);
                        }
                        else {
                            done();
                        }
                    })
                        .catch(done.fail);
                };
                setTimeout(callback1, 500);
                setTimeout(callback2, 1000);
            });
        });
    });
    afterAll(() => {
        host.stop();
    });
    it("should be marked as complete", function () {
        expect(instance.status).toBe(src_1.ChainStatus.Complete);
    });
    it("should have return value of 'Pass'", function () {
        expect(instance.data.myValue).toBe("Pass");
    });
});
