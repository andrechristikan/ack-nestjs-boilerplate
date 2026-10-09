/**
 * FCM error codes marking a token as invalid/unregistered; such tokens should be purged.
 * @public
 */
export const FirebaseInvalidTokenCodes = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/mismatched-credential',
];

/**
 * FCM and Admin SDK error codes marking a transient send failure; the token stays valid and the send is retried.
 * @public
 */
export const FirebaseRetryableTokenCodes = [
    'messaging/server-unavailable',
    'messaging/internal-error',
    'messaging/message-rate-exceeded',
    'messaging/device-message-rate-exceeded',
    'messaging/unknown-error',
    'app/network-error',
    'app/network-timeout',
];

/**
 * FCM hard limit of tokens per `sendEachForMulticast` call.
 * @public
 */
export const FirebaseMaxSendPushBatchSize = 500;

/**
 * Max push messages per rate-limit window, kept safely under FCM's 600k/min project limit.
 * @public
 */
export const FirebaseMaxRateLimitPerDuration = 500000;

/**
 * Rate-limit window in ms (1 minute), paired with `FirebaseMaxRateLimitPerDuration`.
 * @public
 */
export const FirebaseRateLimitDurationInMs = 60000;

/**
 * Marker whose presence means the raw private key is already PEM framed.
 * @public
 */
export const FirebasePrivateKeyPemMarker = '-----BEGIN';
