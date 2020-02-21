import { IParamDecorator } from '../../decorators/IParamDecorator';

export const paramDecoratorKey = 'custom:param';

// tslint:disable-next-line: variable-name
export const Context = (name?: string) => {
    return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingParamDecorators: IParamDecorator[] = Reflect.getMetadata(paramDecoratorKey, target, propertyKey) || [];
        existingParamDecorators.push({
            type: 'context',
            name,
            idx: parameterIndex,
        });
        Reflect.defineMetadata(paramDecoratorKey, existingParamDecorators, target, propertyKey);
    };
};

// tslint:disable-next-line: variable-name
export const Data = (name?: string) => {
    return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
        const existingParamDecorators: IParamDecorator[] = Reflect.getMetadata(paramDecoratorKey, target, propertyKey) || [];
        existingParamDecorators.push({
            type: 'data',
            name,
            idx: parameterIndex,
        });
        Reflect.defineMetadata(paramDecoratorKey, existingParamDecorators, target, propertyKey);
    };
};
