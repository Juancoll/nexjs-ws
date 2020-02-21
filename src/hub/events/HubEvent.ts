import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEvent extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: () => void): HubEvent;
    public on(key: string, action: () => void): HubEvent;
    public on(...args: any[]): HubEvent {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEvent;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEvent;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(): void { super.emit(); }
}
