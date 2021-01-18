import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as csurf  from 'csurf';

@Injectable()
export class CsurfMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        csurf()(
            req,
            res,
            next
        );
    }
}
