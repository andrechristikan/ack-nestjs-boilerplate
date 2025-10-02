export interface LoggerDebugInfo {
    memory: {
        rss: number;
        heapUsed: number;
    };
    uptime: number;
}
