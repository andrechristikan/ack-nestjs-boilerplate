import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

@Injectable()
export class AppHelmetMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        helmet()(req, res, next);
    }
}
