import { IHubEventDescriptor } from './IHubEventDescriptor';

export class HubServiceCollection {

    private _services: IHubEventDescriptor[] = [];

    exists(service: string, event: string): boolean {
        const item = this._services.find(x => x.service == service && x.event == event);
        return item ? true : false;
    }
    get(service: string, event: string): IHubEventDescriptor {
        if (!this.exists(service, event)) {
            throw new Error('Service or event not found.');
        }
        return this._services.find(x => x.service == service && x.event == event);
    }
    add(descriptor: IHubEventDescriptor) {
        const service = this._services.find(x => x.service == descriptor.service && x.event == descriptor.event);
        if (service) {
            throw new Error(`Service = '${descriptor.service}' and event = '${descriptor.event}' already exists`);
        }
        this._services.push(descriptor);
    }
    list(): IHubEventDescriptor[] {
        return this._services;
    }
}
