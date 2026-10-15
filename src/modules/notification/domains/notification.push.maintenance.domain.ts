import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationPayloadEncryptionPurpose } from '@modules/notification/constants/notification.constant';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Removes the notification tokens Firebase rejected and the ones that went stale. */
@Injectable()
export class NotificationPushMaintenanceDomain {
    private readonly staleTokenThresholdInMs: number;
    private readonly encryptionSecretKey: string;

    constructor(
        private readonly deviceDomain: DeviceDomain,
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService
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
    ): Promise<IQueueResponse> {
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

        return {
            message: `Processed token cleanup for invalid tokens`,
            countRequestedTokens: failureTokens.length,
            countRemovedTokens,
        };
    }

    async processCleanupStaleTokens(): Promise<IQueueResponse> {
        const countRemovedTokens =
            await this.deviceDomain.cleanupStaleNotificationTokens(
                this.staleTokenThresholdInMs
            );

        return {
            message: `Processed stale token cleanup`,
            countRemovedTokens,
        };
    }
}
