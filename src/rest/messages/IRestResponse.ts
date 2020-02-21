import { IRestMessage } from './IRestMessage';
import { IWSError } from '../../base/IWSError';

export interface IRestResponse extends IRestMessage {
    isSuccess: boolean;
    error?: IWSError;
}
