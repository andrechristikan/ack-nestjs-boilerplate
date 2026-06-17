/**
 * Default context tag for log entries with no explicit context.
 */
export const LoggerAutoContext = 'LoggerAutoContext';

/**
 * Routes excluded from auto-logging (health, docs, metrics). Supports wildcards.
 */
export const LoggerExcludedRoutes: string[] = [
    '/api/hello',
    '/api/hello/*',
    '/api/health',
    '/api/health/*',
    '/metrics',
    '/metrics/*',
    '/favicon.ico',
    '/docs',
    '/docs/*',
    '/',
];

/**
 * Request-ID headers checked in order for cross-service correlation.
 */
export const LoggerRequestIdHeaders = [
    'x-correlation-id',
    'x-request-id',
] as const;

/**
 * Object paths scanned for sensitive fields during log redaction.
 */
export const LoggerSensitivePaths = [
    'req.body',
    'req.headers',
    'req.query',
    'req.params',
    'res.body',
    'res.headers',
    'request.body',
    'request.headers',
    'request.query',
    'request.params',
    'response.body',
    'response.headers',
];

/**
 * Field names redacted from logs (credentials, tokens, PII).
 */
export const LoggerSensitiveFields: string[] = [
    'password',
    'newPassword',
    'oldPassword',
    'token',
    'authorization',
    'bearer',
    'secret',
    'credential',
    'jwt',
    'x-api-key',
    'apiKey',
    'refreshToken',
    'accessToken',
    'sessionId',
    'privateKey',
    'secretKey',
    'otp',
    'recoveryCode',
    'location',
    'gps',
    'coordinates',
    'latitude',
    'longitude',
    'cookie',
    'cookies',
];
