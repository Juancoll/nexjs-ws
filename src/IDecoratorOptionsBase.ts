export interface IDecoratorOptionsBase {
    service: string;
    isAuth?: boolean;
    roles?: string[];
    validation?: (user: any, credentials: any) => Promise<boolean>;
}
