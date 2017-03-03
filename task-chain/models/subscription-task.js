const models = require("../models");

class SubscriptionTask extends models.Task {
    constructor() {
        super(...arguments);
        this.eventKey = null;
        this.eventName = null;
    }
}
exports.SubscriptionTask = SubscriptionTask;
