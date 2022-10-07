import { Injectable, NestMiddleware } from '@nestjs/common';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { createStream } from 'rotating-file-stream';
import { ConfigService } from '@nestjs/config';
import {
    ICustomResponse,
    IHttpDebuggerConfig,
    IHttpDebuggerConfigOptions,
} from './http-debugger.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import {
    DEBUGGER_HTTP_FORMAT,
    DEBUGGER_HTTP_NAME,
} from './constants/http-debugger.constant';

@Injectable()
export class HttpDebuggerMiddleware implements NestMiddleware {
    private readonly writeIntoFile: boolean;
    private readonly writeIntoConsole: boolean;

    constructor(private readonly configService: ConfigService) {
        this.writeIntoFile = this.configService.get<boolean>(
            'debugger.http.writeIntoFile'
        );
        this.writeIntoConsole = this.configService.get<boolean>(
            'debugger.http.writeIntoConsole'
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

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (this.writeIntoConsole || this.writeIntoFile) {
            this.customToken();
        }

        next();
    }
}

@Injectable()
export class HttpDebuggerWriteIntoFileMiddleware implements NestMiddleware {
    private readonly writeIntoFile: boolean;
    private readonly maxSize: string;
    private readonly maxFiles: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.writeIntoFile = this.configService.get<boolean>(
            'debugger.http.writeIntoFile'
        );
        this.maxSize = this.configService.get<string>('debugger.http.maxSize');
        this.maxFiles = this.configService.get<number>(
            'debugger.http.maxFiles'
        );
    }

    private async httpLogger(): Promise<IHttpDebuggerConfig> {
        const date: string = this.helperDateService.format(
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

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (this.writeIntoFile) {
            const config: IHttpDebuggerConfig = await this.httpLogger();

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
export class HttpDebuggerWriteIntoConsoleMiddleware implements NestMiddleware {
    private readonly writeIntoConsole: boolean;

    constructor(private readonly configService: ConfigService) {
        this.writeIntoConsole = this.configService.get<boolean>(
            'debugger.http.writeIntoConsole'
        );
    }

    private async httpLogger(): Promise<IHttpDebuggerConfig> {
        return {
            debuggerHttpFormat: DEBUGGER_HTTP_FORMAT,
        };
    }

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (this.writeIntoConsole) {
            const config: IHttpDebuggerConfig = await this.httpLogger();

            morgan(config.debuggerHttpFormat)(req, res, next);
        } else {
            next();
        }
    }
}

@Injectable()
export class HttpDebuggerResponseMiddleware implements NestMiddleware {
    private readonly writeIntoFile: boolean;
    private readonly writeIntoConsole: boolean;

    constructor(private readonly configService: ConfigService) {
        this.writeIntoConsole = this.configService.get<boolean>(
            'debugger.http.writeIntoConsole'
        );
        this.writeIntoFile = this.configService.get<boolean>(
            'debugger.http.writeIntoFile'
        );
    }
    use(req: Request, res: Response, next: NextFunction): void {
        if (this.writeIntoConsole || this.writeIntoFile) {
            const send: any = res.send;
            const resOld: any = res;

            // Add response data to request
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
