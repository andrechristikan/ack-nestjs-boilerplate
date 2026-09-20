import { HttpException, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import stripAnsi from 'strip-ansi';
import {
    LoggerRedactMaxArrayLength,
    LoggerRedactMaxDepth,
    LoggerRedactedValue,
    LoggerRequestIdHeaders,
    LoggerSensitiveFields,
    LoggerUrlStaticSegmentRegex,
} from '@common/logger/constants/logger.constant';
import { EnumLoggerSeverity } from '@common/logger/enums/logger.enum';
import type { IRequestApp } from '@common/request/interfaces/request.interface';

/**
 * Shapes pino log records: request, response and error serialization, message cleanup,
 * URL masking, and sensitive-key redaction.
 */
@Injectable()
export class LoggerUtil {
    private readonly sensitiveFields = new Set(
        LoggerSensitiveFields.map(field => field.toLowerCase())
    );

    private redactNested(value: unknown, depth: number): unknown {
        if (
            !value ||
            typeof value !== 'object' ||
            value instanceof Date ||
            value instanceof RegExp
        ) {
            return value;
        }

        if (depth >= LoggerRedactMaxDepth) {
            return LoggerRedactedValue;
        }

        if (value instanceof Buffer) {
            return { buffer: '[BUFFER]' };
        }

        if (Array.isArray(value)) {
            const items = value
                .slice(0, LoggerRedactMaxArrayLength)
                .map(item => this.redactNested(item, depth + 1));

            if (value.length > LoggerRedactMaxArrayLength) {
                items.push({
                    truncated: `...[TRUNCATED] - total length ${value.length}`,
                });
            }

            return items;
        }

        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => {
                const hasSensitiveKey = this.sensitiveFields.has(
                    key.toLowerCase()
                );
                if (hasSensitiveKey) {
                    return [key, LoggerRedactedValue];
                }

                if (typeof item === 'object') {
                    const redactedItem = this.redactNested(item, depth + 1);

                    return [key, redactedItem];
                } else {
                    const sanitizedItem = this.sanitizeMessage(item);

                    return [key, sanitizedItem];
                }
            })
        );
    }

    private maskPath(path: string): string {
        return path
            .split('/')
            .map(segment =>
                !segment || LoggerUrlStaticSegmentRegex.test(segment)
                    ? segment
                    : LoggerRedactedValue
            )
            .join('/');
    }

    private extractClientIP(request: IRequestApp): string {
        if (request.ip) {
            return request.ip;
        }

        if (request.socket?.remoteAddress) {
            return request.socket.remoteAddress;
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

    private serializeRoute(request: IRequestApp): string {
        const routePath: unknown = request.route?.path;
        if (typeof routePath === 'string') {
            return `${request.baseUrl}${routePath}`;
        }

        return this.maskUrl(request.originalUrl ?? request.url);
    }

    private serializeParams(
        params: Record<string, string> | undefined
    ): Record<string, string> {
        return Object.fromEntries(
            Object.keys(params ?? {}).map(key => [key, LoggerRedactedValue])
        );
    }

    private serializeUser(request: IRequestApp): string | null {
        return (request.user as unknown as { userId: string })?.userId ?? null;
    }

    getRequestId(request: IRequestApp): string {
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

    sanitizeMessage(message: unknown): unknown {
        if (typeof message === 'string') {
            return stripAnsi(message)
                .replaceAll(/[~→]/g, '')
                .replaceAll(/^\s*\d+\s+/gm, '')
                .replaceAll(/\s+/g, ' ')
                .trim();
        }

        return message;
    }

    /**
     * Replaces every `LoggerSensitiveFields` key at any depth with `LoggerRedactedValue`. A value
     * nested `LoggerRedactMaxDepth` levels deep is replaced whole, so nothing past the cap is
     * written without redaction.
     */
    redactValue(value: unknown): unknown {
        return this.redactNested(value, 0);
    }

    maskUrl(url: string): string {
        try {
            const parsed = new URL(url);
            const maskedPath = this.maskPath(parsed.pathname);

            return `${parsed.origin}${maskedPath}`;
        } catch {
            return this.maskPath(url.split('?')[0].split('#')[0]);
        }
    }

    serializeRequest(request: IRequestApp): Record<string, unknown> {
        const route = this.serializeRoute(request);
        let referer: string | undefined;
        if (request.headers.referer) {
            referer = this.maskUrl(request.headers.referer);
        } else {
            referer = undefined;
        }
        const clientIp = this.extractClientIP(request);
        const user = this.serializeUser(request);
        const query = this.redactValue(request.query);
        const params = this.serializeParams(request.params);
        const headers = this.redactValue(request.headers);

        return {
            id: request.id,
            method: request.method,
            route,
            userAgent: request.headers['user-agent'],
            contentType: request.headers?.['content-type'],
            referer,
            remoteAddress: (request as unknown as { remoteAddress: string })
                .remoteAddress,
            remotePort: (request as unknown as { remotePort: number })
                .remotePort,
            ip: clientIp,
            user,
            query,
            params,
            headers,
        };
    }

    serializeResponse(response: Response): Record<string, unknown> {
        const headers = this.redactValue(response.getHeaders());

        return {
            httpCode: response.statusCode,
            contentLength: response.getHeader('content-length'),
            responseTime: response.getHeader('X-Response-Time'),
            headers,
        };
    }

    serializeError(error: Error): Record<string, unknown> {
        const message = this.sanitizeMessage(error.message);
        const defaultError = {
            type: error.name,
            message,
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
    }

    mapLevelToSeverity(level: number): string {
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
}
