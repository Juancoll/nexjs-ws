export interface IDecoratorOptionsBase<T = any> {
    service?: string;
    isAuth?: boolean;
    roles?: string[];
    validation?: (instance: T, user: any, credentials: any) => Promise<boolean>;
}
