import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as cookieParser from 'cookie-parser';

@Injectable()
export class CookieParserMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        cookieParser()(
            req,
            res,
            next
        );
    }
}
