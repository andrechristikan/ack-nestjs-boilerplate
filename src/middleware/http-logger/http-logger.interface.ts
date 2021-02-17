import { RotatingFileStream } from 'rotating-file-stream';

export interface IHttpLoggerConfigOptions {
    stream: RotatingFileStream;
}

export interface IHttpLoggerConfig {
    HttpLoggerFormat: string;
    HttpLoggerOptions: IHttpLoggerConfigOptions;
}
