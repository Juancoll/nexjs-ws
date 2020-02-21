export class Logger {
    public readonly name: string;
    public debug: boolean = false;

    constructor(name: string) {
        this.name = name;
    }

    log(value: string, data?: any): void {
        if (this.debug) {
            if (data) {
                console.log(`[${this.name}] ${value}`, data);
            } else {
                console.log(`[${this.name}] ${value}`);
            }
        }
    }
    warn(value: string, data?: any): void {
        if (this.debug) {
            if (data) {
                console.log(`[${this.name}] ${value}`, data);
            } else {
                console.log(`[${this.name}] ${value}`);
            }
        }
    }
    error(value: string, data?: any): void {
        if (this.debug) {
            if (data) {
                console.log(`[${this.name}] ${value}`, data);
            } else {
                console.log(`[${this.name}] ${value}`);
            }
        }
    }
}
