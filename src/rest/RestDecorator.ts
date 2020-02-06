import { IDecoratorOptionsBase } from '../IDecoratorOptionsBase';

// tslint:disable-next-line: no-empty-interface
export interface RestDecoratorOptions extends IDecoratorOptionsBase {
}

export const restDecoratorKey = 'custom:rest';

// tslint:disable-next-line: variable-name
export const Rest = (options: RestDecoratorOptions) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(restDecoratorKey, options, target, propertyKey);
    };
};
