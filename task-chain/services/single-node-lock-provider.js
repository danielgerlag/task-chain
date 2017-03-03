
// Single node in-memory implementation of IDistributedLockProvider (not really distributed)
class SingleNodeLockProvider {
    
    constructor() {
        this.locks = [];
    }

    async aquireLock(id) {
        if (this.locks.indexOf(id) > -1) {
            return false;
        }
        this.locks.push(id);
        return true;
    }
    
    async releaseLock(id) {
        if (this.locks.indexOf(id) > -1) {
            this.locks.splice(this.locks.indexOf(id), 1);
        }
    }
}

exports.SingleNodeLockProvider = SingleNodeLockProvider;
