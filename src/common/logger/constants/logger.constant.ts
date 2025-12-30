/**
 * Default context string used for logger entries when no explicit context is provided.
 * Used to tag log messages with a generic context for easier filtering and searching.
 */
export const LoggerAutoContext = 'LoggerAutoContext';

/**
 * List of routes to be excluded from logging and monitoring.
 * These routes are typically health checks, documentation, or metrics endpoints
 * that do not require detailed logging or error tracking.
 *
 * Supports wildcard patterns for flexible matching.
 */
export const LoggerExcludedRoutes: string[] = [
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
 * List of HTTP header names used to extract or identify request IDs for tracing.
 * Checked in order to maintain request correlation across distributed systems.
 */
export const LoggerRequestIdHeaders = [
    'x-correlation-id',
    'x-request-id',
] as const;

/**
 * List of object paths in request/response objects that may contain sensitive data.
 * Used by the logger redaction system to identify where sensitive fields might be located.
 */
export const LoggerSensitivePaths = [
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
 * List of field names considered sensitive and subject to redaction in logs.
 * Includes authentication, credential, and personal data fields.
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
