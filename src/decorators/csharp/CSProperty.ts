export interface CSPropertyDecoratorOptions {
    type: string;
}

export const csPropertyDecoratorKey = 'custom:csproperty';

// tslint:disable-next-line: variable-name
export const CSProperty = (options: CSPropertyDecoratorOptions) => {
    return Reflect.metadata(csPropertyDecoratorKey, options);
};
