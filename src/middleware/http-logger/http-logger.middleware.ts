import { Injectable, NestMiddleware } from '@nestjs/common';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { createStream } from 'rotating-file-stream';
import moment from 'moment';
import {
    HttpLoggerFormat,
    HttpLoggerSize,
    HttpLoggerMaxSize,
    HttpLoggerName
} from 'src/middleware/http-logger/http-logger.constant';
import {
    IHttpLoggerConfig,
    IHttpLoggerConfigOptions
} from 'src/middleware/http-logger/http-logger.interface';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
    private customToken(): void {
        morgan.token('req-params', (req: Request) => {
            return JSON.stringify(req.params);
        });

        morgan.token('req-body', (req: Request) => {
            return JSON.stringify(req.body);
        });

        morgan.token('res-body', (req: Request, res: any) => {
            return res.body;
        });

        morgan.token('req-headers', (req: Request) => {
            return JSON.stringify(req.headers);
        });
    }

    private httpLogger(): IHttpLoggerConfig {
        const date: string = moment().format('YYYY-MM-DD');
        const HttpLoggerOptions: IHttpLoggerConfigOptions = {
            stream: createStream(`${date}.log`, {
                path: `./logs/${HttpLoggerName}/`,
                size: HttpLoggerSize,
                maxSize: HttpLoggerMaxSize,
                compress: true,
                interval: '1d'
            })
        };

        return {
            HttpLoggerFormat,
            HttpLoggerOptions
        };
    }

    use(req: Request, res: Response, next: NextFunction): void {
        const config: IHttpLoggerConfig = this.httpLogger();
        this.customToken();

        morgan(config.HttpLoggerFormat, config.HttpLoggerOptions)(
            req,
            res,
            next
        );
    }
}
