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

    private readonly enable: boolean;
    private readonly level: string;
    private readonly intoFile: boolean;
    private readonly filePath: string;
    private readonly prettier: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.env = this.configService.get<ENUM_APP_ENVIRONMENT>('app.env');
        this.name = this.configService.get<string>('app.name');
        this.version = this.configService.get<string>('app.version');

        this.autoLogger = this.configService.get<boolean>('logger.auto');

        this.enable = this.configService.get<boolean>('logger.enable');
        this.level = this.configService.get<string>('logger.level');
        this.intoFile = this.configService.get<boolean>('logger.intoFile');
        this.filePath = this.configService.get<string>('logger.filePath');
        this.prettier = this.configService.get<boolean>('logger.prettier');
    }

    /**
     * Creates and configures Pino logger options based on application configuration.
     * Sets up transports for console and file logging, configures serializers for
     * request/response objects, and implements sensitive data redaction.
     * @returns Promise resolving to configured Pino logger parameters
     */
    async createOptions(): Promise<Params> {
        const rfs = await import('rotating-file-stream');

        const transports = this.buildTransports();

        return {
            pinoHttp: {
                formatters: {
                    log: this.createLogFormatter(),
                },
                messageKey: 'msg',
                timestamp: false,
                base: null,
                transport:
                    transports.length > 0 ? { targets: transports } : undefined,
                level: this.enable ? this.level : 'silent',
                stream: this.createFileStream(rfs),
                redact: this.createRedactionConfig(),
                serializers: this.createSerializers(),
                autoLogging: this.createAutoLoggingConfig(),
            },
        };
    }

    /**
     * Builds transport configurations for console and file logging based on application settings.
     * Creates pino-pretty transport for formatted console output when prettier is enabled,
     * and pino/file transport for file logging when intoFile is enabled.
     * @returns Array of transport configurations with target module names and their respective options
     */
    private buildTransports(): Array<{
        target: string;
        options: Record<string, unknown>;
    }> {
        const transports = [];

        if (this.prettier) {
            transports.push({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                },
            });
        }

        if (this.intoFile) {
            transports.push({
                target: 'pino/file',
                options: {
                    destination: `.${this.filePath}/api.log`,
                    mkdir: true,
                },
            });
        }

        return transports;
    }

    /**
     * Creates a log formatter function that adds timestamp and application metadata.
     * @returns Function that formats log objects with timestamp and application labels
     */
    private createLogFormatter(): (
        object: Record<string, unknown>
    ) => Record<string, unknown> {
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
     * @param rfs - The rotating-file-stream module imported dynamically
     * @returns RotatingFileStream instance if file logging is enabled, undefined otherwise
     */
    private createFileStream(
        rfs: typeof import('rotating-file-stream')
    ): import('rotating-file-stream').RotatingFileStream | undefined {
        return this.intoFile
            ? rfs.createStream('api.log', {
                  size: '10M',
                  interval: '1d',
                  compress: 'gzip',
                  path: `.${this.filePath}`,
                  maxFiles: 10,
                  rotate: 7,
              })
            : undefined;
    }

    /**
     * Creates redaction configuration to hide sensitive data in logs.
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
     * @param basePath - The base path for the sensitive fields (e.g., 'req.body', 'req.headers')
     * @returns Array of complete paths for sensitive fields with proper bracket notation for fields containing hyphens
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
     * @returns Object containing serializer functions for req, res, and err properties
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
     * @returns Function that serializes request objects with relevant HTTP and user information
     */
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
                parameters: request.params,
                query: request.query,
                headers: request.headers,
                body: request.body,
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
     * @returns Function that serializes response objects with status code and headers
     */
    private createResponseSerializer(): (
        response: Response
    ) => Record<string, unknown> {
        return (response: Response) => {
            // TODO: Consider to add response body: statusCode, message, and errors. except data.
            return {
                httpCode: response.statusCode,
                headers: response.getHeaders(),
            };
        };
    }

    /**
     * Creates a serializer function for error objects.
     * @returns Function that serializes error objects with type, message, code, and stack trace
     */
    private createErrorSerializer(): (error: Error) => Record<string, unknown> {
        return (error: Error) => ({
            type: error.name,
            message: error.message,
            code: (error as unknown as { statusCode?: number })?.statusCode,
            stack: error.stack,
        });
    }

    /**
     * Creates auto-logging configuration based on application settings.
     * @returns Auto-logging configuration object with ignore function if enabled, otherwise returns the autoLogger boolean value
     */
    private createAutoLoggingConfig():
        | { ignore: (req: IRequestApp) => boolean }
        | boolean {
        return this.autoLogger === true
            ? {
                  ignore: (req: IRequestApp) =>
                      this.helperService.checkUrlContainWildcard(
                          req.url,
                          LOGGER_EXCLUDED_ROUTES
                      ),
              }
            : false;
    }
}
