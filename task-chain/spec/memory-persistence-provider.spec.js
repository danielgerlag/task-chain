"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../src/models");
const memory_persistence_provider_1 = require("../src/services/memory-persistence-provider");
describe("memory-persistence-provider", () => {
    var persistence = new memory_persistence_provider_1.MemoryPersistenceProvider();
    var wf1;
    beforeEach(() => {
    });
    describe("createNewChain", () => {
        var returnedId;
        beforeEach((done) => {
            wf1 = new models_1.ChainInstance();
            return persistence.createNewChain(wf1)
                .then(id => {
                returnedId = id;
                done();
            })
                .catch(done.fail);
        });
        it("should return a generated id", function () {
            expect(returnedId).toBeDefined();
        });
        it("should return update original object with id", function () {
            expect(wf1.id).toBeDefined();
        });
    });
    describe("getChainInstance", () => {
        var wf2;
        beforeEach((done) => {
            persistence.getChainInstance(wf1.id)
                .then(wf => {
                wf2 = wf;
                done();
            })
                .catch(done.fail);
        });
        it("should match the orignal", function () {
            expect(JSON.stringify(wf2)).toBe(JSON.stringify(wf1));
        });
    });
    describe("persistChain", () => {
        var modified;
        beforeEach((done) => {
            modified = JSON.parse(JSON.stringify(wf1));
            modified.nextExecution = 44;
            modified.executionPointers.push(new models_1.ExecutionPointer());
            persistence.persistChain(modified)
                .then(() => done())
                .catch(done.fail);
        });
        it("should match the orignal", (done) => {
            persistence.getChainInstance(modified.id)
                .then((data) => {
                expect(JSON.stringify(data)).toBe(JSON.stringify(modified));
                done();
            })
                .catch(done.fail);
        });
    });
});
