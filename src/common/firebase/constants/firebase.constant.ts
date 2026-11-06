/** @public */
export const FirebaseInvalidTokenCodes = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/mismatched-credential',
];

/** @public */
export const FirebaseRetryableTokenCodes = [
    'messaging/server-unavailable',
    'messaging/internal-error',
    'messaging/message-rate-exceeded',
    'messaging/device-message-rate-exceeded',
    'messaging/unknown-error',
    'app/network-error',
    'app/network-timeout',
];

/** @public */
export const FirebaseMaxSendPushBatchSize = 500;

/** @public */
export const FirebaseMaxRateLimitPerDuration = 500000;

/** @public */
export const FirebaseRateLimitDurationInMs = 60000;

/** @public */
export const FirebasePrivateKeyPemMarker = '-----BEGIN';
