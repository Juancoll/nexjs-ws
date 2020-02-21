import { IDecoratorOptionsBase } from '../../base/IDecoratorOptionsBase';

// tslint:disable-next-line: no-empty-interface
export interface RestDecoratorOptions<T = any> extends IDecoratorOptionsBase<T> {
}

export const restDecoratorKey = 'custom:rest';

type RestType = <T = any> (options?: RestDecoratorOptions<T>) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;

// tslint:disable-next-line: variable-name
export const Rest: RestType = (options) => {
    return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(restDecoratorKey, !options ? {} : options, target, propertyKey);
    };
};
