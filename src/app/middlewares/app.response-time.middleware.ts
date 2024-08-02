import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import responseTime from 'response-time';

@Injectable()
export class AppResponseTimeMiddleware implements NestMiddleware {
    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        responseTime()(req, res, next);
    }
}
