export class Controller {
    constructor() {
        this.initialized = false;
    }

    async init(params) {
        console.log('Controller initialized');
        this.initialized = true;
    }

    async destroy() {
        console.log('Controller destroyed');
        this.initialized = false;
    }
}
