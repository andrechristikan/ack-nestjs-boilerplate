import { RotatingFileStream } from 'rotating-file-stream';

export interface IHttpLoggerConfigOptions {
    readonly stream: RotatingFileStream;
}

export interface IHttpLoggerConfig {
    readonly HttpLoggerFormat: string;
    readonly HttpLoggerOptions: IHttpLoggerConfigOptions;
}
