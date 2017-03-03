class SingleNodeQueueProvider {
    
    constructor() {
        this.processQueue = [];
        this.publishQueue = [];
    }

    async queueForProcessing(chainId) {
        this.processQueue.push(chainId);
    }

    async dequeueForProcessing() {
        return this.processQueue.shift();
    }

    async queueForPublish(publication) {
        this.publishQueue.push(publication);
    }
    
    async dequeueForPublish() {
        return this.publishQueue.shift();
    }
}

exports.SingleNodeQueueProvider = SingleNodeQueueProvider;
