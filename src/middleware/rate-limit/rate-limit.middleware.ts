import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { MAX_REQUEST_PER_IP, RESET_TIME } from './rate-limit.constant';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        rateLimit({
            windowMs: RESET_TIME,
            max: MAX_REQUEST_PER_IP
        })(req, res, next);
    }
}
