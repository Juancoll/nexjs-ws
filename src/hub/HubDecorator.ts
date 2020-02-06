import { IDecoratorOptionsBase } from '../IDecoratorOptionsBase';

export interface IHubDecoratorOptions extends IDecoratorOptionsBase {
    selection?: (user: any, userCredentials: any, serverCredentials: any) => Promise<boolean>;
}

export const hubDecoratorKey = 'custom:hub';

// tslint:disable-next-line: variable-name
export const Hub = (options: IHubDecoratorOptions) => {
    return Reflect.metadata(hubDecoratorKey, options);
};
