/**
 * Array of route patterns excluded from logging.
 * Contains health checks, metrics, documentation, and static asset routes.
 */
export const LOGGER_EXCLUDED_ROUTES: string[] = [
    '/api/health*',
    '/metrics*',
    '/favicon.ico',
    '/docs*',
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
