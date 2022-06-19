import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from 'src/cache/service/cache.service';
import { v4 } from 'uuid';

@Injectable()
export class RequestMiddleware implements NestMiddleware {
    constructor(private readonly cacheService: CacheService) {}

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        const uuid: string = v4();
        req.headers['x-request-id'] = uuid;
        await this.cacheService.set(`x-request-id`, uuid);
        next();
    }
}
