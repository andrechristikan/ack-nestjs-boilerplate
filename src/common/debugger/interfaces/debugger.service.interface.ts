import { IDebuggerLog } from 'src/common/debugger/interfaces/debugger.interface';

export interface IDebuggerService {
    info(requestId: string, log: IDebuggerLog, data?: any): void;
    debug(requestId: string, log: IDebuggerLog, data?: any): void;
    warn(requestId: string, log: IDebuggerLog, data?: any): void;
    error(requestId: string, log: IDebuggerLog, data?: any): void;
}
