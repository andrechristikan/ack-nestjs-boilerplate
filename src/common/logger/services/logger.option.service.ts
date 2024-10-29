import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { IncomingMessage } from 'http';
import { Params } from 'nestjs-pino';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggerOptionService {
    constructor(private configService: ConfigService) {}

    createOptions(): Params {
        return {
            pinoHttp: {
                level: this.configService.get<string>('debug.logger.level'),
                formatters: {
                    level: (label: string) => ({ level: label.toUpperCase() }),
                },
                messageKey: 'message',
                timestamp: false,
                base: {
                    app: this.configService.get<string>('app.name'),
                    env: this.configService.get<string>('app.env'),
                    date: new Date().toISOString(),
                },
                serializers: {
                    req(request: IRequestApp) {
                        return {
                            id: request.id,
                            method: request.method,
                            url: request.url,
                            queries: request.query,
                            parameters: request.params,
                            headers: request.headers,
                            body: request.body,
                        };
                    },
                    res(response) {
                        console.log(response);
                        return {
                            statusCode: response.statusCode,
                            headers: response.headers,
                        };
                    },
                    //     err(error) {
                    //         return {
                    //             type: error.type,
                    //             message: error.message,
                    //             stack: error.stack,
                    //             code: error.code,
                    //         };
                    //     },
                },
            },
        };
    }
}
