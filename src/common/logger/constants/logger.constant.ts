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
    'cookie',
    'secret',
    'credential',
    'jwt',
    'x-api-key',
    'apiKey',
    'refreshToken',
    'accessToken',
    'sessionId',
    'set-cookie',
    'creditCard',
    'cardNumber',
    'cvv',
    'cvc',
    'ccv',
    'pin',
    'bankAccount',
    'accountNumber',
    'routingNumber',
    'expiryDate',
    'ssn',
    'passportNumber',
    'driverLicense',
    'nationalId',
    'taxId',
    'idNumber',
    'privateKey',
    'secretKey',
    'securityQuestion',
    'securityAnswer',
    'signature',
    'otp',
    'recoveryCode',
    'fingerprint',
    'faceId',
    'biometric',
    'location',
    'gps',
    'coordinates',
    'latitude',
    'longitude',
    'x-two-factor',
];
