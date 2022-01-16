import { Injectable, NestMiddleware } from '@nestjs/common';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { createStream } from 'rotating-file-stream';
import moment from 'moment';
import {
    DEBUGGER_HTTP_FORMAT,
    DEBUGGER_HTTP_NAME,
} from 'src/middleware/http-debugger/http-debugger.constant';
import {
    ICustomResponse,
    IHttpDebuggerConfig,
    IHttpDebuggerConfigOptions,
} from 'src/middleware/http-debugger/http-debugger.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HttpDebuggerMiddleware implements NestMiddleware {
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

    private httpLogger(): IHttpDebuggerConfig {
        const date: string = moment().format('YYYY-MM-DD');
        const HttpDebuggerOptions: IHttpDebuggerConfigOptions = {
            stream: createStream(`${date}.log`, {
                path: `./logs/${DEBUGGER_HTTP_NAME}/`,
                maxSize: this.configService.get<string>(
                    'app.debugger.http.maxSize'
                ),
                maxFiles: this.configService.get<number>(
                    'app.debugger.http.maxFiles'
                ),
                compress: true,
                interval: '1d',
            }),
        };

        return {
            debuggerHttpFormat: DEBUGGER_HTTP_FORMAT,
            HttpDebuggerOptions,
        };
    }

    use(req: Request, res: Response, next: NextFunction): void {
        if (
            this.configService.get<boolean>('app.debug') &&
            this.configService.get<boolean>('app.debugger.http.active')
        ) {
            const config: IHttpDebuggerConfig = this.httpLogger();
            this.customToken();
            morgan(config.debuggerHttpFormat, config.HttpDebuggerOptions)(
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
export class HttpDebuggerResponseMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const send: any = res.send;
        const resOld: any = res;

        // Add response data to response
        // this is for morgan
        resOld.send = (body: any) => {
            resOld.body = body;
            resOld.send = send;
            resOld.send(body);
            res = resOld as Response;
        };

        next();
    }
}
