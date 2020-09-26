import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';
import { BodyParserUrlencoded } from 'body-parser/body-parser.constant';

@Injectable()
export class BodyParserUrlencodedMiddleware implements NestMiddleware {
    private static urlencoded: Record<string, any>;

    static configure(urlencoded: Record<string, any>): void {
        BodyParserUrlencodedMiddleware.urlencoded = urlencoded;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        BodyParserUrlencodedMiddleware.configure(BodyParserUrlencoded);
        bodyParser.urlencoded(BodyParserUrlencodedMiddleware.urlencoded)(
            req,
            res,
            next,
        );
    }
}
