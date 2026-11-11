/** @public */
export const LoggerAutoContext = 'LoggerAutoContext';

/** @public */
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

/** @public */
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
    'codeVerifier',
    'pendingSecret',
    'encryptedPassword',
    'encryptedLink',
    'encryptedInviteAcceptLink',
    'encryptedJoinRequestReviewLink',
    'link',
];

/** @public */
export const LoggerRedactedValue = '[REDACTED]';

/** @public */
export const LoggerUrlStaticSegmentRegex =
    /^(?::[A-Za-z]+|v\d+|\d*[a-z][a-z-]*)$/;

/** @public */
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

/** @public */
export const LoggerSentryBodyKeys: string[] = ['http.request.body.data'];

/** @public */
export const LoggerSentryHeaderKeyPrefixes: string[] = [
    'http.request.header.',
    'http.response.header.',
];

/** @public */
export const LoggerSentryRedactMaxDepth = 10;

/** @public */
export const LoggerRedactMaxDepth = 5;

/** @public */
export const LoggerRedactMaxArrayLength = 10;

/** @public */
export const LoggerUrlEncodedPairRegex = /^[^&=\s"{}]+=[^&\s"{}]*$/;

/** @public */
export const LoggerHttpMethodPrefixRegex = /^[A-Z]+ (?=\/|https?:\/\/)/;

/** @public */
export const LoggerSentryQueryKeys: string[] = [
    'url.query',
    'url.fragment',
    'http.query',
    'http.fragment',
];
