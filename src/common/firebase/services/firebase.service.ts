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
import {
    BatchResponse,
    MulticastMessage,
} from 'firebase-admin/lib/messaging/messaging-api';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);

    private readonly projectId: string;
    private readonly clientEmail: string;
    private readonly privateKey: string;

    private app: FirebaseApp | null = null;
    private messaging: Messaging | null = null;

    isInitializedFlag = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperService: HelperService
    ) {
        this.projectId = this.configService.get<string>('firebase.projectId');
        this.clientEmail = this.configService.get<string>(
            'firebase.clientEmail'
        );

        const privateKeyBuffer = Buffer.from(
            this.configService.get<string>('firebase.privateKey'),
            'base64'
        );
        this.privateKey = createPrivateKey({
            key: privateKeyBuffer,
            format: 'der',
            type: 'pkcs8',
        }).export({ type: 'pkcs8', format: 'pem' }) as string;
    }

    async onModuleInit(): Promise<void> {
        if (!this.projectId || !this.clientEmail || !this.privateKey) {
            this.logger.warn(
                'Firebase credentials not configured. Push notifications will be disabled.'
            );

            return;
        }

        try {
            this.app = firebaseAdmin.initializeApp({
                credential: firebaseAdmin.credential.cert({
                    projectId: this.projectId,
                    clientEmail: this.clientEmail,
                    privateKey: this.privateKey,
                }),
            });

            this.messaging = firebaseAdmin.messaging(this.app);

            this.isInitializedFlag = true;

            this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to initialize Firebase Admin SDK');
        }
    }

    private isInitialized(): boolean {
        return !!this.app || !!this.messaging;
    }

    private isInvalidTokenError(error?: { code?: string }): boolean {
        return FirebaseInvalidTokenCodes.includes(error?.code);
    }

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

    async sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload,
        chunkSize: number
    ): Promise<IFirebasePushResult> {
        if (!this.isInitialized() || tokens.length === 0) {
            if (!this.isInitialized()) {
                this.logger.warn(
                    'Firebase not initialized, skipping multicast'
                );
            }

            return {
                successCount: 0,
                failureCount: tokens.length,
                invalidTokens: [],
            };
        } else if (chunkSize < 1) {
            throw new Error('chunkSize must be at least 1');
        } else if (chunkSize > FirebaseMaxSendPushBatchSize) {
            throw new Error(
                `chunkSize cannot be greater than ${FirebaseMaxSendPushBatchSize}`
            );
        }

        try {
            const chunkedTokens = this.helperService.arrayChunk(
                tokens,
                chunkSize
            );

            let successCount = 0;
            let failureCount = 0;
            let invalidTokens: string[] = [];
            const messages: Promise<BatchResponse>[] = [];

            for (const chunk of chunkedTokens) {
                const message: MulticastMessage = {
                    tokens: chunk,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        imageUrl: payload.imageUrl,
                    },
                    data: payload.data,
                };

                messages.push(this.messaging.sendEachForMulticast(message));
            }

            const responses: PromiseSettledResult<BatchResponse>[] =
                await Promise.allSettled(messages);

            for (const response of responses) {
                if (response.status === 'fulfilled') {
                    successCount += response.value.successCount;

                    if (response.value.failureCount !== 0) {
                        failureCount += response.value.failureCount;

                        const invalidTokensInChunk = response.value.responses
                            .map((resp, index) => {
                                if (
                                    !resp.success &&
                                    resp.error &&
                                    this.isInvalidTokenError(
                                        resp.error as { code?: string }
                                    )
                                ) {
                                    return chunkedTokens[
                                        responses.indexOf(response)
                                    ][index];
                                }

                                return null;
                            })
                            .filter((token): token is string => token !== null);

                        invalidTokens =
                            invalidTokens.concat(invalidTokensInChunk);
                    }
                } else {
                    failureCount += chunkSize;
                }
            }

            return {
                successCount,
                failureCount,
                invalidTokens,
            };
        } catch (error: unknown) {
            this.logger.error(
                'Failed to send multicast push notification',
                error
            );

            return {
                successCount: 0,
                failureCount: tokens.length,
                invalidTokens: [],
            };
        }
    }
}
