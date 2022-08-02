import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
    RATE_LIMIT_MAX_REQUEST_PER_IP,
    RATE_LIMIT_RESET_TIME,
} from './constants/rate-limit.constant';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const resetTime = this.configService.get<number>(
            'middleware.rateLimit.resetTime'
        );
        const maxRequestPerId = this.configService.get<number>(
            'middleware.rateLimit.maxRequestPerId'
        );

        rateLimit({
            windowMs: resetTime || RATE_LIMIT_RESET_TIME,
            max: maxRequestPerId || RATE_LIMIT_MAX_REQUEST_PER_IP,
        })(req, res, next);
    }
}
