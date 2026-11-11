import type { Options } from 'pino-http';

export interface ILoggerDebugInfo {
    memory: {
        rss: number;
        heapUsed: number;
    };
    uptime: number;
}

export interface ILoggerError extends Error {
    status?: number;
    response?: { statusCode?: number };
}

export interface ILoggerMixin {
    level: number;
    requestId: string | null;
    correlationId: string | null;
}

export type ILoggerTransport = NonNullable<Options['transport']>;
