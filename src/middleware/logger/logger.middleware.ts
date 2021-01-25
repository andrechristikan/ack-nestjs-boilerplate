import { Injectable, NestMiddleware } from '@nestjs/common';
import * as morgan from 'morgan';
import { IncomingMessage, ServerResponse } from 'http';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from 'logger/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private static options: Record<string, any>;
    private static format: string | morgan.FormatFn;

    static configure(
        format: string | morgan.FormatFn,
        opts?: Record<string, any>
    ): void {
        LoggerMiddleware.token('req-params', (req: Request) => {
            return JSON.stringify(req.params);
        });

        LoggerMiddleware.token('req-body', (req: Request) => {
            return JSON.stringify(req.body);
        });

        LoggerMiddleware.token('res-body', (req: Request, res: any) => {
            return res.body;
        });

        morgan.token('req-headers', (req: Request) => {
            return JSON.stringify(req.headers);
        });

        LoggerMiddleware.format = format;
        LoggerMiddleware.options = opts;
    }

    static token(
        name: string,
        callback: (req: Request, res?: Response) => string | undefined
    ): morgan.Morgan<IncomingMessage, ServerResponse> {
        return morgan.token(name, callback);
    }

    use(req: Request, res: Response, next: NextFunction): void {
        LoggerMiddleware.configure(
            LoggerService.httpLogger().HttpLoggerFormat,
            LoggerService.httpLogger().HttpLoggerOptions
        );

        morgan(LoggerMiddleware.format as any, LoggerMiddleware.options)(
            req,
            res,
            next
        );
    }
}
