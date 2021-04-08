import { Injectable, NestMiddleware } from '@nestjs/common';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { createStream } from 'rotating-file-stream';
import moment from 'moment';
import {
    LOGGER_HTTP_FORMAT,
    LOGGER_HTTP_SIZE,
    LOGGER_HTTP_MAX_SIZE,
    LOGGER_HTTP_NAME,
    LOGGER_HTTP_ENV
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
        morgan.token('req-params', (req: Request) =>
            JSON.stringify(req.params)
        );

        morgan.token('req-body', (req: Request) => JSON.stringify(req.body));

        morgan.token(
            'res-body',
            (req: Request, res: ICustomResponse) => res.body
        );

        morgan.token('req-headers', (req: Request) =>
            JSON.stringify(req.headers)
        );
    }

    private httpLogger(): IHttpLoggerConfig {
        const date: string = moment().format('YYYY-MM-DD');
        const HttpLoggerOptions: IHttpLoggerConfigOptions = {
            stream: createStream(`${date}.log`, {
                path: `./logs/${LOGGER_HTTP_NAME}/`,
                size: LOGGER_HTTP_SIZE,
                maxSize: LOGGER_HTTP_MAX_SIZE,
                compress: true,
                interval: '1d'
            })
        };

        return {
            LOGGER_HTTP_FORMAT,
            HttpLoggerOptions
        };
    }

    use(req: Request, res: Response, next: NextFunction): void {
        // Env Variable
        const loggerHttpEnv: boolean =
            this.configService.get('app.logger.http') || LOGGER_HTTP_ENV;

        if (loggerHttpEnv) {
            const config: IHttpLoggerConfig = this.httpLogger();
            this.customToken();
            morgan(config.LOGGER_HTTP_FORMAT, config.HttpLoggerOptions)(
                req,
                res,
                next
            );
        } else {
            next();
        }
    }
}

@Injectable()
export class HttpLoggerResponseMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const send: any = res.send;
        const resOld: any = res;

        // Add response data to response
        resOld.send = (body: any) => {
            resOld.body = body;
            resOld.send = send;
            resOld.send(body);
            res = resOld as Response;
        };

        next();
    }
}
