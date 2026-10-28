import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageService } from '@common/message/services/message.service';
import type {
    INotificationPushCleanupStaleTokensResult,
    INotificationPushCleanupTokensResult,
} from '@modules/notification/interfaces/notification.interface';

/** Removes the notification tokens Firebase rejected and the ones that went stale. */
@Injectable()
export class NotificationPushMaintenanceDomain {
    private readonly staleTokenThresholdInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly deviceDomain: DeviceDomain,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly messageService: MessageService
    ) {
        this.staleTokenThresholdInMs = this.configService.get<number>(
            'notification.push.staleTokenThresholdInMs'
        )!;
        this.encryptionSecretKey = this.configService.get<string>(
            'app.encryptionSecretKey'
        )!;
    }

    async processCleanupTokens(
        userId: string,
        encryptedFailureTokens: string[]
    ): Promise<INotificationPushCleanupTokensResult> {
        const failureTokens = encryptedFailureTokens.map(encrypted =>
            this.helperEncryptionService.aes256Decrypt(
                encrypted,
                this.encryptionSecretKey,
                NotificationPayloadEncryptionPurpose,
                userId
            )
        );
        const countRemovedTokens =
            await this.deviceDomain.cleanupNotificationTokens(
                userId,
                failureTokens
            );

        const message = this.messageService.setMessage(
            'notification.queue.push.cleanupTokens'
        );

        return {
            message,
            countRequestedTokens: failureTokens.length,
            countRemovedTokens,
        };
    }

    async processCleanupStaleTokens(): Promise<INotificationPushCleanupStaleTokensResult> {
        const countRemovedTokens =
            await this.deviceDomain.cleanupStaleNotificationTokens(
                this.staleTokenThresholdInMs
            );

        const message = this.messageService.setMessage(
            'notification.queue.push.cleanupStaleTokens'
        );

        return {
            message,
            countRemovedTokens,
        };
    }
}
