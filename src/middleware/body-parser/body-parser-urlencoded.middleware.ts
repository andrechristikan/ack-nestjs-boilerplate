import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { BodyParserUrlencoded } from 'src/middleware/body-parser/body-parser.constant';

@Injectable()
export class BodyParserUrlencodedMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        bodyParser.urlencoded(BodyParserUrlencoded)(req, res, next);
    }
}
