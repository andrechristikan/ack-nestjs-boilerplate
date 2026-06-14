/**
 * FCM error codes that indicate a registration token is invalid or no longer registered.
 * Used to identify tokens that should be removed from persistent storage after a failed send.
 */
export const FirebaseInvalidTokenCodes = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
];

/**
 * Maximum number of FCM registration tokens that may be included in a single multicast batch request.
 * FCM enforces a hard limit of 500 tokens per `sendEachForMulticast` call.
 */
export const FirebaseMaxSendPushBatchSize = 500;

/**
 * Maximum number of push notifications that may be sent within a single rate-limit window.
 * Set to 500,000 to stay safely below FCM's documented per-project limit of 600,000 messages per minute.
 */
export const FirebaseMaxRateLimitPerDuration = 500000; // 500k is a safe number under 600k limit

/**
 * Duration of the FCM rate-limit window in milliseconds (60,000 ms = 1 minute).
 * Paired with `FirebaseMaxRateLimitPerDuration` to enforce per-minute throughput caps.
 */
export const FirebaseRateLimitDurationInMs = 60000;

/**
 * Number of days after which an FCM registration token is considered stale and eligible for cleanup.
 * Tokens that have not produced a successful delivery within this window should be removed.
 */
export const FirebaseStaleTokenThresholdInDays = 30;
