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
    ICustomResponse,
    IHttpLoggerConfig,
    IHttpLoggerConfigOptions
} from 'src/middleware/http-logger/http-logger.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    private customToken(): void {
        morgan.token('req-params', (req: Request) => {
            return JSON.stringify(req.params);
        });

        morgan.token('req-body', (req: Request) => {
            return JSON.stringify(req.body);
        });

        morgan.token('res-body', (req: Request, res: ICustomResponse) => {
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
        if (this.configService.get('app.logger.http')) {
            const config: IHttpLoggerConfig = this.httpLogger();
            this.customToken();
            morgan(config.HttpLoggerFormat, config.HttpLoggerOptions)(
                req,
                res,
                next
            );
        } else {
            next();
        }
    }
}
