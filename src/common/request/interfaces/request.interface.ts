import { Request } from 'express';
import { IAuthApiPayload } from 'src/common/auth/interfaces/auth.interface';
import { IResult } from 'ua-parser-js';

export interface IRequestApp extends Request {
    id?: string;
    timestamp: number;
    customLang: string[];
    apiKey?: IAuthApiPayload;
    version: string;
    repoVersion: string;
    userAgent?: IResult;

    user?: Record<string, any>;
    __class: string;
    __function: string;
}
