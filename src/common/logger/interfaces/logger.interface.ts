/**
 * Debug information attached to log entries in non-production environments.
 * Contains process memory usage and uptime for diagnostics.
 */
export interface LoggerDebugInfo {
    /** Memory usage in megabytes */
    memory: {
        /** Resident Set Size in MB */
        rss: number;
        /** Heap used in MB */
        heapUsed: number;
    };
    /** Process uptime in seconds */
    uptime: number;
}
