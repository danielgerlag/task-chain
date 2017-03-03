
class InlineTaskBody {
    
    constructor(func) {        
        this.func = func;
    }

    run(context) {
        return this.func(context);
    }
}

exports.InlineTaskBody = InlineTaskBody;
