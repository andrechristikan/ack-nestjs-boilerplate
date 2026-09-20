/**
 * Pino log levels, also the method names on `Sentry.logger`.
 * @public
 */
export enum EnumLoggerLevel {
    fatal = 'fatal',
    error = 'error',
    warn = 'warn',
    info = 'info',
    debug = 'debug',
    trace = 'trace',
}

/**
 * Severity scale written to the pino `severity` field.
 * @public
 */
export enum EnumLoggerSeverity {
    critical = 'critical',
    error = 'error',
    warning = 'warning',
    info = 'info',
    debug = 'debug',
    trace = 'trace',
}
