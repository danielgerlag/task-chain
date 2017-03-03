const models = require("../models");

class SubscriptionTaskBody {
    
    constructor() {
        super(...arguments);
        this.eventData = null;
    }

    run(context) {
        return models.ExecutionResult.resolveNext();
    }
}

exports.SubscriptionTaskBody = SubscriptionTaskBody;
