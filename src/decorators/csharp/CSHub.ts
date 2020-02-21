export interface CSHubDecoratorOptions {
    credentials?: string;
    data?: string;
}

export const csHubDecoratorKey = 'custom:csHub';

// tslint:disable-next-line: variable-name
export const CSHub = (options: CSHubDecoratorOptions) => {
    return Reflect.metadata(csHubDecoratorKey, options);
};
