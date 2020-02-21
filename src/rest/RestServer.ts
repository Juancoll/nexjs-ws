import 'reflect-metadata';
import { Server } from 'socket.io';

import { ServerBase } from '../base/ServerBase';
import { IParamMetadata } from '../decorators/IParamMetadata';

import { RestDecoratorOptions, restDecoratorKey } from './decorators/RestDecorator';
import { IRestRequest } from './messages/IRestRequest';
import { IRestResponse } from './messages/IRestResponse';
import { RestServiceCollection } from './types/RestServiceCollection';
import { WSErrorCode } from '../base/WSErrorCode';
import { IWSError } from '../base/IWSError';

export class RestServer extends ServerBase {

    //#region [ constants ]
    private REQUEST_EVENT = '__rest::request__';
    private RESPONSE_EVENT = '__rest::response__';
    //#endregion

    //#region [ fields ]
    private _services = new RestServiceCollection();

    //#region [ ServerBase ]
    protected onInitialize(server: Server) {
        server.on('connection', client => {
            this.logger.log('on connection');
            client.on(this.REQUEST_EVENT, async (req: IRestRequest) => {
                this.logger.log('on request', req);
                if (!this._services.exists(req.service, req.method)) {
                    this.respondError(client, req, {
                        code: WSErrorCode.ws_error,
                        message: `service '${req.service}' or method '${req.method}' not found.`
                    });
                } else {
                    const descriptor = this._services.get(req);
                    const code = await this.isValid(
                        client,
                        descriptor.metadata.target,
                        descriptor.options,
                        req.credentials,
                    );
                    if (code != WSErrorCode.none) {
                        this.respondError(client, req, {
                            code,
                            message: `unauthorized`,
                        });
                    } else {
                        try {
                            const target = descriptor.metadata.target as any;
                            const method = target[req.method];
                            const params = descriptor.metadata.params;
                            const args = this.injectParams(client, req, params);

                            let result: any = method.call(target, ...args);
                            if (this.isPromise(result)) {
                                result = await result;
                            }
                            this.respondSuccess(client, req, result);
                        } catch (err) {
                            this.respondError(client, req, {
                                code: WSErrorCode.server_error,
                                message: err.message,
                            });
                        }
                    }
                }
            });
        });
    }

    register(instance: any) {
        this.logger.log(`register class ${instance.constructor.name}`);
        this.getMethods(instance).forEach(propertyKey => {
            const options: RestDecoratorOptions = Reflect.getMetadata(restDecoratorKey, instance, propertyKey);
            if (options) {

                const service = options.service
                    ? options.service
                    : this.extractServiceNameFromInstance(instance);

                const method = propertyKey;
                const metadata = this.getMethodMetadata(instance, method);

                if (this._services.exists(service, method)) {
                    throw new Error(`rest '${service}.${method}' already registered.`);
                }

                this._services.add({ service, method, options, metadata });
            }
        });
    }
    registerMany(instances: any[]) {
        instances.forEach(instance => this.register(instance));
    }
    //#endregion

    //#region [ message helpers ]
    private respondError(client: SocketIO.Socket, request: IRestRequest, error: IWSError) {
        client.emit(this.RESPONSE_EVENT, {
            service: request.service,
            method: request.method,
            isSuccess: false,
            error,
        } as IRestResponse);
        this.logger.error(JSON.stringify(error));
    }
    private respondSuccess(client: SocketIO.Socket, request: IRestRequest, data: any) {
        client.emit(this.RESPONSE_EVENT, {
            service: request.service,
            method: request.method,
            isSuccess: true,
            data,
        } as IRestResponse);
        this.logger.log('success', data);
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
