import 'reflect-metadata';
import { Server } from 'socket.io';

import { RestDecoratorOptions, restDecoratorKey } from './RestDecorator';
import { ServerBase } from '../ServerBase';
import { IDecoratorOptionsBase } from '../IDecoratorOptionsBase';
import { IMethodMetadata, IParamMetadata } from '../IMetadata';

interface IRestMessage {
    service: string;
    method: string;
    data?: any;
}

interface IRestRequest extends IRestMessage {
    credentials: any;
}

interface IRestResponse extends IRestMessage {
    isSuccess: boolean;
    error?: string;
}

interface IRestMethodDescription {
    metadata: IMethodMetadata;
    options: IDecoratorOptionsBase;
}

export class RestServer extends ServerBase {
    //#region [ fields ]
    private requestEvent = '__rest::request__';
    private requestResponse = '__rest::response__';

    private _services: {
        [service: string]: {
            [method: string]: IRestMethodDescription,
        },
    } = {};

    //#region [ ServerBase ]
    protected onInitialize(server: Server, jwtDecoder: (token: string) => any) {
        server.on('connection', client => {
            this.log('on connection');
            client.on(this.requestEvent, async (request: IRestRequest) => {
                this.log('on request', request);
                if (!this._services[request.service]) {
                    this.respondError(client, request, `service '${request.service}' not found.`);
                } else if (!this._services[request.service][request.method]) {
                    this.respondError(client, request, `service '${request.service}' not contains method '${request.method}'.`);
                } else if (!this.isDataValid(request, this._services[request.service][request.method].metadata.params)) {
                    this.respondError(client, request, `invalid data`);
                } else {
                    const isValid = await this.isOptionsValid(client, this._services[request.service][request.method].options, request.credentials);
                    if (!isValid) {
                        this.respondError(client, request, `unauthorized`);
                    } else {
                        try {

                            const target = this._services[request.service][request.method].metadata.target;
                            const method = target[request.method];
                            const params = this._services[request.service][request.method].metadata.params;
                            const args = this.injectParams(client, request, params);

                            let result: any = method.call(target, ...args);
                            if (this.isPromise(result)) {
                                result = await result;
                            }
                            this.respondSuccess(client, request, result);
                        } catch (err) {
                            this.respondError(client, request, err.message);
                        }
                    }
                }
            });
        });
    }

    register(instance: object) {
        this.log(`register class ${instance.constructor.name}`);
        this.getMethods(instance).forEach(propertyKey => {
            const metadata: RestDecoratorOptions = Reflect.getMetadata(restDecoratorKey, instance, propertyKey);
            if (metadata) {
                const service = metadata.service;
                const method = propertyKey;
                const methodMetadata = this.getMethodMetadata(instance, method);

                if (!this._services[service]) {
                    this._services[service] = {};
                }
                if (this._services[service][method]) {
                    throw new Error(`service '${service}' already contains method '${method}'`);
                }
                this._services[service][method] = {
                    options: metadata,
                    metadata: methodMetadata,
                };
            }
        });
    }
    //#endregion

    //#region [ message helpers ]
    private respondError(client: SocketIO.Socket, request: IRestRequest, message: string) {
        client.emit(this.requestResponse, {
            service: request.service,
            method: request.method,
            isSuccess: false,
            error: message,
        } as IRestResponse);
        this.error(message);
    }
    private respondSuccess(client: SocketIO.Socket, request: IRestRequest, data: any) {
        client.emit(this.requestResponse, {
            service: request.service,
            method: request.method,
            isSuccess: true,
            data,
        } as IRestResponse);
        this.log('success', data);
    }
    //#endregion

    //#region [ validations ]
    private isDataValid(data: any, params: IParamMetadata[]): boolean {
        return true;
    }
    //#endregion

    //#region [ reflection ]
    protected injectParams(client: SocketIO.Socket, request: IRestRequest, params: IParamMetadata[]): any[] {
        const args = new Array<any>();
        params.forEach(param => {
            if (!param.inject) {
                args.push(undefined);
            } else {
                switch (param.inject.type) {
                    case 'context':
                        if (!param.inject.name) {
                            args.push(client);
                        } else {
                            switch (param.inject.name) {
                                case 'user': args.push((client as any).user); break;
                                case 'token': args.push(client.handshake.query.auth_token); break;
                                case 'address': args.push(client.handshake.address); break;
                                case 'url': args.push(client.handshake.url); break;
                                case 'origin': args.push(client.handshake.headers.origin); break;
                                case 'credentials': args.push(request.credentials); break;
                                default: throw new Error(`Decorator @Context('${param.inject.name}') not implemented`);
                            }
                        }
                        break;

                    case 'data':
                        if (!param.inject.name) {
                            args.push(request.data);
                        } else {
                            args.push(request.data ? request.data[param.inject.name] : undefined);
                        }
                        break;

                    default:
                        throw new Error(`Decorator @${param.inject.type} not implemented`);
                }
            }
        });
        return args;
    }
    //#endregion
}
