/**
 * Payload for a Firebase Cloud Messaging push notification.
 */
export interface IFirebasePushPayload {
    /** Notification title displayed on the device. */
    title: string;

    /** Notification body text displayed on the device. */
    body: string;

    /** Arbitrary key-value pairs delivered alongside the notification as custom data. Not displayed to the user. */
    data?: Record<string, string>;

    /** URL of the image to display inside the notification, or undefined when no image is required. */
    imageUrl?: string;
}

/**
 * Aggregated outcome of a multicast push notification send operation.
 */
export interface IFirebasePushResult {
    /** Number of tokens to which the notification was delivered successfully. */
    successCount: number;

    /** Number of tokens for which delivery failed for any reason. */
    failureCount: number;

    /** FCM registration tokens that were identified as invalid or unregistered during the send attempt. */
    failureTokens: string[];
}
