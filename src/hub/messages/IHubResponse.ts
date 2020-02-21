import { IHubMessage } from './IHubMessage';
import { IWSError } from '../../base/IWSError';

export interface IHubResponse extends IHubMessage {
    method: string;
    isSuccess: boolean;
    error?: IWSError;
}
