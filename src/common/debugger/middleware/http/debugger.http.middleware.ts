import { Injectable, NestMiddleware } from '@nestjs/common';
import morgan from 'morgan';
import { Request, Response, NextFunction } from 'express';
import { createStream } from 'rotating-file-stream';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { IResponseCustom } from 'src/common/response/interfaces/response.interface';
import {
    IDebuggerHttpConfig,
    IDebuggerHttpConfigOptions,
} from 'src/common/debugger/interfaces/debugger.interface';
import {
    DEBUGGER_HTTP_FORMAT,
    DEBUGGER_HTTP_NAME,
} from 'src/common/debugger/constants/debugger.constant';

@Injectable()
export class DebuggerHttpMiddleware implements NestMiddleware {
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
            (req: Request, res: IResponseCustom) => res.body
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
export class DebuggerHttpWriteIntoFileMiddleware implements NestMiddleware {
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

    private async httpLogger(): Promise<IDebuggerHttpConfig> {
        const date: string = this.helperDateService.format(
            this.helperDateService.create()
        );

        const debuggerHttpOptions: IDebuggerHttpConfigOptions = {
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
            debuggerHttpOptions,
        };
    }

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (this.writeIntoFile) {
            const config: IDebuggerHttpConfig = await this.httpLogger();

            morgan(config.debuggerHttpFormat, config.debuggerHttpOptions)(
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
export class DebuggerHttpWriteIntoConsoleMiddleware implements NestMiddleware {
    private readonly writeIntoConsole: boolean;

    constructor(private readonly configService: ConfigService) {
        this.writeIntoConsole = this.configService.get<boolean>(
            'debugger.http.writeIntoConsole'
        );
    }

    private async httpLogger(): Promise<IDebuggerHttpConfig> {
        return {
            debuggerHttpFormat: DEBUGGER_HTTP_FORMAT,
        };
    }

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        if (this.writeIntoConsole) {
            const config: IDebuggerHttpConfig = await this.httpLogger();

            morgan(config.debuggerHttpFormat)(req, res, next);
        } else {
            next();
        }
    }
}

@Injectable()
export class DebuggerHttpResponseMiddleware implements NestMiddleware {
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
