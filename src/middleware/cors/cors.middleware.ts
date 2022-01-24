import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
    DEFAULT_HEADER_CORS,
    DEFAULT_METHOD_CORS,
    DEFAULT_ORIGIN_CORS,
} from './cors.constant';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const allowOrigin = this.configService.get<string | boolean | string[]>(
            'middleware.cors.allowOrigin'
        );
        const allowMethod = this.configService.get<string[]>(
            'middleware.cors.allowMethod'
        );
        const allowHeader = this.configService.get<string[]>(
            'middleware.cors.allowHeader'
        );

        cors(
            typeof allowOrigin === 'string' || typeof allowOrigin === 'boolean'
                ? {
                      origin: allowOrigin || DEFAULT_ORIGIN_CORS,
                      methods: allowMethod || DEFAULT_METHOD_CORS,
                      allowedHeaders: allowHeader || DEFAULT_HEADER_CORS,
                      credentials: true,
                  }
                : function (request: Request, callback) {
                      const whitelist = allowOrigin as string[];
                      const corsOptions = { origin: false };
                      if (whitelist.indexOf(request.headers['origin']) !== -1) {
                          corsOptions.origin = true;
                      }

                      callback(null, corsOptions);
                  }
        )(req, res, next);
    }
}
