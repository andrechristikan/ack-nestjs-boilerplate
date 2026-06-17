import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperService } from '@common/helper/services/helper.service';
import {
    LoggerAutoContext,
    LoggerExcludedRoutes,
    LoggerRequestIdHeaders,
    LoggerSensitiveFields,
    LoggerSensitivePaths,
} from '@common/logger/constants/logger.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Response } from 'express';
import { LoggerDebugInfo } from '@common/logger/interfaces/logger.interface';
import stripAnsi from 'strip-ansi';
import { EnumLoggerSeverity } from '@common/logger/enums/logger.enum';
import { Options } from 'pino-http';

@Injectable()
export class LoggerOptionService {
    private readonly env: EnumAppEnvironment;
    private readonly name: string;
    private readonly version: string;

    private readonly autoLogger: boolean;

    private readonly enable: boolean;
    private readonly level: string;
    private readonly intoFile: boolean;
    private readonly filePath: string;
    private readonly prettier: boolean;

    private readonly sensitiveFields: Set<string>;
    private readonly sensitivePaths: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.name = this.configService.get<string>('app.name')!;
        this.version = this.configService.get<string>('app.version')!;

        this.autoLogger = this.configService.get<boolean>('logger.auto')!;

        this.enable = this.configService.get<boolean>('logger.enable')!;
        this.level = this.configService.get<string>('logger.level')!;
        this.intoFile = this.configService.get<boolean>('logger.intoFile')!;
        this.filePath = this.configService.get<string>('logger.filePath')!;
        this.prettier = this.configService.get<boolean>('logger.prettier')!;

        this.sensitiveFields = new Set(
            LoggerSensitiveFields.map(field => field.toLowerCase())
        );
        this.sensitivePaths = LoggerSensitivePaths.map(path =>
            LoggerSensitiveFields.map(field =>
                field.includes('-') ? `${path}["${field}"]` : `${path}.${field}`
            )
        ).flat();
    }

    async createOptions(): Promise<Params> {
        return {
            pinoHttp: {
                genReqId: this.getReqId,
                formatters: {
                    log: this.createLogFormatter(),
                },
                mixin: this.createMixin(),
                messageKey: 'msg',
                timestamp: false,
                wrapSerializers: false,
                base: null,
                transport: this.buildTransports(),
                level: this.enable ? this.level : 'silent',
                redact: this.createRedactionConfig(),
                serializers: this.createSerializers(),
                autoLogging: this.createAutoLoggingConfig(),
            } as unknown as Params['pinoHttp'],
        };
    }

    private getReqId(request: IRequestApp): string {
        const headers = request.headers;
        if (!headers) {
            return request.id as string;
        }

        for (const header of LoggerRequestIdHeaders) {
            const value = headers[header];
            if (value) {
                return value as string;
            }
        }

        return request.id as string;
    }

    private buildTransports(): Options['transport'] {
        const transport: {
            targets: {
                target: string;
                level: string;
                options: Record<string, unknown>;
            }[];
        } = {
            targets: [],
        };

        if (this.prettier) {
            transport.targets.push({
                target: 'pino-pretty',
                level: this.level,
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                    messageFormat: '[{context}] {msg}',
                    ignore: 'context',
                    singleLine: false,
                },
            });
        }

        if (this.intoFile) {
            transport.targets.push({
                target: 'pino-roll',
                level: this.level,
                options: {
                    file: `.${this.filePath}/api.log`,
                    frequency: 'daily',
                    size: '10m',
                    mkdir: true,
                },
            });
        }

        return transport.targets.length > 0
            ? (transport as unknown as Options['transport'])
            : undefined;
    }

    private sanitizeMessage(message: unknown): string | unknown {
        if (typeof message === 'string') {
            return stripAnsi(message)
                .replaceAll(/[~→]/g, '')
                .replaceAll(/^\s*\d+\s+/gm, '')
                .replaceAll(/\s+/g, ' ')
                .trim();
        }

        return message;
    }

    private createLogFormatter(): (
        obj: Record<string, unknown>
    ) => Record<string, unknown> {
        return (obj: Record<string, unknown>) => {
            const pid = process.pid;
            const hostname = this.helperService.getHostname();
            const today = this.helperService.dateCreate();

            const {
                time: _time,
                responseTime: _responseTime,
                level,
                req,
                res,
                err,
                error,
                msg,
                message,
                context,
                ...additionalData
            } = obj;

            const severity = this.mapLevelToSeverity(level as number);

            return {
                severity,
                context: context ?? LoggerAutoContext,
                timestamp: today.valueOf(),
                msg: this.sanitizeMessage(message ?? msg),
                service: {
                    name: this.name,
                    environment: this.env,
                    version: this.version,
                },
                ...(Object.keys(additionalData).length > 0 && {
                    additionalData: this.sanitizeObject(additionalData),
                }),

                ...(this.env !== EnumAppEnvironment.production && {
                    debug: this.addDebugInfo({
                        pid,
                        hostname,
                    }),
                }),
                ...(!!err && {
                    err: this.createErrorSerializer()(
                        (error as Error) ?? (err as Error)
                    ),
                }),
                ...(!!res && {
                    res,
                }),
                ...(!!req && {
                    req,
                }),
            };
        };
    }

    private createRedactionConfig(): {
        paths: string[];
        censor: string;
        remove: boolean;
    } {
        return {
            paths: this.sensitivePaths,
            censor: '[REDACTED]',
            remove: false,
        };
    }

    private createSerializers(): {
        req: (request: IRequestApp) => Record<string, unknown>;
        res: (response: Response) => Record<string, unknown>;
        err: (error: Error) => Record<string, unknown>;
    } {
        return {
            req: this.createRequestSerializer(),
            res: this.createResponseSerializer(),
            err: this.createErrorSerializer(),
        };
    }

    private sanitizeObject(
        obj: unknown,
        maxDepth: number = 5,
        currentDepth: number = 0
    ): unknown {
        if (
            !obj ||
            typeof obj !== 'object' ||
            obj instanceof Date ||
            obj instanceof RegExp ||
            currentDepth >= maxDepth
        ) {
            return obj;
        }

        if (obj instanceof Buffer) {
            return { buffer: '[BUFFER]' };
        }

        if (Array.isArray(obj)) {
            if (obj.length > 10) {
                const newObj = obj
                    .slice(0, 10)
                    .map(item =>
                        this.sanitizeObject(item, maxDepth, currentDepth + 1)
                    );

                newObj.push({
                    truncated: `...[TRUNCATED] - total length ${obj.length}`,
                });

                return newObj;
            }
            return obj.map(item =>
                this.sanitizeObject(item, maxDepth, currentDepth + 1)
            );
        }

        const result: Record<string, unknown> = {
            ...obj,
        };

        for (const key in result) {
            if (this.sensitiveFields.has(key.toLowerCase())) {
                result[key] = `[REDACTED]`;
            } else if (typeof result[key] === 'object') {
                result[key] = this.sanitizeObject(
                    result[key],
                    maxDepth,
                    currentDepth + 1
                );
            } else {
                result[key] = this.sanitizeMessage(result[key]);
            }
        }

        return result;
    }

    private extractClientIP(request: IRequestApp): string {
        if (request.ip) {
            return request.ip as string;
        }

        if (request.socket?.remoteAddress) {
            return request.socket.remoteAddress as string;
        }

        const headers = request.headers;
        if (headers) {
            const forwarded = headers['x-forwarded-for'] as string;
            if (forwarded) {
                const firstIP = forwarded.split(',')[0].trim();
                if (firstIP) {
                    return firstIP;
                }
            }

            const realIP = headers['x-real-ip'] as string;
            if (realIP) {
                return realIP;
            }
        }

        return 'unknown';
    }

    private serializeUser(request: IRequestApp): string | null {
        return (request.user as unknown as { userId: string })?.userId ?? null;
    }

    private addDebugInfo(
        additionalParams: Record<string, unknown>
    ): LoggerDebugInfo | undefined {
        if (this.env === EnumAppEnvironment.production) {
            return undefined;
        }

        const memUsage = process.memoryUsage();
        return {
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            },
            uptime: Math.round(process.uptime()),
            ...additionalParams,
        };
    }

    private createRequestSerializer(): (
        request: IRequestApp
    ) => Record<string, unknown> {
        return (request: IRequestApp) => {
            return {
                id: request.id,
                method: request.method,
                url: request.url,
                path: request.path,
                route: request.route?.path,
                userAgent: request.headers['user-agent'],
                contentType: request.headers?.['content-type'],
                referer: request.headers.referer,
                remoteAddress: (request as unknown as { remoteAddress: string })
                    .remoteAddress,
                remotePort: (request as unknown as { remotePort: number })
                    .remotePort,
                ip: this.extractClientIP(request),
                user: this.serializeUser(request),
                query: this.sanitizeObject(request.query),
                params: this.sanitizeObject(request.params),
                headers: this.sanitizeObject(request.headers),
            };
        };
    }

    private createResponseSerializer(): (
        response: Response
    ) => Record<string, unknown> {
        return (response: Response) => {
            return {
                httpCode: response.statusCode,
                contentLength: response.getHeader('content-length'),
                responseTime: response.getHeader('X-Response-Time'),
                headers: this.sanitizeObject(
                    response.getHeaders() as Record<string, unknown>
                ),
            };
        };
    }

    private createErrorSerializer(): (error: Error) => Record<string, unknown> {
        return (error: Error) => {
            const defaultError = {
                type: error.name,
                message: this.sanitizeMessage(error.message),
                code: (error as unknown as { status?: number })?.status,
                statusCode: (
                    error as unknown as { response?: { statusCode?: number } }
                )?.response?.statusCode,
                stack: error.stack,
            };

            if (error instanceof HttpException) {
                const response = error.getResponse() as { _error?: unknown };
                return {
                    ...defaultError,
                    stack: response._error
                        ? String(response._error)
                        : defaultError.stack,
                };
            }

            return defaultError;
        };
    }

    private createAutoLoggingConfig():
        | { ignore: (req: IRequestApp) => boolean }
        | boolean {
        return this.autoLogger === true
            ? {
                  ignore: (req: IRequestApp) =>
                      this.helperService.checkUrlMatchesPatterns(
                          req.url,
                          LoggerExcludedRoutes
                      ),
              }
            : false;
    }

    private mapLevelToSeverity(level: number): string {
        if (level >= 60) {
            return EnumLoggerSeverity.critical.toUpperCase();
        } else if (level >= 50) {
            return EnumLoggerSeverity.error.toUpperCase();
        } else if (level >= 40) {
            return EnumLoggerSeverity.warning.toUpperCase();
        } else if (level >= 30) {
            return EnumLoggerSeverity.info.toUpperCase();
        } else if (level >= 20) {
            return EnumLoggerSeverity.debug.toUpperCase();
        }

        return EnumLoggerSeverity.trace.toUpperCase();
    }

    private createMixin(): (
        _: Record<string, unknown>,
        level: number
    ) => Record<string, unknown> {
        return (_: Record<string, unknown>, level: number) => {
            return {
                level: level,
            };
        };
    }
}
