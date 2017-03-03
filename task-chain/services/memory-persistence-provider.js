const models = require("../models");

// In-memory implementation of IPersistenceProvider for demo and testing purposes
class MemoryPersistenceProvider {

    constructor() {
        this.instances = [];
        this.subscriptions = [];
        this.publications = [];
    }

    async createNewChain(instance) {
        instance.id = this.generateUID();
        this.instances.push(instance);
        return instance.id;
    }

    async persistChain(instance) {
        var _ = require("underscore");
        var existing = _.findWhere(this.instances, { id: instance.id });
        var idx = this.instances.indexOf(existing);
        this.instances[idx] = instance;
    }

    async getChainInstance(chainId) {
        var _ = require("underscore");
        var existing = _.findWhere(this.instances, { id: chainId });
        return existing;
    }

    async getRunnableInstances() {
        var _ = require("underscore");
        var runnables = this.instances.filter(x => x.status == models.ChainStatus.Runnable && x.nextExecution < Date.now());
        var result = [];
        for (let item of runnables) {
            result.push(item.id);
        }
        return result;
    }

    async createEventSubscription(subscription) {
        subscription.id = this.generateUID();
        this.subscriptions.push(subscription);
    }

    async getSubscriptions(eventName, eventKey) {
        return this.subscriptions.filter(x => x.eventName == eventName && x.eventKey == eventKey);
    }

    async terminateSubscription(id) {
        for (let item of this.subscriptions.filter(x => x.id == id)) {
            this.subscriptions.splice(this.subscriptions.indexOf(item), 1);
        }
    }

    async createUnpublishedEvent(publication) {
        this.publications.push(publication);
    }

    async getUnpublishedEvents() {
        return this.publications;
    }

    async removeUnpublishedEvent(id) {
        var self = this;
        for (let item of self.publications.filter(x => x.id == id)) {
            self.publications.splice(self.publications.indexOf(item), 1);
        }
    }

    generateUID() {
        return (Math.random() * 0x10000000000000).toString(16);
    }
}

exports.MemoryPersistenceProvider = MemoryPersistenceProvider;
