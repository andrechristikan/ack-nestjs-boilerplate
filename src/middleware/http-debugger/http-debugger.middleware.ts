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
    private readonly debug: boolean;
    private readonly logger: boolean;
    private readonly maxSize: string;
    private readonly maxFiles: number;

    constructor(private readonly configService: ConfigService) {
        this.debug = this.configService.get<boolean>('app.debug');
        this.logger = this.configService.get<boolean>(
            'app.debugger.http.active'
        );
        this.maxSize = this.configService.get<string>(
            'app.debugger.http.maxSize'
        );
        this.maxFiles = this.configService.get<number>(
            'app.debugger.http.maxFiles'
        );
    }

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
                maxSize: this.maxSize,
                maxFiles: this.maxFiles,
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
        if (this.debug || (this.debug && this.logger)) {
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
    private readonly debug: boolean;
    private readonly logger: boolean;

    constructor(private readonly configService: ConfigService) {
        this.debug = this.configService.get<boolean>('app.debug');
        this.logger = this.configService.get<boolean>(
            'app.debugger.http.active'
        );
    }

    use(req: Request, res: Response, next: NextFunction): void {
        if (this.debug || this.logger) {
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
        }

        next();
    }
}
