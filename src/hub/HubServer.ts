import { Server } from 'socket.io';

import { ServerBase } from '../base/ServerBase';

import { IHubDecoratorOptions, hubDecoratorKey } from './HubDecorator';
import { IHubRequest } from './messages/IHubRequest';
import { IHubResponse } from './messages/IHubResponse';
import { IHubMessage } from './messages/IHubMessage';
import { HubServiceCollection } from './types/HubServiceCollection';
import { WSErrorCode } from '../base/WSErrorCode';
import { IWSError } from '../base/IWSError';

export class HubServer extends ServerBase {

    //#region [ constants ]
    private REQUEST_EVENT = '__hub::request__';
    private RESPONSE_EVENT = '__hub::response__';
    private PUBLISH_EVENT = '__hub::publish__';
    //#endregion

    private _services = new HubServiceCollection();

    //#region  [ implement ServerBase ]
    protected onInitialize(server: Server): void {
        server.on('connection', client => {
            client
                .on(this.REQUEST_EVENT, async (req: IHubRequest) => {
                    try {
                        switch (req.method) {
                            case 'subscribe': await this.subscribe(client, req); break;
                            case 'unsubscribe': this.unusbscribe(client, req); break;
                            default: this.respondError(client, req, {
                                code: WSErrorCode.ws_error,
                                message: `method '${req.method}' not implemented.`,
                            });
                        }
                    } catch (err) {
                        this.respondError(client, req, {
                            code: WSErrorCode.ws_error,
                            message: `method '${req.method}': ${err.message}`,
                        });
                    }
                })
                .on('disconnect', () => this.removeClient(client));
        });
    }

    public register(instance: any): void {
        this.logger.log(`register class ${instance.constructor.name}`);
        this.getEventDispatcherProperties(instance).forEach(propertyKey => {
            const options: IHubDecoratorOptions = Reflect.getMetadata(hubDecoratorKey, instance, propertyKey);
            if (options) {
                const service = options.service
                    ? options.service
                    : this.extractServiceNameFromInstance(instance);
                const event = propertyKey;

                if (this._services.exists(service, event)) {
                    throw new Error(`service '${service}' already contains event '${event}'`);
                }
                this._services.add({ service, event, instance, options, clients: [] });

                switch (instance[event]._type) {
                    case 'HubEvent':
                        instance[event].on(async () => {
                            this.logger.log(`${instance.constructor.name}.${event} dispatched`);
                            await this.publish(service, event, null, null);
                        });
                        break;
                    case 'HubEventCredentials':
                        instance[event].on(async (credentials: any) => {
                            this.logger.log(`${instance.constructor.name}.${event} dispatched`);
                            await this.publish(service, event, null, credentials);
                        });
                        break;
                    case 'HubEventData':
                        instance[event].on(async (data: any) => {
                            this.logger.log(`${instance.constructor.name}.${event} dispatched`);
                            await this.publish(service, event, data, null);
                        });
                        break;
                    case 'HubEventCredentialsData':
                        instance[event].on(async (credentials: any, data: any) => {
                            this.logger.log(`${instance.constructor.name}.${event} dispatched`);
                            await this.publish(service, event, data, credentials);
                        });
                        break;
                }
            }
        });
    }
    registerMany(instances: any[]) {
        instances.forEach(instance => this.register(instance));
    }
    //#endregion

    //#region [ reflection ]
    private getEventDispatcherProperties(instance: any): string[] {
        let props: string[] = [];
        let current = instance;
        do {
            props = props.concat(Object.getOwnPropertyNames(current));
            current = Object.getPrototypeOf(current);
        } while (current);

        return props.sort().filter((name) => instance[name].constructor && instance[name]._type && (
            instance[name]._type == 'HubEvent' ||
            instance[name]._type == 'HubEventData' ||
            instance[name]._type == 'HubEventCredentials' ||
            instance[name]._type == 'HubEventCredentialsData'
        ));
    }
    //#endregion

    //#region [ message helpers ]
    private respondError(client: SocketIO.Socket, req: IHubRequest, error: IWSError) {
        client.emit(this.RESPONSE_EVENT, {
            method: req.method,
            service: req.service,
            eventName: req.eventName,
            isSuccess: false,
            error,
        } as IHubResponse);
        this.logger.error(JSON.stringify(error));
    }
    private respondSuccess(client: SocketIO.Socket, req: IHubRequest, data?: any) {
        client.emit(this.RESPONSE_EVENT, {
            method: req.method,
            service: req.service,
            eventName: req.eventName,
            isSuccess: true,
            data,
        } as IHubResponse);
        this.logger.log('success');
    }
    //#endregion

    //#region  [ private ]
    private async subscribe(client: SocketIO.Socket, req: IHubRequest) {
        if (!this._services.exists(req.service, req.eventName)) {
            this.respondError(
                client,
                req,
                {
                    code: WSErrorCode.ws_error,
                    message: `service '${req.service}' or event '${req.eventName} not found.`,
                },
            );
        } else {
            const descriptor = this._services.get(req.service, req.eventName);
            const code = await this.isValid(
                client,
                descriptor.instance,
                descriptor.options,
                req.credentials,
            );
            if (code != WSErrorCode.none) {
                this.respondError(
                    client,
                    req,
                    {
                        code,
                        message: `unauthorized`,
                    },
                );
            } else {
                const clients = descriptor.clients;
                if (!clients.find(x => x.socket.id == client.id)) {
                    clients.push({
                        socket: client,
                        credentials: req.credentials,
                    });
                }
                this.respondSuccess(client, req);
            }
        }
    }
    private unusbscribe(client: SocketIO.Socket, req: IHubRequest) {
        if (!this._services.exists(req.service, req.eventName)) {
            this.respondError(
                client,
                req,
                {
                    code: WSErrorCode.ws_error,
                    message: `service '${req.service}' or event '${req.eventName} not found.`,
                },
            );
        } else {
            const descriptor = this._services.get(req.service, req.eventName);
            const clients = descriptor.clients;
            const idx = clients.findIndex(x => x.socket.id == client.id);
            if (idx > -1) {
                clients.splice(idx, 1);
            }
            this.respondSuccess(client, req);
        }
    }
    private async publish(service: string, event: string, data: any, serverCredentials: any) {
        const descriptor = this._services.get(service, event);
        const selection = descriptor.options.selection;
        const clients = descriptor.clients;
        const selectedClients: SocketIO.Socket[] = [];

        for (const client of clients) {
            const user = (client as any).socket.user;
            const userCredentials = (client as any).credentials;

            if (!selection) {
                selectedClients.push(client.socket);
            } else {
                const isValid = await selection(descriptor.instance, user, userCredentials, serverCredentials);
                if (isValid) {
                    selectedClients.push(client.socket);
                }
            }
        }
        selectedClients.forEach(x => x.emit(this.PUBLISH_EVENT, {
            service,
            eventName: event,
            data,
        } as IHubMessage));
    }
    private removeClient(client: SocketIO.Socket) {
        this._services.list().forEach(descriptor => {
            const clients = descriptor.clients;
            const idx = clients.findIndex(x => x.socket.id == client.id);
            if (idx > -1) {
                descriptor.clients = clients.splice(idx, 1);
            }
        });
    }
    //#endregion
}
