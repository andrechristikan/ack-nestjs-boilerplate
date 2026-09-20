export interface ILoggerDebugInfo {
    memory: {
        rss: number;
        heapUsed: number;
    };
    uptime: number;
}
