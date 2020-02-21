export interface CSRestDecoratorOptions {
    return?: string;
    credentials?: string;
    data?: string | { [name: string]: string };
}

export const csRestDecoratorKey = 'custom:csrest';

// tslint:disable-next-line: variable-name
export const CSRest = (options: CSRestDecoratorOptions) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(csRestDecoratorKey, options, target, propertyKey);
    };
};
