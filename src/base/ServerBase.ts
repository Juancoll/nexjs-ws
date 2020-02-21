import { Server } from 'socket.io';
import { IDecoratorOptionsBase } from './IDecoratorOptionsBase';
import { paramDecoratorKey } from '../rest/decorators/ParamDecorators';
import { Logger } from '../types/Logger';
import { IParamDecorator } from '../decorators/IParamDecorator';
import { IMethodMetadata } from '../decorators/IMethodMetadata';
import { IWSError } from './IWSError';
import { WSErrorCode } from './WSErrorCode';

export abstract class ServerBase {

    //#region [ abstract ]
    protected abstract onInitialize(server: Server): void;
    public abstract register(instance: any): void;
    public abstract registerMany(instances: any[]): void;
    //#endregion

    //#region [ fields ]
    protected _server: Server;
    protected _jwtDecoder: (token: string) => any;
    //#endregion

    //#region [ properties ]
    public logger: Logger;
    //#endregion

    //#region [ constructor ]
    constructor() {
        this.logger = new Logger(this.constructor.name);
    }
    //#endregion

    //#region [ public ]
    /**
     * @param {Server} server - socket.io server object
     * @param {(token: string) => any} jwtDecoder - return user from jwt token
     */
    public initialize(server: Server, jwtDecoder: (token: string) => any) {
        this.logger.log('initialize');

        this._server = server;
        this._jwtDecoder = jwtDecoder;

        this.onInitialize(server);
    }
    //#endregion

    //#region [ validation ]
    protected async isValid(
        client: SocketIO.Socket,
        instance: any,
        options: IDecoratorOptionsBase,
        credentials: any,
    ): Promise<WSErrorCode> {
        if (options.isAuth) {
            if (!client.handshake.query.auth_token) { return WSErrorCode.auth_required; }
            try {
                const user = await this._jwtDecoder(client.handshake.query.auth_token);
                (client as any).user = user;
            } catch (err) {
                this.logger.error('isAuth: ' + err.message, err);
                return WSErrorCode.auth_token_error;
            }
            if (options.roles) {
                const user = (client as any).user;
                if (!user.roles) { return WSErrorCode.auth_invalid_role; }
                if (!Array.isArray(user.roles)) { return WSErrorCode.auth_invalid_role; }
                if (!user.roles.some((role: string) => options.roles.indexOf(role) != -1)) {
                    this.logger.error('invalid user roles');
                    return WSErrorCode.auth_invalid_role;
                }
            }
        }
        if (options.validation) {
            try {
                const isValid = await options.validation(instance, (client as any).user, credentials);
                if (!isValid) { return WSErrorCode.auth_credentials_error; }
            } catch (err) {
                this.logger.error('validation: ' + err.message, err);
                return WSErrorCode.auth_credentials_error;
            }
        }
        return WSErrorCode.none;
    }
    //#endregion

    //#region [ reflection ]
    protected isPromise(value: any): boolean {
        if (!value) { return false; }
        return typeof value.then == 'function';
    }
    protected getMethods(instance: any): string[] {
        let props: string[] = [];
        let current = instance;
        do {
            props = props.concat(Object.getOwnPropertyNames(current));
            current = Object.getPrototypeOf(current);
        } while (current);

        return props.sort().filter((name, idx, arr) => name != arr[idx + 1] && typeof instance[name] == 'function');
    }
    protected getMethodsParamNames(fn: any): string[] {
        const COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        const DEFAULT_PARAMS = /=[^,]+/mg;
        const FAT_ARROWS = /=>.*$/mg;

        const code = fn.toString()
            .replace(COMMENTS, '')
            .replace(FAT_ARROWS, '')
            .replace(DEFAULT_PARAMS, '');

        const result = code.slice(code.indexOf('(') + 1, code.indexOf(')'))
            .match(/([^\s,]+)/g);

        return result === null
            ? []
            : result;
    }
    protected hasParamDecorators(target: any, propertyName: string): boolean {
        const metadata = Reflect.getMetadata(paramDecoratorKey, target, propertyName);
        return metadata ? true : false;
    }
    protected getParamDecorators(target: any, propertyName: string): IParamDecorator[] {
        const metadata = Reflect.getMetadata(paramDecoratorKey, target, propertyName);
        return metadata || [];
    }
    protected getMethodMetadata(target: any, propertyName: string): IMethodMetadata {
        const paramTypes: any[] = Reflect.getMetadata('design:paramtypes', target, propertyName);
        const returnType: any = Reflect.getMetadata('design:returntype', target, propertyName);
        const paramNames: string[] = this.getMethodsParamNames(target[propertyName]);
        const paramDecorators: IParamDecorator[] = this.getParamDecorators(target, propertyName);

        return {
            target,
            returnType,
            params: paramTypes.map((type, idx) => ({
                name: paramNames[idx],
                type,
                inject: paramDecorators.find(x => x.idx == idx),
            })),
        };

    }
    protected extractServiceNameFromInstance(instance: any): string {
        if (!instance.service) {
            throw new Error('object doesn\'t contains service:strin property. define service in decorator.');
        }
        if (typeof instance.service != 'string') {
            throw new Error('service property must be string');
        }
        return instance.service;
    }
    //#endregion
}
