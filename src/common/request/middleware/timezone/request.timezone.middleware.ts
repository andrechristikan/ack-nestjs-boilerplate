import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class RequestTimezoneMiddleware implements NestMiddleware {
    async use(
        req: IRequestApp,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        req.__timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        next();
    }
}
