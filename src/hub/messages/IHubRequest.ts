import { IHubMessage } from './IHubMessage';

export interface IHubRequest extends IHubMessage {
    method: string;
    credentials: any;
}
