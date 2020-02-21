import { IParamMetadata } from './IParamMetadata';

export interface IMethodMetadata {
    target: object;
    params: IParamMetadata[];
    returnType: any;
}
