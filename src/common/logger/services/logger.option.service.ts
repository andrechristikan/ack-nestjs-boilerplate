import { Injectable, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IncomingMessage } from 'node:http';
import type { Params } from 'nestjs-pino';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestContextService } from '@common/request/services/request.context.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestActorStoreKey,
    RequestCorrelationIdStoreKey,
    RequestIdStoreKey,
} from '@common/request/constants/request.constant';
import {
    LoggerAutoContext,
    LoggerRedactedValue,
    LoggerSensitiveFields,
    LoggerSensitivePaths,
} from '@common/logger/constants/logger.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { Response } from 'express';
import type {
    ILoggerDebugInfo,
    ILoggerMixin,
    ILoggerTransport,
} from '@common/logger/interfaces/logger.interface';
import { EnumLoggerLevel } from '@common/logger/enums/logger.enum';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import { LoggerUrlUtil } from '@common/logger/utils/logger.url.util';

@Injectable()
export class LoggerOptionService {
    private readonly env: EnumAppEnvironment;
    private readonly name: string;
    private readonly version: string;

    private readonly accessLogEnabled: boolean;
    private readonly excludedRoutes: string[];

    private readonly enabled: boolean;
    private readonly level: EnumLoggerLevel;
    private readonly fileEnabled: boolean;
    private readonly filePath: string;
    private readonly prettyEnabled: boolean;

    private readonly sensitivePaths: string[];

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly requestContextService: RequestContextService,
        private readonly requestStoreService: RequestStoreService,
        private readonly loggerUtil: LoggerUtil,
        private readonly loggerUrlUtil: LoggerUrlUtil
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
        this.name = this.configService.get<string>('app.name')!;
        this.version = this.configService.get<string>('app.version')!;

        this.accessLogEnabled = this.configService.get<boolean>(
            'logger.accessLogEnabled'
        )!;
        this.excludedRoutes = this.configService.get<string[]>(
            'logger.excludedRoutes'
        )!;

        this.enabled = this.configService.get<boolean>('logger.enabled')!;
        this.level = this.configService.get<EnumLoggerLevel>('logger.level')!;
        this.fileEnabled =
            this.configService.get<boolean>('logger.fileEnabled')!;
        this.filePath = this.configService.get<string>('logger.filePath')!;
        this.prettyEnabled = this.configService.get<boolean>(
            'logger.prettyEnabled'
        )!;

        this.sensitivePaths = LoggerSensitivePaths.map(path =>
            LoggerSensitiveFields.map(field =>
                field.includes('-') ? `${path}["${field}"]` : `${path}.${field}`
            )
        ).flat();
    }

    private buildTransports(): ILoggerTransport | null {
        const transport: {
            targets: {
                target: string;
                level: string;
                options: Record<string, unknown>;
            }[];
        } = {
            targets: [],
        };

        if (this.prettyEnabled) {
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

        if (this.fileEnabled) {
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

        return transport.targets.length > 0 ? transport : null;
    }

    private createLogFormatter(): (
        obj: Record<string, unknown>
    ) => Record<string, unknown> {
        return (obj: Record<string, unknown>) => {
            const pid = process.pid;
            const hostname = this.requestContextService.getHostname();
            const today = this.helperDateService.now();

            const {
                time: _time,
                responseTime: _responseTime,
                level,
                requestId,
                correlationId,
                userId,
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

            const sanitizedMessage = this.loggerUtil.sanitizeMessage(
                message ?? msg
            );

            const log: Record<string, unknown> = {
                severity,
                context: context ?? LoggerAutoContext,
                requestId,
                correlationId,
                userId,
                timestamp: today.valueOf(),
                msg: sanitizedMessage,
                service: {
                    name: this.name,
                    environment: this.env,
                    version: this.version,
                },
            };

            if (Object.keys(additionalData).length > 0) {
                log.additionalData =
                    this.loggerUtil.redactValue(additionalData);
            }

            if (this.env !== EnumAppEnvironment.production) {
                log.debug = this.addDebugInfo({
                    pid,
                    hostname,
                });
            }

            const caughtError = error ?? err ?? null;
            if (caughtError !== null) {
                log.err = this.loggerUtil.serializeError(caughtError as Error);
            }

            if (res) {
                log.res = res;
            }

            if (req) {
                log.req = req;
            }

            return log;
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
    ): ILoggerDebugInfo | null {
        if (this.env === EnumAppEnvironment.production) {
            return null;
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
        { ignore: (req: IncomingMessage) => boolean } | boolean {
        return this.accessLogEnabled === true
            ? {
                  ignore: (req: IncomingMessage) =>
                      this.loggerUrlUtil.matchesPatterns(
                          req.url!,
                          this.excludedRoutes
                      ),
              }
            : false;
    }

    private createMixin(): (_: object, level: number) => ILoggerMixin {
        return (_: object, level: number) => {
            const requestId =
                this.requestStoreService.get<string>(RequestIdStoreKey);
            const correlationId = this.requestStoreService.get<string>(
                RequestCorrelationIdStoreKey
            );

            const userId =
                this.requestStoreService.get<string>(RequestActorStoreKey);

            return {
                level,
                requestId,
                correlationId,
                userId,
            };
        };
    }

    async createOptions(): Promise<Params> {
        const logFormatter = this.createLogFormatter();
        const mixin = this.createMixin();
        const transports = this.buildTransports();
        const redactionConfig = this.createRedactionConfig();
        const serializers = this.createSerializers();
        const autoLoggingConfig = this.createAutoLoggingConfig();

        return {
            forRoutes: [{ path: '{*wildcard}', method: RequestMethod.ALL }],
            pinoHttp: {
                formatters: {
                    log: logFormatter,
                },
                mixin,
                messageKey: 'msg',
                timestamp: false,
                wrapSerializers: false,
                base: null,
                ...(transports !== null && { transport: transports }),
                level: this.enabled ? this.level : 'silent',
                redact: redactionConfig,
                serializers,
                autoLogging: autoLoggingConfig,
            },
        };
    }
}
