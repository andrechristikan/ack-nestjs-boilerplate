import { Injectable, NestMiddleware } from '@nestjs/common';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { createStream } from 'rotating-file-stream';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import {
    ICustomResponse,
    IHttpDebuggerConfig,
    IHttpDebuggerConfigOptions,
} from './http-debugger.interface';
import {
    DEBUGGER_HTTP_FORMAT,
    DEBUGGER_HTTP_NAME,
} from './http-debugger.constant';

@Injectable()
export class HttpDebuggerMiddleware implements NestMiddleware {
    private readonly maxSize: string;
    private readonly maxFiles: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
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
        const date: string = this.helperDateService.toString(
            this.helperDateService.create()
        );
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
        const config: IHttpDebuggerConfig = this.httpLogger();
        this.customToken();
        morgan(config.debuggerHttpFormat, config.HttpDebuggerOptions)(
            req,
            res,
            next
        );
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
