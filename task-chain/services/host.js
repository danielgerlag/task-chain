const models = require("../models");
const services = require("../services");

class Host {
    
    constructor() {
        this.registry = new services.ChainRegistry();
        this.persistence = new services.MemoryPersistenceProvider();
        this.lockProvider = new services.SingleNodeLockProvider();
        this.queueProvider = new services.SingleNodeQueueProvider();
        this.logger = new services.NullLogger();
    }
    
    usePersistence(provider) {
        this.persistence = provider;
    }

    useLogger(logger) {
        this.logger = logger;
    }

    start() {
        this.logger.log("Starting host...");
        this.executor = new services.TaskExecutor(this, this.persistence, this.registry, this.logger);
        this.processTimer = setInterval(this.processChainQueue, 500, this);
        this.pollTimer = setInterval(this.pollRunnables, 10000, this);
        this.publishTimer = setInterval(this.processPublicationQueue, 1000, this);
        this.registerCleanCallbacks();
        return Promise.resolve(undefined);
    }

    stop() {
        this.logger.log("Stopping host...");
        this.stashUnpublishedEvents();
        if (this.processTimer)
            clearInterval(this.processTimer);
        if (this.pollTimer)
            clearInterval(this.pollTimer);
        if (this.publishTimer)
            clearInterval(this.publishTimer);
    
    }

    async startChain(id, version, data = {}) {
        var self = this;
        var def = self.registry.getDefinition(id, version);
        var chain = new models.ChainInstance();
        chain.data = data;
        chain.description = def.description;
        chain.workflowDefinitionId = def.id;
        chain.version = def.version;
        chain.nextExecution = 0;
        chain.status = models.ChainStatus.Runnable;
        var ep = new models.ExecutionPointer();
        ep.active = true;
        ep.taskId = def.initialTask;
        ep.concurrentFork = 1;
        chain.executionPointers.push(ep);
        var chainId = await self.persistence.createNewChain(chain);
        self.queueProvider.queueForProcessing(chainId);
        return chainId;
    }

    registerChain(chain) {
        this.registry.registerChain(chain);
    }

    async subscribeEvent(chainId, taskId, eventName, eventKey) {
        var self = this;
        self.logger.info("Subscribing to event %s %s for chain %s task %s", eventName, eventKey, chainId, taskId);
        var sub = new models.EventSubscription();
        sub.chainId = chainId;
        sub.taskId = taskId;
        sub.eventName = eventName;
        sub.eventKey = eventKey;
        await self.persistence.createEventSubscription(sub);
    }

    async publishEvent(eventName, eventKey, eventData) {
        var self = this;
        //todo: check host status        
        self.logger.info("Publishing event %s %s", eventName, eventKey);
        var subs = await self.persistence.getSubscriptions(eventName, eventKey);
        var deferredPubs = [];
        for (let sub of subs) {
            var pub = new models.EventPublication();
            pub.id = (Math.random() * 0x10000000000000).toString(16);
            pub.eventData = eventData;
            pub.eventKey = eventKey;
            pub.eventName = eventName;
            pub.taskId = sub.taskId;
            pub.chainId = sub.chainId;
            deferredPubs.push(new Promise((resolvePub, rejectPub) => {
                self.queueProvider.queueForPublish(pub)
                    .then(() => {
                    self.persistence.terminateSubscription(sub.id)
                        .then(() => {
                        resolvePub();
                    });
                })
                    .catch((err) => {
                    self.persistence.createUnpublishedEvent(pub)
                        .then(() => {
                        self.persistence.terminateSubscription(sub.id)
                            .then(() => {
                            resolvePub();
                        });
                    });
                });
            }));
        }
        await Promise.all(deferredPubs);
    }

    async suspendChain(id) {
        var self = this;
        try {
            var result = false;
            var gotLock = await self.lockProvider.aquireLock(id);
            if (gotLock) {
                try {
                    var wf = await self.persistence.getChainInstance(id);
                    if (wf.status == models.ChainStatus.Runnable) {
                        wf.status = models.ChainStatus.Suspended;
                        await self.persistence.persistChain(wf);
                        result = true;
                    }
                }
                finally {
                    self.lockProvider.releaseLock(id);
                }
            }
            return result;
        }
        catch (err) {
            self.logger.error("Error suspending chain: " + err);
            return false;
        }
    }

    async resumeChain(id) {
        var self = this;
        try {
            var result = false;
            var gotLock = await self.lockProvider.aquireLock(id);
            if (gotLock) {
                try {
                    var wf = await self.persistence.getChainInstance(id);
                    if (wf.status == models.ChainStatus.Suspended) {
                        wf.status = models.ChainStatus.Runnable;
                        await self.persistence.persistChain(wf);
                        result = true;
                    }
                }
                finally {
                    self.lockProvider.releaseLock(id);
                }
            }
            return result;
        }
        catch (err) {
            self.logger.error("Error resuming chain: " + err);
            return false;
        }
    }

    async terminateChain(id) {
        var self = this;
        try {
            var result = false;
            var gotLock = await self.lockProvider.aquireLock(id);
            if (gotLock) {
                try {
                    var wf = await self.persistence.getChainInstance(id);
                    wf.status = models.ChainStatus.Terminated;
                    await self.persistence.persistChain(wf);
                    result = true;
                }
                finally {
                    self.lockProvider.releaseLock(id);
                }
            }
            return result;
        }
        catch (err) {
            self.logger.error("Error terminating chain: " + err);
            return false;
        }
    }

    async processChainQueue(host) {
        try {
            var chainId = await host.queueProvider.dequeueForProcessing();
            while (chainId) {
                host.logger.log("Dequeued chain " + chainId + " for processing");
                host.processChain(host, chainId)
                    .catch((err) => {
                    host.logger.error("Error processing chain", chainId, err);
                });
                chainId = await host.queueProvider.dequeueForProcessing();
            }
        }
        catch (err) {
            host.logger.error("Error processing chain queue: " + err);
        }
    }

    async processChain(host, chainId) {
        try {
            var gotLock = await host.lockProvider.aquireLock(chainId);
            if (gotLock) {
                var complete = false;
                try {
                    var instance = await host.persistence.getChainInstance(chainId);
                    if (instance.status == models.ChainStatus.Runnable) {
                        await host.executor.execute(instance);
                        complete = true;
                    }
                }
                finally {
                    await host.lockProvider.releaseLock(chainId);
                    if (complete) {
                        if ((instance.status == models.ChainStatus.Runnable) && (instance.nextExecution !== null)) {
                            if (instance.nextExecution < Date.now()) {
                                host.queueProvider.queueForProcessing(chainId);
                            }
                        }
                    }
                }
            }
            else {
                host.logger.log("Chain locked: " + chainId);
            }
        }
        catch (err) {
            host.logger.error("Error processing chain: " + err);
        }
    }

    async processPublicationQueue(host) {
        try {
            var pub = await host.queueProvider.dequeueForPublish();
            while (pub) {
                host.processPublication(host, pub)
                    .catch((err) => {
                    host.logger.error(err);
                    host.persistence.createUnpublishedEvent(pub);
                });
                pub = await host.queueProvider.dequeueForPublish();
            }
        }
        catch (err) {
            host.logger.error("Error processing publication queue: " + err);
        }
    }

    async processPublication(host, pub) {
        try {
            host.logger.log("Publishing event " + pub.eventName + " for " + pub.chainId);
            var gotLock = await host.lockProvider.aquireLock(pub.chainId);
            if (gotLock) {
                try {
                    var instance = await host.persistence.getChainInstance(pub.chainId);
                    var pointers = instance.executionPointers.filter(ep => ep.eventName == pub.eventName && ep.eventKey == pub.eventKey && !ep.eventPublished);
                    for (let p of pointers) {
                        p.eventData = pub.eventData;
                        p.eventPublished = true;
                        p.active = true;
                    }
                    instance.nextExecution = 0;
                    await host.persistence.persistChain(instance);
                    host.logger.log("Published event " + pub.eventName + " for " + pub.chainId);
                }
                finally {
                    await host.lockProvider.releaseLock(pub.chainId);
                    await host.queueProvider.queueForProcessing(pub.chainId);
                }
            }
            else {
                host.logger.info("Chain locked " + pub.chainId);
            }
        }
        catch (err) {
            host.logger.error("Error processing publication: " + err);
        }
    }

    pollRunnables(host) {
        host.logger.info("pollRunnables " + " - now = " + Date.now());
        host.persistence.getRunnableInstances()
            .then((runnables) => {
            for (let item of runnables) {
                host.queueProvider.queueForProcessing(item);
            }
        })
            .catch(err => host.logger.error(err));
    }

    async stashUnpublishedEvents() {
        var self = this;
        var pub = await self.queueProvider.dequeueForPublish();
        while (pub) {
            await self.persistence.createUnpublishedEvent(pub);
            pub = await self.queueProvider.dequeueForPublish();
        }
    }

    registerCleanCallbacks() {
        var self = this;
        if (typeof process !== 'undefined' && process) {
            process.on('SIGINT', () => {
                self.stop();
            });
        }
        // if (typeof window !== 'undefined' && window) {
        //     window.addEventListener('beforeunload', function(event) {
        //         self.stop();
        //     });
        // }
    }
}

exports.Host = Host;
