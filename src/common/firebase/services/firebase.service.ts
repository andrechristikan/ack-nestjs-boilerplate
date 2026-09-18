import {
    FirebaseInvalidTokenCodes,
    FirebaseMaxSendPushBatchSize,
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

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);

    private readonly projectId: string | null;
    private readonly clientEmail: string | null;
    private privateKey: string | null;

    private app: FirebaseApp | null = null;
    private messaging: Messaging | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
        private readonly firebaseUtil: FirebaseUtil
    ) {
        this.projectId = this.configService.get<string | null>(
            'firebase.projectId'
        )!;
        this.clientEmail = this.configService.get<string | null>(
            'firebase.clientEmail'
        )!;

        const privateKey = this.configService.get<string | null>(
            'firebase.privateKey'
        )!;
        this.privateKey = this.firebaseUtil.normalizePrivateKey(privateKey);
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
                credential: firebaseAdmin.cert({
                    projectId: this.projectId,
                    clientEmail: this.clientEmail,
                    privateKey: this.privateKey,
                }),
            });

            this.messaging = getMessaging(this.app);

            this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error: unknown) {
            this.logger.error(error, 'Failed to initialize Firebase Admin SDK');
        }
    }

    isInitialized(): boolean {
        return !!this.app && !!this.messaging;
    }

    private isInvalidTokenError(error: { code?: string } | null): boolean {
        return FirebaseInvalidTokenCodes.includes(error?.code ?? '');
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
            await this.messaging!.send({
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

    async sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload,
        chunkSize: number = FirebaseMaxSendPushBatchSize
    ): Promise<IFirebasePushResult> {
        const isInitialized = this.isInitialized();
        if (!isInitialized) {
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

        const chunkedTokens = this.helperArrayService.chunk(tokens, chunkSize);

        const promises = chunkedTokens.map(chunk =>
            this.messaging!.sendEachForMulticast({
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
                        const isInvalidToken = this.isInvalidTokenError(
                            resp.error as { code?: string }
                        );
                        if (isInvalidToken) {
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
