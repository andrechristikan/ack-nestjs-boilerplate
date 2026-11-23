/** @public */
export const FirebaseInvalidTokenCodes: ReadonlySet<string> = new Set([
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
]);

/** @public */
export const FirebaseCredentialErrorCodes: ReadonlySet<string> = new Set([
    'messaging/mismatched-credential',
]);

/** @public */
export const FirebaseRetryableTokenCodes: ReadonlySet<string> = new Set([
    'messaging/server-unavailable',
    'messaging/internal-error',
    'messaging/message-rate-exceeded',
    'messaging/device-message-rate-exceeded',
    'messaging/unknown-error',
    'app/network-error',
    'app/network-timeout',
]);

/** @public */
export const FirebaseMaxSendPushBatchSize = 500;

/** @public */
export const FirebaseMaxRateLimitPerDuration = 500000;

/** @public */
export const FirebaseRateLimitDurationInMs = 60000;

/** @public */
export const FirebasePrivateKeyPemMarker = '-----BEGIN';

/** @public */
export const FirebaseEscapedNewlineRegex = /\\n/g;
