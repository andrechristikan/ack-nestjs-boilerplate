import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';
import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { HelperService } from '@common/helper/services/helper.service';
import {
    LOGGER_EXCLUDED_ROUTES,
    LOGGER_REQUEST_ID_HEADERS,
    LOGGER_SENSITIVE_FIELDS,
    LOGGER_SENSITIVE_PATHS,
} from '@common/logger/constants/logger.constant';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { Response } from 'express';
import { LoggerDebugInfo } from '@common/logger/interfaces/logger.interface';
import { randomUUID } from 'crypto';

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

    private readonly sensitiveFields: Set<string>;
    private readonly sensitivePaths: string[];

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

        this.sensitiveFields = new Set(
            LOGGER_SENSITIVE_FIELDS.map(field => field.toLowerCase())
        );
        this.sensitivePaths = LOGGER_SENSITIVE_PATHS.map(path =>
            LOGGER_SENSITIVE_FIELDS.map(field =>
                field.includes('-') ? `${path}["${field}"]` : `${path}.${field}`
            )
        ).flat();
    }

    /**
     * Creates and configures Pino logger options based on application configuration.
     * Sets up transports for console and file logging, configures serializers for
     * request/response objects, and implements sensitive data redaction.
     * @returns {Promise<Params>} Promise resolving to configured Pino logger parameters
     */
    async createOptions(): Promise<Params> {
        const rfs = await import('rotating-file-stream');

        const transports = this.buildTransports();

        return {
            pinoHttp: {
                genReqId: this.getReqId,
                formatters: {
                    log: this.createLogFormatter(),
                },
                messageKey: 'msg',
                timestamp: false,
                wrapSerializers: false,
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
     * Generates or extracts a request ID from HTTP headers or request object.
     * Checks predefined headers for existing request IDs, falling back to the request's ID or generating a new UUID.
     * @param {IRequestApp} request - The HTTP request object
     * @returns {string} The request ID string
     */
    private getReqId(request: IRequestApp): string {
        const headers = request.headers;
        if (!headers) {
            return (request.id as string) ?? randomUUID();
        }

        for (const header of LOGGER_REQUEST_ID_HEADERS) {
            const value = headers[header];
            if (value) {
                return value as string;
            }
        }

        return (request.id as string) ?? randomUUID();
    }

    /**
     * Builds transport configurations for console and file logging based on application settings.
     * Creates pino-pretty transport for formatted console output when prettier is enabled,
     * and pino/file transport for file logging when intoFile is enabled.
     * @returns {Array<{target: string; options: Record<string, unknown>}>} Array of transport configurations with target module names and their respective options
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
     * @returns {Function} Function that formats log objects with timestamp and application labels
     */
    private createLogFormatter(): (
        object: Record<string, unknown>
    ) => Record<string, unknown> {
        return (object: Record<string, unknown>) => {
            const today = this.helperService.dateCreate();
            const level = object.level ?? 'INFO';

            return {
                level,
                timestamp: today.valueOf(),
                iso: this.helperService.dateFormatToIso(today),
                labels: {
                    name: this.name,
                    environment: this.env,
                    version: this.version,
                },
                ...(object.req && {
                    request: object.req,
                }),
                ...(object.res && {
                    response: this.createResponseSerializer(
                        object.res as Response & { body: unknown }
                    ),
                }),
                ...(object.err && {
                    error: this.createErrorSerializer(object.err as Error),
                }),
                ...(this.env !== ENUM_APP_ENVIRONMENT.PRODUCTION && {
                    debug: this.addDebugInfo(),
                }),
            };
        };
    }

    /**
     * Creates a rotating file stream for log files if file logging is enabled.
     * @param {typeof import('rotating-file-stream')} rfs - The rotating-file-stream module imported dynamically
     * @returns {import('rotating-file-stream').RotatingFileStream | undefined} RotatingFileStream instance if file logging is enabled, undefined otherwise
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
     * @returns {{paths: string[]; censor: string}} Redaction configuration object
     */
    private createRedactionConfig(): {
        paths: string[];
        censor: string;
        remove: boolean;
    } {
        return {
            paths: this.sensitivePaths,
            censor: '***[REDACTED]***',
            remove: false,
        };
    }

    /**
     * Creates custom serializers for request, response, and error objects.
     * @returns {Object} Object containing serializer functions for req, res, and err properties
     */
    private createSerializers(): {
        req: (request: IRequestApp) => Record<string, unknown>;
    } {
        return {
            req: this.createRequestSerializer(),
        };
    }

    /**
     * Recursively sanitizes objects by redacting sensitive fields and handling circular references.
     * Protects against deep object traversal and truncates large arrays to prevent memory issues.
     * @param {unknown} obj - The object to sanitize
     * @param {number} maxDepth - Maximum recursion depth to prevent stack overflow (default: 5)
     * @param {number} currentDepth - Current recursion depth (default: 0)
     * @returns {unknown} The sanitized object with sensitive data redacted
     */
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

        const result = { ...obj };

        for (const key in result) {
            if (this.sensitiveFields.has(key.toLowerCase())) {
                result[key] = `[REDACTED]`;
            } else if (typeof result[key] === 'object') {
                result[key] = this.sanitizeObject(
                    result[key],
                    maxDepth,
                    currentDepth + 1
                );
            }
        }

        return result;
    }

    /**
     * Extracts the client's IP address from various sources in the HTTP request.
     * Checks multiple sources including direct IP, connection properties, and proxy headers.
     * @param {IRequestApp} request - The HTTP request object
     * @returns {string} The client's IP address or 'unknown' if not found
     */
    private extractClientIP(request: IRequestApp): string {
        if (request.ip) {
            return request.ip as string;
        }

        if (request.connection?.remoteAddress) {
            return request.connection.remoteAddress as string;
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

    /**
     * Extracts and serializes user information from the request object.
     * Returns the user ID if available, otherwise returns null.
     * @param {IRequestApp} request - The HTTP request object containing user information
     * @returns {string | null} The user ID string or null if not authenticated
     */
    private serializeUser(request: IRequestApp): string | null {
        return (request.user as unknown as { userId: string })?.userId ?? null;
    }

    /**
     * Adds debug information including memory usage and uptime to log entries.
     * Only includes debug information in non-production environments for security.
     * @returns {LoggerDebugInfo | undefined} Debug information object with memory and uptime data, or undefined in production
     */
    private addDebugInfo(): LoggerDebugInfo | undefined {
        if (this.env === ENUM_APP_ENVIRONMENT.PRODUCTION) {
            return undefined;
        }

        const memUsage = process.memoryUsage();
        return {
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            },
            uptime: Math.round(process.uptime()),
        };
    }

    /**
     * Creates a serializer function for HTTP request objects.
     * @returns {Function} Function that serializes request objects with relevant HTTP and user information
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
                query: this.sanitizeObject(request.query),
                params: this.sanitizeObject(request.params),
                headers: this.sanitizeObject(request.headers),
                body: this.sanitizeObject(request.body),
                ip: this.extractClientIP(request),
                user: this.serializeUser(request),
                userAgent: request.headers['user-agent'],
                contentType: request.headers?.['content-type'],
                referer: request.headers.referer,
                remoteAddress: (request as unknown as { remoteAddress: string })
                    .remoteAddress,
                remotePort: (request as unknown as { remotePort: number })
                    .remotePort,
            };
        };
    }

    /**
     * Creates a serialized representation of HTTP response objects.
     * Extracts status code, headers, body content, and response metadata for logging.
     * @param {Response & { body: unknown }} response - The HTTP response object with body content
     * @returns {Record<string, unknown>} Serialized response object with sanitized data
     */
    private createResponseSerializer(
        response: Response & { body: unknown }
    ): Record<string, unknown> {
        let body: unknown = response.body;
        try {
            body = JSON.parse(response.body as string);
        } catch {}

        return {
            httpCode: response.statusCode,
            headers: this.sanitizeObject(
                response.getHeaders() as Record<string, unknown>
            ),
            body: this.sanitizeObject(body),
            contentLength: response.getHeader('content-length'),
            responseTime: response.getHeader('X-Response-Time'),
        };
    }

    /**
     * Creates a serialized representation of error objects for logging.
     * Extracts error type, message, status code, and stack trace information.
     * @param {Error} error - The error object to serialize
     * @returns {Record<string, unknown>} Serialized error object with relevant error information
     */
    private createErrorSerializer(error: Error): Record<string, unknown> {
        return {
            type: error.name,
            message: error.message,
            code: (error as unknown as { statusCode?: number })?.statusCode,
            stack: error.stack,
        };
    }

    /**
     * Creates auto-logging configuration based on application settings.
     * @returns {{ignore: Function} | boolean} Auto-logging configuration object with ignore function if enabled, otherwise returns the autoLogger boolean value
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
