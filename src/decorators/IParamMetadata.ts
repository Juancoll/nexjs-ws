import { IParamDecorator } from './IParamDecorator';

export interface IParamMetadata {
    name: string;
    type: object;
    inject?: IParamDecorator;
}
