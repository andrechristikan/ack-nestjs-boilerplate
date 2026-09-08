/** Overall status of a health check; `shuttingDown` travels on the wire as `shutting_down`. */
export enum EnumHealthStatus {
    error = 'error',
    ok = 'ok',
    degraded = 'degraded',
    shuttingDown = 'shutting_down',
}
