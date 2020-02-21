import { IHubDecoratorOptions } from '../HubDecorator';

export interface IHubEventDescriptor {
    service: string;
    event: string;
    instance: any;
    options: IHubDecoratorOptions;
    clients: Array<{
        socket: SocketIO.Socket;
        credentials: string;
    }>;
}
