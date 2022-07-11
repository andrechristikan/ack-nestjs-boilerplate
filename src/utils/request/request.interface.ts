import { Request } from 'express';
import { IAuthApiPayload } from 'src/auth/auth.interface';
import { IResult } from 'ua-parser-js';

export interface IRequestApp extends Request {
    userAgent?: IResult;
    id?: string;
    timezone: string;
    timestamp: string;
    customLang: string;
    apiKey?: IAuthApiPayload;
    user?: Record<string, any>;
    version?: string;
    __class: string;
    __function: string;
}
