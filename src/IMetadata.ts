import { IParamDecorator } from './ParamDecorators';

export interface IParamMetadata {
    name: string;
    type: object;
    inject?: IParamDecorator;
}

export interface IMethodMetadata {
    target: object;
    params: IParamMetadata[];
    returnType: any;
}
