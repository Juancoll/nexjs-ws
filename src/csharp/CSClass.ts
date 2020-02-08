// tslint:disable-next-line: no-empty-interface
export interface CSClassDecoratorOptions {
    base: string;
}

export const csClassDecoratorKey = 'custom:csclass';

// tslint:disable-next-line: variable-name
export const CSClass = (options: CSClassDecoratorOptions) => {
    return function sealed(constructor: Function) {
    }
};
