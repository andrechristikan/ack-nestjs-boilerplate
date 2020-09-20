import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';
import {
    BodyParserJson,
} from 'common/body-parser/body-parser.constant';

@Injectable()
export class BodyParserJsonMiddleware implements NestMiddleware {
    private static json: Record<string, any>;

    static configure(
        json: Record<string, any>,
    ): void {
        BodyParserJsonMiddleware.json = json;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        BodyParserJsonMiddleware.configure(BodyParserJson);
        bodyParser.json(BodyParserJsonMiddleware.json)(
            req,
            res,
            next,
        );
    }
}
