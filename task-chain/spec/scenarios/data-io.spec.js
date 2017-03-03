"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../../src");
const memory_persistence_provider_1 = require("../../src/services/memory-persistence-provider");
describe("data io", () => {
    class AddNumbers extends src_1.StepBody {
        run(context) {
            this.result = this.number1 + this.number2;
            return src_1.ExecutionResult.resolveNext();
        }
    }
    class MyDataClass {
    }
    class Data_Workflow {
        constructor() {
            this.id = "data-workflow";
            this.version = 1;
        }
        build(builder) {
            builder
                .startWith(AddNumbers)
                .input((step, data) => step.number1 = data.value1)
                .input((step, data) => step.number2 = data.value2)
                .output((step, data) => data.value3 = step.result);
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
        host.registerChain(new Data_Workflow());
        host.start()
            .then(() => {
            host.startChain("data-workflow", 1, { value1: 2, value2: 3 })
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
    it("should have return value of 5", function () {
        expect(instance.data.value3).toBe(5);
    });
});
