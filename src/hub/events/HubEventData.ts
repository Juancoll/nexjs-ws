import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventData<TData> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (data: TData) => void): HubEventData<TData>;
    public on(key: string, action: (data: TData) => void): HubEventData<TData>;
    public on(...args: any[]): HubEventData<TData> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventData<TData>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventData<TData>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(data: TData): void { super.emit(data); }
}
