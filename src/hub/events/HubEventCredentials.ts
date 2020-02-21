import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventCredentials<TCredentials> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (credentials: TCredentials) => void): HubEventCredentials<TCredentials>;
    public on(key: string, action: (credentials: TCredentials) => void): HubEventCredentials<TCredentials>;
    public on(...args: any[]): HubEventCredentials<TCredentials> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventCredentials<TCredentials>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventCredentials<TCredentials>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(credentials: TCredentials): void { super.emit(credentials); }
}
