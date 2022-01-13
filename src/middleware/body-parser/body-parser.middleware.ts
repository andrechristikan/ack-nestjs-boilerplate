import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';

@Injectable()
export class BodyParserMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.json()(req, res, next);
        bodyParser.urlencoded({ extended: true })(req, res, next);
    }
}
