import {
    FirebaseInvalidTokenCodes,
    FirebaseMaxSendPushBatchSize,
} from '@common/firebase/constants/firebase.constant';
import {
    IFirebasePushPayload,
    IFirebasePushResult,
} from '@common/firebase/interfaces/firebase.interface';
import { HelperService } from '@common/helper/services/helper.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey } from 'crypto';
import * as firebaseAdmin from 'firebase-admin';
import { App as FirebaseApp } from 'firebase-admin/app';
import { Messaging } from 'firebase-admin/lib/messaging/messaging';

/**
 * Service responsible for managing Firebase Admin SDK initialization
 * and sending push notifications via Firebase Cloud Messaging (FCM).
 *
 * Supports both single-device and multicast push notification delivery.
 * The service gracefully degrades when Firebase credentials are not configured.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);

    private readonly projectId?: string;
    private readonly clientEmail?: string;
    private readonly privateKeyRaw?: string;

    private app: FirebaseApp | null = null;
    private messaging: Messaging | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.projectId = this.configService.get<string>('firebase.projectId');
        this.clientEmail = this.configService.get<string>(
            'firebase.clientEmail'
        );
        this.privateKeyRaw = this.configService.get<string>('firebase.privateKey');
    }

    /**
     * Initializes the Firebase Admin SDK on module startup.
     *
     * If any required credential (`projectId`, `clientEmail`, `privateKey`) is missing,
     * a warning is logged and initialization is skipped.
     * Errors during SDK initialization are caught and logged without throwing.
     */
    async onModuleInit(): Promise<void> {
        if (!this.projectId || !this.clientEmail || !this.privateKeyRaw) {
            this.logger.warn(
                'Firebase credentials not configured. Push notifications will be disabled.'
            );

            return;
        }

        try {
            const privateKeyBuffer = Buffer.from(this.privateKeyRaw, 'base64');
            const privateKey = createPrivateKey({
                key: privateKeyBuffer,
                format: 'der',
                type: 'pkcs8',
            }).export({ type: 'pkcs8', format: 'pem' }) as string;

            this.app = firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert({
                    projectId: this.projectId,
                    clientEmail: this.clientEmail,
                    privateKey,
                }),
            });

            this.messaging = firebaseAdmin.messaging(this.app);

            this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to initialize Firebase Admin SDK');
        }
    }

    /**
     * Checks whether the Firebase Admin SDK has been successfully initialized.
     *
     * @returns `true` if both the Firebase app and messaging instances are available, otherwise `false`.
     */
    isInitialized(): boolean {
        return !!this.app && !!this.messaging;
    }

    /**
     * Determines whether a Firebase error is caused by an invalid or expired FCM token.
     *
     * @param error - The error object returned by Firebase, optionally containing a `code` property.
     * @returns `true` if the error code matches a known invalid token error code, otherwise `false`.
     */
    private isInvalidTokenError(error?: { code?: string }): boolean {
        return FirebaseInvalidTokenCodes.includes(error?.code);
    }

    /**
     * Sends a push notification to a single device via FCM.
     *
     * If Firebase is not initialized, the operation is skipped and `false` is returned.
     * Invalid token errors are logged as warnings; all other errors are logged as errors.
     *
     * @param token - The FCM registration token of the target device.
     * @param payload - The push notification payload containing title, body, image URL, and custom data.
     * @returns `true` if the notification was sent successfully, otherwise `false`.
     */
    async sendPush(
        token: string,
        payload: IFirebasePushPayload
    ): Promise<boolean> {
        if (!this.isInitialized()) {
            this.logger.warn('Firebase not initialized, skipping push');

            return false;
        }

        try {
            await this.messaging.send({
                token,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            });

            return true;
        } catch (error: unknown) {
            if (
                typeof error === 'object' &&
                error !== null &&
                this.isInvalidTokenError(error as { code?: string })
            ) {
                this.logger.warn(error, 'Invalid FCM token detected');
            } else {
                this.logger.error(error, 'Failed to send push notification');
            }

            return false;
        }
    }

    /**
     * Sends a push notification to multiple devices via FCM using batch multicast.
     *
     * Tokens are split into chunks to respect FCM's batch size limit.
     * Each chunk is sent concurrently via `Promise.allSettled`, so a failure in one chunk
     * does not affect others. Invalid tokens are collected and returned in `failureTokens`.
     *
     * If Firebase is not initialized, the operation is skipped and all tokens are counted as failures.
     * If the token list is empty, an empty result is returned immediately.
     *
     * @param tokens - Array of FCM registration tokens to send the notification to.
     * @param payload - The push notification payload containing title, body, image URL, and custom data.
     * @param chunkSize - Number of tokens per batch. Must be between 1 and `FirebaseMaxSendPushBatchSize`. Defaults to `FirebaseMaxSendPushBatchSize`.
     * @returns An object containing `successCount`, `failureCount`, and `failureTokens` (invalid tokens).
     * @throws {Error} If `chunkSize` is outside the valid range.
     */
    async sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload,
        chunkSize: number = FirebaseMaxSendPushBatchSize
    ): Promise<IFirebasePushResult> {
        if (!this.isInitialized()) {
            this.logger.warn('Firebase not initialized, skipping multicast');

            return {
                failureTokens: [],
                successCount: 0,
                failureCount: tokens.length,
            };
        }

        if (tokens.length === 0) {
            return {
                failureTokens: [],
                successCount: 0,
                failureCount: 0,
            };
        }

        if (chunkSize < 1 || chunkSize > FirebaseMaxSendPushBatchSize) {
            throw new Error(
                `chunkSize must be between 1 and ${FirebaseMaxSendPushBatchSize}`
            );
        }

        const chunkedTokens = this.helperService.arrayChunk(tokens, chunkSize);

        const promises = chunkedTokens.map(chunk =>
            this.messaging.sendEachForMulticast({
                tokens: chunk,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            })
        );

        const responses = await Promise.allSettled(promises);

        let successCount = 0;
        let failureCount = 0;
        const failureTokens: string[] = [];

        for (let chunkIndex = 0; chunkIndex < responses.length; chunkIndex++) {
            const response = responses[chunkIndex];
            const chunk = chunkedTokens[chunkIndex];

            if (response.status === 'fulfilled') {
                successCount += response.value.successCount;
                failureCount += response.value.failureCount;

                for (const [
                    tokenIndex,
                    resp,
                ] of response.value.responses.entries()) {
                    if (!resp.success && resp.error) {
                        if (
                            this.isInvalidTokenError(
                                resp.error as { code?: string }
                            )
                        ) {
                            failureTokens.push(chunk[tokenIndex]);
                        }
                    }
                }
            } else {
                failureCount += chunk.length;
            }
        }

        return { successCount, failureCount, failureTokens };
    }
}
