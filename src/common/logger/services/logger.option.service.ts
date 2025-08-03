import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { HelperService } from '@common/helper/services/helper.service';
import {
    LOGGER_EXCLUDED_ROUTES,
    LOGGER_SENSITIVE_FIELDS,
} from '@common/logger/constants/logger.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Response } from 'express';

/**
 * Service responsible for configuring and providing logger options for the application.
 * This service creates Pino logger configurations with support for file rotation,
 * sensitive data redaction, and custom serializers for request/response logging.
 */
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
        private readonly helperService: HelperService
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

    /**
     * Creates and configures Pino logger options based on application configuration.
     * Sets up transports for console and file logging, configures serializers for
     * request/response objects, and implements sensitive data redaction.
     *
     * @returns Promise resolving to configured Pino logger parameters
     */
    async createOptions(): Promise<Params> {
        const rfs = await import('rotating-file-stream');

        const transports = this.buildTransports();

        return {
            pinoHttp: {
                level: this.debugEnable ? this.debugLevel : 'silent',
                formatters: {
                    log: this.createLogFormatter(),
                },
                messageKey: 'msg',
                timestamp: false,
                base: null,
                stream: this.createFileStream(rfs),
                redact: this.createRedactionConfig(),
                serializers: this.createSerializers(),
                transport:
                    transports.length > 0 ? { targets: transports } : undefined,
                autoLogging: this.createAutoLoggingConfig(),
            },
        };
    }

    /**
     * Builds transport configurations for console and file logging.
     *
     * @returns Array of transport configurations
     */
    private buildTransports(): Array<{
        target: string;
        options: Record<string, unknown>;
    }> {
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

        return transports;
    }

    /**
     * Creates a log formatter function that adds timestamp and application metadata.
     *
     * @returns Log formatter function
     */
    private createLogFormatter() {
        return (object: Record<string, unknown>) => {
            const today = this.helperService.dateCreate();

            return {
                ...object,
                timestamp: today.valueOf(),
                iso: this.helperService.dateFormatToIso(today),
                labels: {
                    name: this.name,
                    env: this.env,
                    version: this.version,
                },
            };
        };
    }

    /**
     * Creates a rotating file stream for log files if file logging is enabled.
     *
     * @param rfs - The rotating-file-stream module
     * @returns File stream or undefined if file logging is disabled
     */
    private createFileStream(
        rfs: typeof import('rotating-file-stream')
    ): import('rotating-file-stream').RotatingFileStream | undefined {
        return this.debugIntoFile
            ? rfs.createStream('api.log', {
                  size: '10M',
                  interval: '1d',
                  compress: 'gzip',
                  path: `.${this.debugFilePath}`,
                  maxFiles: 10,
                  rotate: 7,
              })
            : undefined;
    }

    /**
     * Creates redaction configuration to hide sensitive data in logs.
     *
     * @returns Redaction configuration object
     */
    private createRedactionConfig(): { paths: string[]; censor: string } {
        const paths = [
            ...this.mapSensitiveFieldPaths('req.body'),
            ...this.mapSensitiveFieldPaths('req.headers'),
            ...this.mapSensitiveFieldPaths('res.body'),
            ...this.mapSensitiveFieldPaths('res.headers'),
        ];

        return {
            paths,
            censor: '***REDACTED***',
        };
    }

    /**
     * Maps sensitive fields to their full paths for redaction.
     *
     * @param basePath - The base path (e.g., 'req.body', 'req.headers')
     * @returns Array of full paths for sensitive fields
     */
    private mapSensitiveFieldPaths(basePath: string): string[] {
        return LOGGER_SENSITIVE_FIELDS.map(field =>
            field.includes('-')
                ? `${basePath}["${field}"]`
                : `${basePath}.${field}`
        );
    }

    /**
     * Creates custom serializers for request, response, and error objects.
     *
     * @returns Object containing serializer functions
     */
    private createSerializers(): {
        req: (request: IRequestApp) => Record<string, unknown>;
        res: (
            response: Response & { headers: Record<string, string> }
        ) => Record<string, unknown>;
        err: (error: Error) => Record<string, unknown>;
    } {
        return {
            req: this.createRequestSerializer(),
            res: this.createResponseSerializer(),
            err: this.createErrorSerializer(),
        };
    }

    /**
     * Creates a serializer function for HTTP request objects.
     *
     * @returns Request serializer function
     */
    private createRequestSerializer() {
        return (request: IRequestApp) => {
            const rawReq = Object.getOwnPropertySymbols(request).find(
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
                body,
                ip: request.ip,
                user: (request.user as unknown as { userId: string })?.userId,
                userAgent: request.headers['user-agent'],
                referer: request.headers.referer,
                remoteAddress: (request as unknown as { remoteAddress: string })
                    .remoteAddress,
                remotePort: (request as unknown as { remotePort: number })
                    .remotePort,
            };
        };
    }

    /**
     * Creates a serializer function for HTTP response objects.
     *
     * @returns Response serializer function
     */
    private createResponseSerializer() {
        return (response: Response & { headers: Record<string, string> }) => {
            let headers = {};

            if (typeof response.getHeaders === 'function') {
                // Express/Fastify Response object
                headers = { ...response.getHeaders() };
            } else if (response.headers) {
                headers = { ...response.headers };
            }

            const rawRes = Object.getOwnPropertySymbols(response).find(
                sym => String(sym) === 'Symbol(pino-raw-res-ref)'
            );

            let body: { data?: unknown } = {};
            if (rawRes) {
                try {
                    body = JSON.parse(response[rawRes].body);
                    // Delete body.data for privacy reasons
                    delete body.data;
                } catch {
                    // Ignore parsing errors
                }
            }

            return {
                httpCode: response.statusCode,
                headers,
                body,
            };
        };
    }

    /**
     * Creates a serializer function for error objects.
     *
     * @returns Error serializer function
     */
    private createErrorSerializer() {
        return (error: Error) => ({
            type: error.name,
            message: error.message,
            code: (error as unknown as { statusCode?: number })?.statusCode,
            stack: error.stack,
        });
    }

    /**
     * Creates auto-logging configuration based on application settings.
     *
     * @returns Auto-logging configuration or boolean value
     */
    private createAutoLoggingConfig():
        | { ignore: (req: IRequestApp) => boolean }
        | boolean {
        return this.autoLogger
            ? {
                  ignore: (req: IRequestApp) =>
                      this.helperService.checkUrlContainWildcard(
                          req.url,
                          LOGGER_EXCLUDED_ROUTES
                      ),
              }
            : this.autoLogger;
    }
}
