import { Request } from 'express';
import { IResult } from 'ua-parser-js';

export interface IRequestApp extends Request {
    userAgent: IResult;
}
