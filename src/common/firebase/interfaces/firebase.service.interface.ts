import {
    IFirebasePushPayload,
    IFirebasePushResult,
} from '@common/firebase/interfaces/firebase.interface';

/**
 * Contract for the FirebaseService.
 * Defines operations for Firebase Admin SDK lifecycle management
 * and push notification delivery via Firebase Cloud Messaging (FCM).
 */
export interface IFirebaseService {
    /**
     * Checks whether the Firebase Admin SDK has been successfully initialized.
     *
     * @returns `true` if both the Firebase app and messaging instances are available, otherwise `false`.
     */
    isInitialized(): boolean;

    /**
     * Sends a push notification to a single device via FCM.
     *
     * If Firebase is not initialized, the operation is skipped and `false` is returned.
     *
     * @param {string} token - The FCM registration token of the target device.
     * @param {IFirebasePushPayload} payload - The push notification payload.
     * @returns {Promise<boolean>} `true` if the notification was sent successfully, otherwise `false`.
     */
    sendPush(token: string, payload: IFirebasePushPayload): Promise<boolean>;

    /**
     * Sends a push notification to multiple devices via FCM using batch multicast.
     *
     * Tokens are split into chunks to respect FCM's batch size limit.
     *
     * @param {string[]} tokens - Array of FCM registration tokens.
     * @param {IFirebasePushPayload} payload - The push notification payload.
     * @param {number} [chunkSize] - Number of tokens per batch. Defaults to `FirebaseMaxSendPushBatchSize`.
     * @returns {Promise<IFirebasePushResult>} Result containing success/failure counts and invalid tokens.
     */
    sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload,
        chunkSize?: number
    ): Promise<IFirebasePushResult>;
}
