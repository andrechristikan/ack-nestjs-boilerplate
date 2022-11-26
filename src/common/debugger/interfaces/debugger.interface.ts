import { RotatingFileStream } from 'rotating-file-stream';

export interface IDebuggerLog {
    description: string;
    class?: string;
    function?: string;
    path?: string;
}

export interface IDebuggerHttpConfigOptions {
    readonly stream: RotatingFileStream;
}

export interface IDebuggerHttpConfig {
    readonly debuggerHttpFormat: string;
    readonly debuggerHttpOptions?: IDebuggerHttpConfigOptions;
}
