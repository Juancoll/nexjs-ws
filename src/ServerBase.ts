import { Server } from 'socket.io';
import { IDecoratorOptionsBase } from './IDecoratorOptionsBase';
import { IParamDecorator, paramDecoratorKey } from './ParamDecorators';
import { IMethodMetadata } from './IMetadata';
import { Logger } from './Logger';

export abstract class ServerBase {

    //#region [ abstract ]
    protected abstract onInitialize(server: Server, jwtDecoder: (token: string) => any): void;
    public abstract register(instance: object): void;
    //#endregion

    //#region [ fields ]
    protected _server: Server;
    protected _logger: Logger;
    protected _jwtDecoder: (token: string) => any;
    //#endregion

    //#region [ properties ]
    public debug = true;
    //#endregion

    //#region [ constructor ]
    constructor() {
        this._logger = new Logger(this.constructor.name);
    }
    //#endregion

    //#region [ public ]
    /**
     * @param {Server} server - socket.io server object
     * @param {(token: string) => any} jwtDecoder - return user from jwt token
     */
    public initialize(server: Server, jwtDecoder: (token: string) => any) {
        this._server = server;
        this._jwtDecoder = jwtDecoder;
        this.log('initialize');
        this.onInitialize(server, jwtDecoder);
    }
    //#endregion

    //#region [ validation ]
    protected async isOptionsValid(client: SocketIO.Socket, options: IDecoratorOptionsBase, credentials: any): Promise<boolean> {
        if (options.isAuth) {
            if (!client.handshake.query.auth_token) { return false; }
            try {
                const user = await this._jwtDecoder(client.handshake.query.auth_token);
                (client as any).user = user;
            } catch (err) {
                this.error('isAuth: ' + err.message, err);
                return false;
            }
            if (options.roles) {
                const user = (client as any).user;
                const hasRole = (u: any) => {
                    return u.roles.some(userRole => {
                        return options.roles.indexOf(userRole) != -1;
                    });
                };
                if (!hasRole(user)) {
                    this.error('invalid user roles');
                    return false;
                }
            }
        }
        if (options.validation) {
            try {
                const isValid = await options.validation((client as any).user, credentials);
                if (!isValid) { return false; }
            } catch (err) {
                this.error('validation: ' + err.message, err);
                return false;
            }
        }
        return true;
    }
    //#endregion

    //#region [ reflection ]
    protected isPromise(value: any) {
        if (!value) { return false; }
        return typeof value.then == 'function';
    }
    protected getMethods(instance: object) {
        let props: string[] = [];
        let current = instance;
        do {
            props = props.concat(Object.getOwnPropertyNames(current));
            current = Object.getPrototypeOf(current);
        } while (current);

        return props.sort().filter((name, idx, arr) => name != arr[idx + 1] && typeof instance[name] == 'function');
    }
    protected getMethodsParamNames(fn) {
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
    protected hasParamDecorators(target: any, propertyName: string) {
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
    //#endregion

    //#region [ log ]
    protected log(msg: string, data?: any) {
        if (this.debug) {
            this._logger.log(msg);
            if (data) {
                console.log(data);
            }
        }
    }
    protected error(msg: string, data?: any) {
        if (this.debug) {
            this._logger.error(msg);
            if (data) {
                console.log(data);
            }
        }
    }
    //#endregion
}
