import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { BodyParserJson } from 'src/middleware/body-parser/body-parser.constant';

@Injectable()
export class BodyParserJsonMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.json(BodyParserJson)(req, res, next);
    }
}
