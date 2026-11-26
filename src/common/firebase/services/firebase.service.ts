import {
    FirebaseCredentialErrorCodes,
    FirebaseInvalidTokenCodes,
    FirebaseMaxSendPushBatchSize,
    FirebaseRetryableTokenCodes,
} from '@common/firebase/constants/firebase.constant';
import type {
    IFirebasePushPayload,
    IFirebasePushResult,
} from '@common/firebase/interfaces/firebase.interface';
import { FirebaseUtil } from '@common/firebase/utils/firebase.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as firebaseAdmin from 'firebase-admin';
import type { App as FirebaseApp } from 'firebase-admin/app';
import { Messaging, getMessaging } from 'firebase-admin/messaging';
import type { Notification } from 'firebase-admin/messaging';
import { FirebaseCredentialMismatchException } from '@common/firebase/exceptions/firebase.credential-mismatch.exception';
import { FirebaseInitializationFailedException } from '@common/firebase/exceptions/firebase.initialization-failed.exception';
import { FirebasePrivateKeyInvalidException } from '@common/firebase/exceptions/firebase.private-key-invalid.exception';
import { FirebaseUnavailableException } from '@common/firebase/exceptions/firebase.unavailable.exception';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);

    private readonly projectId: string | null;
    private readonly clientEmailAddress: string | null;
    private readonly hasPrivateKey: boolean;
    private readonly privateKey: string | null;

    private app: FirebaseApp | null = null;
    private messaging: Messaging | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
        private readonly firebaseUtil: FirebaseUtil
    ) {
        const projectId = this.configService.get<string | null>(
            'firebase.projectId'
        );
        const clientEmailAddress = this.configService.get<string | null>(
            'firebase.clientEmailAddress'
        );
        const privateKey = this.configService.get<string | null>(
            'firebase.privateKey'
        );
        const normalizedPrivateKey = this.firebaseUtil.normalizePrivateKey(
            privateKey ?? null
        );

        this.projectId = projectId ?? null;
        this.clientEmailAddress = clientEmailAddress ?? null;
        this.hasPrivateKey = !!privateKey;
        this.privateKey = normalizedPrivateKey;
    }

    private isInvalidTokenError(error: { code?: string } | null): boolean {
        return FirebaseInvalidTokenCodes.has(error?.code ?? '');
    }

    private isCredentialError(error: { code?: string } | null): boolean {
        return FirebaseCredentialErrorCodes.has(error?.code ?? '');
    }

    private isRetryableTokenError(error: { code?: string } | null): boolean {
        const code = error?.code ?? null;

        return code === null || FirebaseRetryableTokenCodes.has(code);
    }

    private buildMessageContent(payload: IFirebasePushPayload): {
        notification: Notification;
        data?: Record<string, string>;
    } {
        const imageUrl = payload.imageUrl ?? null;
        const data = payload.data ?? null;

        return {
            notification: {
                title: payload.title,
                body: payload.body,
                ...(imageUrl !== null && { imageUrl }),
            },
            ...(data !== null && { data }),
        };
    }

    async onModuleInit(): Promise<void> {
        if (
            !this.projectId ||
            !this.clientEmailAddress ||
            !this.hasPrivateKey
        ) {
            this.logger.warn(
                'Firebase credentials not configured. Push notifications will be disabled.'
            );

            return;
        }

        if (!this.privateKey) {
            throw new FirebasePrivateKeyInvalidException();
        }

        try {
            this.app = firebaseAdmin.initializeApp({
                credential: firebaseAdmin.cert({
                    projectId: this.projectId,
                    clientEmail: this.clientEmailAddress,
                    privateKey: this.privateKey,
                }),
            });

            this.messaging = getMessaging(this.app);
        } catch (error: unknown) {
            throw new FirebaseInitializationFailedException(error);
        }

        this.logger.log('Firebase Admin SDK initialized successfully');
    }

    isInitialized(): boolean {
        return !!this.app && !!this.messaging;
    }

    async sendPush(
        token: string,
        payload: IFirebasePushPayload
    ): Promise<boolean> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn('Firebase not initialized, skipping push');

            return false;
        }

        try {
            const content = this.buildMessageContent(payload);
            await this.messaging!.send({
                token,
                ...content,
            });

            return true;
        } catch (error: unknown) {
            let isInvalidToken = false;
            if (typeof error === 'object' && error !== null) {
                isInvalidToken = this.isInvalidTokenError(
                    error as { code?: string }
                );
            }

            if (isInvalidToken) {
                this.logger.warn(error, 'Invalid FCM token detected');
            } else {
                this.logger.error(error, 'Failed to send push notification');
            }

            return false;
        }
    }

    /** Throws FirebaseUnavailableException when every chunk's send rejects; a partial rejection returns that chunk's tokens as retryTokens. */
    async sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload
    ): Promise<IFirebasePushResult> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
            this.logger.warn('Firebase not initialized, skipping multicast');

            return {
                failureTokens: [],
                retryTokens: [],
                successCount: 0,
                failureCount: tokens.length,
            };
        }

        if (tokens.length === 0) {
            return {
                failureTokens: [],
                retryTokens: [],
                successCount: 0,
                failureCount: 0,
            };
        }

        const chunkedTokens = this.helperArrayService.chunk(
            tokens,
            FirebaseMaxSendPushBatchSize
        );

        const content = this.buildMessageContent(payload);
        const responses = await Promise.allSettled(
            chunkedTokens.map(chunk =>
                this.messaging!.sendEachForMulticast({
                    tokens: chunk,
                    ...content,
                })
            )
        );

        const rejections = responses.filter(
            (response): response is PromiseRejectedResult =>
                response.status === 'rejected'
        );
        const [firstRejection] = rejections;
        if (firstRejection && rejections.length === responses.length) {
            throw new FirebaseUnavailableException(firstRejection.reason);
        }

        let successCount = 0;
        let failureCount = 0;
        const failureTokens: string[] = [];
        const retryTokens: string[] = [];

        for (let chunkIndex = 0; chunkIndex < responses.length; chunkIndex++) {
            const response = responses[chunkIndex]!;
            const chunk = chunkedTokens[chunkIndex]!;

            if (response.status === 'fulfilled') {
                successCount += response.value.successCount;
                failureCount += response.value.failureCount;

                for (const [
                    tokenIndex,
                    resp,
                ] of response.value.responses.entries()) {
                    if (!resp.success) {
                        const error = (resp.error ?? null) as {
                            code?: string;
                        } | null;
                        const isCredentialError = this.isCredentialError(error);
                        if (isCredentialError) {
                            throw new FirebaseCredentialMismatchException(
                                error
                            );
                        }

                        const isInvalidToken = this.isInvalidTokenError(error);
                        const isRetryable = this.isRetryableTokenError(error);
                        if (isInvalidToken) {
                            failureTokens.push(chunk[tokenIndex]!);
                        } else if (isRetryable) {
                            retryTokens.push(chunk[tokenIndex]!);
                        }
                    }
                }
            } else {
                failureCount += chunk.length;
                retryTokens.push(...chunk);
            }
        }

        return { successCount, failureCount, failureTokens, retryTokens };
    }
}
