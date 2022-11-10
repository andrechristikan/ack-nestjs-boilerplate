import { Request } from 'express';
import { IApiKeyPayload } from 'src/common/api-key/interfaces/api-key.interface';
import { IResult } from 'ua-parser-js';

export interface IRequestApp extends Request {
    id: string;
    timestamp: number;
    customLang: string[];
    apiKey?: IApiKeyPayload;
    version: string;
    repoVersion: string;
    userAgent: IResult;

    user?: Record<string, any>;
    __class?: string;
    __function?: string;
}
