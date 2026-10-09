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
