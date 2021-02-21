import { RotatingFileStream } from 'rotating-file-stream';
import { Response } from 'express';

export interface IHttpLoggerConfigOptions {
    readonly stream: RotatingFileStream;
}

export interface IHttpLoggerConfig {
    readonly LOGGER_HTTP_FORMAT: string;
    readonly HttpLoggerOptions: IHttpLoggerConfigOptions;
}

export interface ICustomResponse extends Response {
    body: string;
}
