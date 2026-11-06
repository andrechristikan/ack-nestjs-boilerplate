import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserProfileDomain } from '@modules/user/domains/user.profile.domain';
import { EnumUserProcess } from '@modules/user/enums/user.enum';
import type { IUserDeletePhotoPayload } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';

@Injectable()
export class UserProcessorService {
    constructor(
        private readonly userProfileDomain: UserProfileDomain,
        private readonly userDomain: UserDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly sessionQueue: SessionQueue,
        private readonly databaseService: DatabaseService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async processDeletePhoto(
        job: Job<IUserDeletePhotoPayload, unknown, EnumUserProcess>
    ): Promise<IQueueResponse> {
        const { key, access: storedAccess } = job.data;
        const access =
            Object.values(EnumAwsS3Accessibility).find(
                value => value === storedAccess
            ) ?? null;
        if (access === null) {
            const message = this.messageService.setMessage(
                'user.queue.error.photoAccessInvalid',
                { properties: { key, access: storedAccess } }
            );

            throw new QueueException(message, true);
        }

        await this.userProfileDomain.deletePhotoObject(key, access);

        const message = this.messageService.setMessage(
            'user.queue.deletePhoto'
        );

        return {
            message,
            key,
        };
    }

    async lockout(userId: string): Promise<IQueueResponse> {
        const now = this.helperDateService.create();
        const revoked = await this.databaseService.withTransaction(async tx => {
            const isDeactivated =
                await this.userDomain.deactivateForMaxAttemptInTx(tx, userId);
            if (!isDeactivated) {
                return [];
            }

            const sessions = await this.sessionDomain.revokeActiveByUserInTx(
                tx,
                userId,
                userId,
                now
            );
            await this.deviceDomain.revokeAllByUserInTx(
                tx,
                userId,
                userId,
                now
            );

            return sessions;
        });
        await this.sessionQueue.purgeLogins(userId, revoked);

        const message = this.messageService.setMessage('user.queue.lockout');

        return {
            message,
            countSessions: revoked.length,
        };
    }

    processUnknown(process: string): never {
        const message = this.messageService.setMessage(
            'user.queue.error.unknownProcess',
            { properties: { process } }
        );

        throw new QueueException(message, true);
    }
}
