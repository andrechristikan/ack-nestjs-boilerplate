export interface IDebuggerService {
    info(log: any): void;
    debug(log: any): void;
    warn(log: any): void;
    error(log: any): void;
}
