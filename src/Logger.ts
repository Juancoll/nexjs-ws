export class Logger {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    log(value: string) {
        console.log(`[${this.name}] ${value}`);
    }
    warn(value: string) {
        console.warn(`[${this.name}] ${value}`);
    }
    error(value: string) {
        console.error(`[${this.name}] ${value}`);
    }
}
