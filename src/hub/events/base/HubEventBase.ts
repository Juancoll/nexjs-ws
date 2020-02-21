import { IHubEventOptions } from './IHubEventOptions';

export abstract class HubEventBase {
    //#region [ fields ]
    private _actions: Array<(...args: any[]) => void> = [];
    private _groups: { [key: string]: Array<(...args: any[]) => void> } = {};
    //#endregion

    //#region [ properties ]
    public _type: string;
    public options: {
        id: string;
        debug: boolean;
    };
    //#endregion

    //#region [ constructor ]
    constructor(options?: IHubEventOptions) {
        this.options = options || { id: '', debug: false };
        this._type = this.constructor.name;
    }

    //#region [ protected ]
    protected sub(action: (...args: any[]) => void): HubEventBase;
    protected sub(key: any, action: (...args: any[]) => void): HubEventBase;
    protected sub(...args: any[]): HubEventBase {
        if (args.length == 1 && typeof args[0] == 'function') {
            if (this.options.debug) {
                console.log(`[${this._type}][${this.options.id}] on(action)`);
            }
            const action = args[0];
            this._actions.push(action);
            return this;

        } else if (args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            if (this.options.debug) {
                console.log(`[${this._type}][${this.options.id}] on(${key}, action)`);
            }
            const action = args[1];
            this._actions.push(action);

            if (!this._groups[key]) {
                this._groups[key] = [];
            }
            this._groups[key].push(action);
            return this;
        } else {
            throw new Error('invalid params');
        }
    }
    protected emit(...args: any[]): void {
        this._actions.forEach((action, idx) => {
            try {
                if (this.options.debug) {
                    console.log(`[${this._type}][${this.options.id}] emit(...) #${idx}`);
                }
                action(...args);
            } catch (err) {
                if (this.options.debug) {
                    console.log(`[${this._type}][${this.options.id}] error: ${err.message}`);
                }
            }
        });
    }
    //#endregion

    //#region [ public ]
    public off(): void;
    public off(action: (...args: any[]) => void): HubEventBase;
    public off(key: string): HubEventBase;
    public off(...args: any[]): HubEventBase {
        if (!args || args.length == 0) {
            if (this.options.debug) {
                console.log(`[${this._type}][${this.options.id}] off()`);
            }
            this._actions = [];
            this._groups = {};
            return this;

        } else if (args && args.length == 1 && typeof args[0] == 'function') {
            if (this.options.debug) {
                console.log(`[${this._type}][${this.options.id}] off(action)`);
            }
            const action = args[0];
            this._actions = this._actions.filter(x => x != action);
            for (const key in this._groups) {
                if (key) {
                    this._groups[key] = this._groups[key].filter(x => x != action);
                    if (this._groups[key].length == 0) {
                        delete this._groups[key];
                    }
                }
            }
            return this;

        } else if (args && args.length == 1 && typeof args[0] == 'string') {
            const key = args[0];
            if (this.options.debug) {
                console.log(`[${this._type}][${this.options.id}] off(${key})`);
            }
            if (this._groups[key]) {
                this._actions = this._actions.filter(action => this._groups[key].indexOf(action) == -1);
                delete this._groups[key];
            }
            return this;
        } else {
            throw new Error('invalid params');
        }
    }
    //#endregion
}
