import { Request } from 'express';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import { RequestPaginationSerialization } from 'src/common/request/serializations/request.pagination.serialization';
import { IResult } from 'ua-parser-js';

export interface IRequestApp extends Request {
    apiKey?: IApiKeyPayload;
    user?: Record<string, any>;

    __id: string;
    __xTimestamp?: number;
    __timestamp: number;
    __timezone: string;
    __customLang: string[];
    __xCustomLang: string;
    __version: string;
    __repoVersion: string;
    __userAgent: IResult;

    __class?: string;
    __function?: string;

    __filters?: Record<
        string,
        string | number | boolean | Array<string | number | boolean>
    >;
    __pagination?: RequestPaginationSerialization;
}
