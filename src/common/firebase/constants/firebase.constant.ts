/**
 * FCM error codes marking a token as invalid/unregistered; such tokens should be purged.
 */
export const FirebaseInvalidTokenCodes = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
];

/**
 * FCM hard limit of tokens per `sendEachForMulticast` call.
 */
export const FirebaseMaxSendPushBatchSize = 500;

/**
 * Max push messages per rate-limit window, kept safely under FCM's 600k/min project limit.
 */
export const FirebaseMaxRateLimitPerDuration = 500000;

/**
 * Rate-limit window in ms (1 minute), paired with `FirebaseMaxRateLimitPerDuration`.
 */
export const FirebaseRateLimitDurationInMs = 60000;

/**
 * Marker whose presence means the raw private key is already PEM framed.
 */
export const FirebasePrivateKeyPemMarker = '-----BEGIN';
