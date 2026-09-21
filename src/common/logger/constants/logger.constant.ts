/**
 * Default context tag for log entries with no explicit context.
 * @public
 */
export const LoggerAutoContext = 'LoggerAutoContext';

/**
 * Routes excluded from request auto-logging and from Sentry events and traces (hello, health, metrics, favicon, docs, root). Supports wildcards.
 * @public
 */
export const LoggerExcludedRoutes: string[] = [
    '/api/public/hello',
    '/api/public/hello/*',
    '/api/system/health',
    '/api/system/health/*',
    '/metrics',
    '/metrics/*',
    '/favicon.ico',
    '/docs',
    '/docs/*',
    '/',
];

/**
 * Request-ID headers checked in order for cross-service correlation.
 * @public
 */
export const LoggerRequestIdHeaders = [
    'x-correlation-id',
    'x-request-id',
] as const;

/**
 * Request and response object paths whose `LoggerSensitiveFields` are redacted from logs.
 * @public
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
 * @public
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
    'set-cookie',
    'referer',
    'inviteToken',
    'challengeToken',
    'backupCode',
    'code',
    'pendingSecret',
    'encryptedPassword',
    'encryptedLink',
    'encryptedInviteAcceptLink',
    'encryptedJoinRequestReviewLink',
    'link',
];

/**
 * Replacement written in place of a redacted value or a masked URL path segment.
 * @public
 */
export const LoggerRedactedValue = '[REDACTED]';

/**
 * URL path segment kept verbatim when a URL is masked: a route parameter name, a version segment, or a static kebab-case word. Every other segment is replaced with `LoggerRedactedValue`.
 * @public
 */
export const LoggerUrlStaticSegmentRegex =
    /^(?::[A-Za-z]+|v\d+|\d*[a-z][a-z-]*)$/;

/**
 * Sentry span attributes and breadcrumb data keys holding a URL, masked before an event leaves the process.
 * @public
 */
export const LoggerSentryUrlKeys: string[] = [
    'url',
    'to',
    'from',
    'url.full',
    'url.path',
    'http.url',
    'http.target',
    'http.route',
    'http.request.header.referer',
];

/**
 * Sentry span attributes holding a captured request body, redacted with `LoggerSensitiveFields` before an event leaves the process.
 * @public
 */
export const LoggerSentryBodyKeys: string[] = ['http.request.body.data'];

/**
 * Sentry span attribute prefixes naming an HTTP header; the header name follows the prefix with `-` written as `_`.
 * @public
 */
export const LoggerSentryHeaderKeyPrefixes: string[] = [
    'http.request.header.',
    'http.response.header.',
];

/**
 * Nesting depth at which a Sentry request body stops being walked; anything deeper is replaced with `LoggerRedactedValue`.
 * @public
 */
export const LoggerSentryRedactMaxDepth = 10;

/**
 * Nesting depth at which a log record value stops being walked; anything deeper is replaced with `LoggerRedactedValue`.
 * @public
 */
export const LoggerRedactMaxDepth = 5;

/**
 * Array length kept when a log record value is walked; the remaining items are replaced with one truncation marker.
 * @public
 */
export const LoggerRedactMaxArrayLength = 10;

/**
 * One `key=value` pair of an `application/x-www-form-urlencoded` body, with no whitespace, quotes, or braces.
 * @public
 */
export const LoggerUrlEncodedPairRegex = /^[^&=\s"{}]+=[^&\s"{}]*$/;

/**
 * Leading HTTP method of a span name such as `GET /api/v1/user`.
 * @public
 */
export const LoggerHttpMethodPrefixRegex = /^[A-Z]+ (?=\/|https?:\/\/)/;

/**
 * Sentry span attributes and breadcrumb data keys holding a URL query string or fragment, dropped before an event leaves the process.
 * @public
 */
export const LoggerSentryQueryKeys: string[] = [
    'url.query',
    'url.fragment',
    'http.query',
    'http.fragment',
];
