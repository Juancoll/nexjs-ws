// tslint:disable:ban-types
import { IDecoratorOptionsBase } from '../base/IDecoratorOptionsBase';

export interface IHubDecoratorOptions<T = any> extends IDecoratorOptionsBase<T> {
    selection?: (instance: T, user: any, userCredentials: any, serverCredentials: any) => Promise<boolean>;
}

export const hubDecoratorKey = 'custom:hub';

type HubType = <T = any> (options?: IHubDecoratorOptions<T>) => (hubDecoratorKey: any, options: any) => void;

// tslint:disable-next-line: variable-name
export const Hub: HubType = (options) => {
    return Reflect.metadata(hubDecoratorKey, !options ? {} : options);
};
