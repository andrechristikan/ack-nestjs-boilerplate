import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { UAParser, IResult } from 'ua-parser-js';

@Injectable()
export class RequestUserAgentMiddleware implements NestMiddleware {
    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const parserUserAgent = new UAParser(req['User-Agent']);
        const userAgent: IResult = parserUserAgent.getResult();

        req.__userAgent = userAgent;
        next();
    }
}
