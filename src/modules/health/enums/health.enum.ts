/**
 * Overall status of a health check; `shuttingDown` travels on the wire as `shutting_down`.
 * @public
 */
export enum EnumHealthStatus {
    error = 'error',
    ok = 'ok',
    degraded = 'degraded',
    shuttingDown = 'shutting_down',
}

/**
 * Status of a single Terminus indicator inside a check's info, error and details maps.
 * @public
 */
export enum EnumHealthIndicatorStatus {
    up = 'up',
    down = 'down',
}
