import { Server } from 'socket.io';
import { ServerBase } from '../ServerBase';
import { IHubDecoratorOptions, hubDecoratorKey } from './HubDecorator';

interface IHubMessage {
    service: string;
    event: string;
    data: any;
}

interface IHubRequest extends IHubMessage {
    method: string;
    credentials: any;
}

interface IHubResponse extends IHubMessage {
    method: string;
    isSuccess: boolean;
    error?: string;
}

interface IHubEventDescription {
    options: IHubDecoratorOptions;
    clients: Array<{
        socket: SocketIO.Socket;
        credentials: string;
    }>;
}

export class HubServer extends ServerBase {

    private requestEvent = '__hub::request__';
    private responseEvent = '__hub::response__';
    private publishEvent = '__hub::publish__';

    private _services: {
        [service: string]: {
            [event: string]: IHubEventDescription,
        },
    } = {};

    protected onInitialize(server: Server, jwtDecoder: (token: string) => any): void {
        server.on('connection', client => {
            client
                .on(this.requestEvent, async (request: IHubRequest) => {
                    switch (request.method) {
                        case 'subscribe': await this.subscribe(client, request); break;
                        case 'unsubscribe': this.unusbscribe(client, request); break;
                        default: this.respondError(client, request, `method '${request.method}' not implemented.`);
                    }
                })
                .on('disconnect', () => this.removeClient(client));
        });
    }

    public register(instance: object): void {
        this.log(`register class ${instance.constructor.name}`);
        this.getEventDispatcherProperties(instance).forEach(propertyKey => {
            const metadata: IHubDecoratorOptions = Reflect.getMetadata(hubDecoratorKey, instance, propertyKey);
            if (metadata) {
                const service = metadata.service;
                const event = propertyKey;

                if (!this._services[service]) {
                    this._services[service] = {};
                }
                if (this._services[service][event]) {
                    throw new Error(`service '${service}' already contains event '${event}'`);
                }
                this._services[service][event] = {
                    options: metadata,
                    clients: [],
                };
                instance[event].sub(async (serverCredentials, data) => {
                    this.log(`${instance.constructor.name}.${event} dispatched`);
                    await this.publish(service, event, data, serverCredentials);
                });
            }
        });
    }

    //#region [ reflection ]
    private getEventDispatcherProperties(instance: any): string[] {
        let props: string[] = [];
        let current = instance;
        do {
            props = props.concat(Object.getOwnPropertyNames(current));
            current = Object.getPrototypeOf(current);
        } while (current);

        return props.sort().filter((name) => instance[name].constructor && instance[name].constructor.name == 'EventDispatcher');
    }
    //#endregion

    //#region [ message helpers ]
    private respondError(client: SocketIO.Socket, request: IHubRequest, message: string) {
        client.emit(this.responseEvent, {
            method: request.method,
            service: request.service,
            event: request.event,
            isSuccess: false,
            error: message,
        } as IHubResponse);
        this.error(message);
    }
    private respondSuccess(client: SocketIO.Socket, request: IHubRequest, data?: any) {
        client.emit(this.responseEvent, {
            method: request.method,
            service: request.service,
            event: request.event,
            isSuccess: true,
            data,
        } as IHubResponse);
        this.log('success');
    }
    //#endregion

    //#region  [ private ]
    private async subscribe(client: SocketIO.Socket, request: IHubRequest) {
        if (!this._services[request.service]) {
            this.respondError(
                client,
                request,
                `service '${request.service}' not found.`,
            );
        } else if (!this._services[request.service][request.event]) {
            this.respondError(
                client,
                request,
                `service '${request.service}' not contains event '${request.event}'.`,
            );
        } else {
            const isValid = await this.isOptionsValid(client, this._services[request.service][request.event].options, request.credentials);
            if (!isValid) {
                this.respondError(
                    client,
                    request,
                    `unauthorized`,
                );
            } else {
                const clients = this._services[request.service][request.event].clients;
                if (!clients.find(x => x.socket.id == client.id)) {
                    clients.push({
                        socket: client,
                        credentials: request.credentials,
                    });
                }
                this.respondSuccess(client, request);
            }
        }
    }
    private unusbscribe(client: SocketIO.Socket, request: IHubRequest) {
        if (!this._services[request.service]) {
            this.respondError(
                client,
                request,
                `service '${request.service}' not found.`,
            );
        } else if (!this._services[request.service][request.event]) {
            this.respondError(
                client,
                request,
                `service '${request.service}' not contains event '${request.event}'.`,
            );
        } else {
            const clients = this._services[request.service][request.event].clients;
            const idx = clients.findIndex(x => x.socket.id == client.id);
            if (idx > -1) {
                clients.splice(idx, 1);
            }
            this.respondSuccess(client, request);
        }
    }
    private async publish(service: string, event: string, data: any, serverCredentials: any) {
        const selection = this._services[service][event].options.selection;
        const clients = this._services[service][event].clients;
        const selectedClients: SocketIO.Socket[] = [];

        for (const client of clients) {
            const user = (client as any).user;
            const userCredentials = (client as any).credentials;

            if (!selection) {
                selectedClients.push(client.socket);
            } else {
                const isValid = await selection(user, userCredentials, serverCredentials);
                if (isValid) {
                    selectedClients.push(client.socket);
                }
            }
        }
        selectedClients.forEach(x => x.emit(this.publishEvent, {
            service,
            event,
            data,
        } as IHubMessage));
    }
    private removeClient(client: SocketIO.Socket) {
        for (const service in this._services) {
            if (service) {
                for (const event in this._services[service]) {
                    if (event) {
                        const clients = this._services[service][event].clients;
                        const idx = clients.findIndex(x => x.socket.id == client.id);
                        if (idx > -1) {
                            clients.splice(idx, 1);
                        }
                    }
                }
            }
        }
    }
    //#endregion
}
