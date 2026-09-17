import { Injectable, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import {
    LoggerAutoContext,
    LoggerExcludedRoutes,
    LoggerRedactedValue,
    LoggerSensitiveFields,
    LoggerSensitivePaths,
} from '@common/logger/constants/logger.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { Response } from 'express';
import type { LoggerDebugInfo } from '@common/logger/interfaces/logger.interface';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import type { Options } from 'pino-http';

@Injectable()
export class LoggerOptionService {
    private readonly env: EnumAppEnvironment;
    private readonly name: string;
    private readonly version: string;

    private readonly autoLogger: boolean;

    private readonly enable: boolean;
    private readonly level: EnumLoggerLevel;
    private readonly intoFile: boolean;
    private readonly filePath: string;
    private readonly prettier: boolean;

    private readonly sensitivePaths: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly loggerUtil: LoggerUtil
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.name = this.configService.get<string>('app.name')!;
        this.version = this.configService.get<string>('app.version')!;

        this.autoLogger = this.configService.get<boolean>('logger.auto')!;

        this.enable = this.configService.get<boolean>('logger.enable')!;
        this.level = this.configService.get<EnumLoggerLevel>('logger.level')!;
        this.intoFile = this.configService.get<boolean>('logger.intoFile')!;
        this.filePath = this.configService.get<string>('logger.filePath')!;
        this.prettier = this.configService.get<boolean>('logger.prettier')!;

        this.sensitivePaths = LoggerSensitivePaths.map(path =>
            LoggerSensitiveFields.map(field =>
                field.includes('-') ? `${path}["${field}"]` : `${path}.${field}`
            )
        ).flat();
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

    private createLogFormatter(): (
        obj: Record<string, unknown>
    ) => Record<string, unknown> {
        return (obj: Record<string, unknown>) => {
            const pid = process.pid;
            const hostname = this.requestContextService.getHostname();
            const today = this.helperDateService.create();

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

            const severity = this.loggerUtil.mapLevelToSeverity(
                level as number
            );

            return {
                severity,
                context: context ?? LoggerAutoContext,
                timestamp: today.valueOf(),
                msg: this.loggerUtil.sanitizeMessage(message ?? msg),
                service: {
                    name: this.name,
                    environment: this.env,
                    version: this.version,
                },
                ...(Object.keys(additionalData).length > 0 && {
                    additionalData: this.loggerUtil.redactValue(additionalData),
                }),

                ...(this.env !== EnumAppEnvironment.production && {
                    debug: this.addDebugInfo({
                        pid,
                        hostname,
                    }),
                }),
                ...(!!err && {
                    err: this.loggerUtil.serializeError(
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
            censor: LoggerRedactedValue,
            remove: false,
        };
    }

    private createSerializers(): {
        req: (request: IRequestApp) => Record<string, unknown>;
        res: (response: Response) => Record<string, unknown>;
        err: (error: Error) => Record<string, unknown>;
    } {
        return {
            req: (request: IRequestApp) =>
                this.loggerUtil.serializeRequest(request),
            res: (response: Response) =>
                this.loggerUtil.serializeResponse(response),
            err: (error: Error) => this.loggerUtil.serializeError(error),
        };
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

    private createAutoLoggingConfig():
        { ignore: (req: IRequestApp) => boolean } | boolean {
        return this.autoLogger === true
            ? {
                  ignore: (req: IRequestApp) =>
                      this.helperStringService.checkUrlMatchesPatterns(
                          req.url,
                          LoggerExcludedRoutes
                      ),
              }
            : false;
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

    async createOptions(): Promise<Params> {
        return {
            forRoutes: [{ path: '{*wildcard}', method: RequestMethod.ALL }],
            pinoHttp: {
                genReqId: (request: IRequestApp) =>
                    this.loggerUtil.getRequestId(request),
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
}
