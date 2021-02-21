import { RotatingFileStream } from 'rotating-file-stream';
import { Response } from 'express';

export interface IHttpLoggerConfigOptions {
    readonly stream: RotatingFileStream;
}

export interface IHttpLoggerConfig {
    readonly HttpLoggerFormat: string;
    readonly HttpLoggerOptions: IHttpLoggerConfigOptions;
}

export interface ICustomResponse extends Response {
    body: string;
}
