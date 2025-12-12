/**
 * Routes excluded from Sentry monitoring and detailed logging.
 * Supports wildcard patterns (*) for flexible matching.
 *
 * Pattern rules:
 * - Exact match: "/api/health" - matches only this exact path
 * - Trailing wildcard: "/api/health*" - matches /api/health and /api/health/anything
 * - Path wildcard: "/api/health/*" - matches only /api/health/something (requires slash)
 * - Full wildcard: "*" - matches everything (use with caution!)
 *
 * All patterns are case-insensitive and work with both full URLs and paths.
 */
export const LOGGER_EXCLUDED_ROUTES: string[] = [
    '/api/health',
    '/api/health/*',
    '/metrics',
    '/metrics/*',
    '/favicon.ico',
    '/docs',
    '/docs/*',
    '/',
] as const;

/**
 * Array of HTTP header names used to extract or identify request IDs.
 * These headers are checked in order to maintain request tracing across services.
 */
export const LOGGER_REQUEST_ID_HEADERS = [
    'x-correlation-id',
    'x-request-id',
] as const;

/**
 * Array of object paths that may contain sensitive data in request/response objects.
 * Used by the logger redaction system to identify where sensitive fields might be located.
 */
export const LOGGER_SENSITIVE_PATHS = [
    'req.body',
    'req.headers',
    'res.body',
    'res.headers',
    'request.body',
    'request.headers',
    'response.body',
    'response.headers',
];

/**
 * Array of field names containing sensitive data that should be masked in logs.
 * Includes authentication tokens, personal identification, financial data, and biometric information.
 */
export const LOGGER_SENSITIVE_FIELDS: string[] = [
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
];
