import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import compression from 'compression';

@Injectable()
export class AppCompressionMiddleware implements NestMiddleware {
    constructor() {}

    async use(
        _req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        compression();
        next();
    }
}
