import { HubEventBase } from './base/HubEventBase';
import { IHubEventOptions } from './base/IHubEventOptions';

export class HubEventCredentialsData<TCredentials, TData> extends HubEventBase {

    constructor(options?: IHubEventOptions) { super(options); }

    public on(action: (credentials: TCredentials, data: TData) => void): HubEventCredentialsData<TCredentials, TData>;
    public on(key: string, action: (credentials: TCredentials, data: TData) => void): HubEventCredentialsData<TCredentials, TData>;
    public on(...args: any[]): HubEventCredentialsData<TCredentials, TData> {
        if (args && args.length == 1 && typeof args[0] == 'function') {
            const action = args[0];
            return this.sub(action) as HubEventCredentialsData<TCredentials, TData>;

        } else if (args && args.length == 2 && typeof args[0] == 'string' && typeof args[1] == 'function') {
            const key = args[0];
            const action = args[1];
            return this.sub(key, action) as HubEventCredentialsData<TCredentials, TData>;
        } else {
            throw new Error('invalid params');
        }
    }

    public emit(credentials: TCredentials, data: TData): void { super.emit(credentials, data); }
}
