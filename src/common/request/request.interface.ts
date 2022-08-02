import { Request } from 'express';
import { IResult } from 'ua-parser-js';
import { IAuthApiPayload } from '../auth/auth.interface';

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
