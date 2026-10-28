import type { Params } from 'nestjs-pino';
import type { Options } from 'pino-http';

export interface ILoggerDebugInfo {
    memory: {
        rss: number;
        heapUsed: number;
    };
    uptime: number;
}

export interface ILoggerMixin {
    level: number;
    requestId: string | null;
    correlationId: string | null;
}

export type ILoggerTransport = NonNullable<Options['transport']>;

export type ILoggerPinoHttp = NonNullable<Params['pinoHttp']>;
