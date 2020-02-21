import { IRestRequest } from '../messages/IRestRequest';
import { IRestMethodDescriptor } from './IRestMethodDescriptor';

export class RestServiceCollection {

    private services: IRestMethodDescriptor[] = [];

    exists(service: string, method: string): boolean {
        const item = this.services.find(x => x.service == service && x.method == method);
        return item ? true : false;
    }
    get(req: IRestRequest): IRestMethodDescriptor {
        if (!this.exists(req.service, req.method)) {
            throw new Error('Service or method not found.');
        }
        return this.services.find(x => x.service == req.service && x.method == req.method);
    }
    add(descriptor: IRestMethodDescriptor) {
        const service = this.services.find(x => x.service == descriptor.service && x.method == descriptor.method);
        if (service) {
            throw new Error(`Service = '${descriptor.service}' and method = '${descriptor.method}' already exists`);
        }
        this.services.push(descriptor);
    }
}
