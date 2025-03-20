import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { ENUM_APP_ENVIRONMENT } from 'src/app/enums/app.enum';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import {
    EXCLUDED_ROUTES,
    LOGGER_SENSITIVE_FIELDS,
} from 'src/common/logger/constants/logger.constant';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class LoggerOptionService {
    private readonly env: ENUM_APP_ENVIRONMENT;
    private readonly name: string;
    private readonly version: string;

    private readonly autoLogger: boolean;

    private readonly debugEnable: boolean;
    private readonly debugLevel: string;
    private readonly debugIntoFile: boolean;
    private readonly debugFilePath: string;
    private readonly debugPrettier: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.name = this.configService.get<string>('app.name');
        this.version = this.configService.get<string>('app.version');

        this.autoLogger = this.configService.get<boolean>('debug.autoLogger');

        this.debugEnable = this.configService.get<boolean>('debug.enable');
        this.debugLevel = this.configService.get<string>('debug.level');
        this.debugIntoFile = this.configService.get<boolean>('debug.intoFile');
        this.debugFilePath = this.configService.get<string>('debug.filePath');
        this.debugPrettier = this.configService.get<boolean>('debug.prettier');
    }

    async createOptions(): Promise<Params> {
        const rfs = await import('rotating-file-stream');

        const transports = [];

        if (this.debugPrettier) {
            transports.push({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                },
            });
        }

        if (this.debugIntoFile) {
            transports.push({
                target: 'pino/file',
                options: {
                    destination: `.${this.debugFilePath}/api.log`,
                    mkdir: true,
                },
            });
        }

        return {
            pinoHttp: {
                level: this.debugEnable ? this.debugLevel : 'silent',
                formatters: {
                    log: object => {
                        const today = this.helperDateService.create();

                        const formatted: { [key: string]: any } = {
                            ...object,
                            timestamp: today.valueOf(),
                            iso: this.helperDateService.formatToIso(today),
                            labels: {
                                name: this.name,
                                env: this.env,
                                version: this.version,
                            },
                        };

                        return formatted;
                    },
                },
                messageKey: 'msg',
                timestamp: false,
                base: null,
                stream: this.debugIntoFile
                    ? rfs.createStream(`api.log`, {
                          size: '10M',
                          interval: '1d',
                          compress: 'gzip',
                          path: `.${this.debugFilePath}`,
                          maxFiles: 10,
                          rotate: 7,
                      })
                    : undefined,
                redact: {
                    paths: [
                        ...LOGGER_SENSITIVE_FIELDS.map(field =>
                            field.includes('-')
                                ? `req.body["${field}"]`
                                : `req.body.${field}`
                        ),
                        ...LOGGER_SENSITIVE_FIELDS.map(field =>
                            field.includes('-')
                                ? `req.headers["${field}"]`
                                : `req.headers.${field}`
                        ),
                        ...LOGGER_SENSITIVE_FIELDS.map(field =>
                            field.includes('-')
                                ? `res.body["${field}"]`
                                : `res.body.${field}`
                        ),
                        ...LOGGER_SENSITIVE_FIELDS.map(field =>
                            field.includes('-')
                                ? `res.headers["${field}"]`
                                : `res.headers.${field}`
                        ),
                    ],
                    censor: '***REDACTED***',
                },
                serializers: {
                    req: (request: IRequestApp) => {
                        const rawReq = Object.getOwnPropertySymbols(
                            request
                        ).find(
                            sym => String(sym) === 'Symbol(pino-raw-req-ref)'
                        );

                        let body = {};
                        if (rawReq) {
                            body = request[rawReq].body;
                        }

                        return {
                            id: request.id,
                            method: request.method,
                            url: request.url,
                            path: request.path,
                            route: request.route?.path,
                            parameters: request.params,
                            query: request.query,
                            headers: request.headers,
                            body: body,
                            ip: request.ip,
                            user: (request.user as any)?.user_id,
                            userAgent: request.headers['user-agent'],
                            referer: request.headers.referer,
                            remoteAddress: (request as any).remoteAddress,
                            remotePort: (request as any).remotePort,
                        };
                    },
                    res: (response: any) => {
                        let headers = {};

                        if (typeof response.getHeaders === 'function') {
                            // Express/Fastify Response object
                            headers = { ...response.getHeaders() };
                        } else if (response.headers) {
                            headers = { ...response.headers };
                        }

                        const rawRes = Object.getOwnPropertySymbols(
                            response
                        ).find(
                            sym => String(sym) === 'Symbol(pino-raw-res-ref)'
                        );

                        let body: any = {};
                        if (rawRes) {
                            try {
                                body = JSON.parse(response[rawRes].body);

                                // delete body.data for privacy reason
                                delete body.data;
                            } catch (_) {}
                        }

                        return {
                            httpCode: response.statusCode,
                            headers: headers,
                            body,
                        };
                    },
                    err: (error: Error) => ({
                        type: error.name,
                        message: error.message,
                        code: (error as any).statusCode,
                        stack: error.stack,
                    }),
                },
                transport:
                    transports.length > 0
                        ? {
                              targets: transports,
                          }
                        : undefined,
                autoLogging: this.autoLogger
                    ? {
                          ignore: (req: any) =>
                              EXCLUDED_ROUTES.includes(req.url),
                      }
                    : undefined,
            },
        };
    }

    private mapLevelToSeverity(level: string): string {
        const mapping: Record<string, string> = {
            trace: 'TRACE',
            debug: 'DEBUG',
            info: 'INFO',
            warn: 'WARNING',
            error: 'ERROR',
            fatal: 'CRITICAL',
        };

        return mapping[level.toLowerCase()] || 'DEFAULT';
    }
}
