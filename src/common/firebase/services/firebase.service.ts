import {
    IFirebaseConfig,
    IFirebasePushPayload,
    IFirebasePushResult,
} from '@common/firebase/interfaces/firebase.interface';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private app: admin.app.App | null = null;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit(): Promise<void> {
        const config = this.configService.get<IFirebaseConfig>('firebase');

        if (!config?.projectId || !config?.clientEmail || !config?.privateKey) {
            this.logger.warn(
                'Firebase credentials not configured. Push notifications will be disabled.'
            );
            return;
        }

        try {
            this.app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: config.projectId,
                    clientEmail: config.clientEmail,
                    privateKey: config.privateKey,
                }),
            });
            this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error: unknown) {
            this.logger.error('Failed to initialize Firebase Admin SDK', error);
        }
    }

    isInitialized(): boolean {
        return this.app !== null;
    }

    async sendPush(
        token: string,
        payload: IFirebasePushPayload
    ): Promise<boolean> {
        if (!this.app) {
            this.logger.warn('Firebase not initialized, skipping push');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                token,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            };

            await admin.messaging().send(message);
            return true;
        } catch (error: unknown) {
            this.handleSendError(error, token);
            return false;
        }
    }

    async sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload
    ): Promise<IFirebasePushResult> {
        if (!this.app) {
            this.logger.warn('Firebase not initialized, skipping multicast');
            return {
                successCount: 0,
                failureCount: tokens.length,
                invalidTokens: [],
            };
        }

        if (tokens.length === 0) {
            return {
                successCount: 0,
                failureCount: 0,
                invalidTokens: [],
            };
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    imageUrl: payload.imageUrl,
                },
                data: payload.data,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            const invalidTokens: string[] = [];

            response.responses.forEach((resp, index) => {
                if (!resp.success && this.isInvalidTokenError(resp.error)) {
                    invalidTokens.push(tokens[index]);
                }
            });

            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
                invalidTokens,
            };
        } catch (error: unknown) {
            this.logger.error('Failed to send multicast push notification', error);
            return {
                successCount: 0,
                failureCount: tokens.length,
                invalidTokens: [],
            };
        }
    }

    private handleSendError(error: unknown, token: string): void {
        const fcmError = error as admin.FirebaseError;
        if (this.isInvalidTokenError(fcmError)) {
            this.logger.warn({
                message: 'Invalid FCM token detected',
                token: token.substring(0, 20) + '...',
                errorCode: fcmError?.code,
            });
        } else {
            this.logger.error('Failed to send push notification', error);
        }
    }

    private isInvalidTokenError(error?: admin.FirebaseError): boolean {
        const invalidTokenCodes = [
            'messaging/invalid-registration-token',
            'messaging/registration-token-not-registered',
            'messaging/invalid-argument',
        ];
        return Boolean(error?.code && invalidTokenCodes.includes(error.code));
    }
}
