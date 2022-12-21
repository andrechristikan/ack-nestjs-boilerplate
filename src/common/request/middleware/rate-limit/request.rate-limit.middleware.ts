import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

@Injectable()
export class RequestRateLimitMiddleware implements NestMiddleware {
    private readonly resetTime: number;
    private readonly maxRequestPerIp: number;

    constructor(private readonly configService: ConfigService) {
        this.resetTime = this.configService.get<number>(
            'request.rateLimit.resetTime'
        );
        this.maxRequestPerIp = this.configService.get<number>(
            'request.rateLimit.maxRequestPerIp'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        rateLimit({
            windowMs: this.resetTime,
            max: this.maxRequestPerIp,
        })(req, res, next);
    }
}
