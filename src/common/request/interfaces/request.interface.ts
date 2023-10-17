import { Request } from 'express';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import { AuthAccessPayloadSerialization } from 'src/common/auth/serializations/auth.access-payload.serialization';
import { RequestPaginationSerialization } from 'src/common/request/serializations/request.pagination.serialization';
import { IResult } from 'ua-parser-js';

export interface IRequestApp<T = AuthAccessPayloadSerialization>
    extends Request {
    apiKey?: IApiKeyPayload;
    user?: T;

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

    __pagination?: RequestPaginationSerialization;
}
