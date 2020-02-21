import { IRestMessage } from './IRestMessage';

export interface IRestRequest extends IRestMessage {
    credentials: any;
}
