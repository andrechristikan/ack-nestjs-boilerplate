import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import {
    EnumNotificationChannel,
    EnumNotificationType,
} from '@generated/prisma-client/client';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationCreateEntry,
    INotificationEmailSendPayload,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUserSettingRepository } from '@modules/notification/repositories/notification.user-setting.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

/** Writes and fans out the term-policy publication and acceptance notifications. */
@Injectable()
export class NotificationTermPolicyDomain {
    private readonly emailBatchSize: number;

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly notificationUserSettingRepository: NotificationUserSettingRepository,
        private readonly userDomain: UserDomain,
        private readonly configService: ConfigService,
        private readonly helperArrayService: HelperArrayService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue
    ) {
        this.emailBatchSize =
            this.configService.get<number>('email.batchSize')!;
    }

    async processPublishTermPolicy(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload
    ): Promise<IQueueResponse> {
        const users = await this.userDomain.getListActive();
        const activeSettings =
            await this.notificationUserSettingRepository.findActiveUserSettingByType(
                users.map(u => u.id),
                EnumNotificationType.transactional,
                [EnumNotificationChannel.email]
            );
        const filteredSettings = new Set(activeSettings.map(s => s.userId));

        const filteredUsers = users.filter(user =>
            filteredSettings.has(user.id)
        );

        if (filteredUsers.length === 0) {
            return {
                message: 'No users to send publish term policy notification',
                userCounts: users.length,
                filteredUserCounts: 0,
                batches: 0,
            };
        }

        const chunks = this.helperArrayService.chunk(
            filteredUsers,
            this.emailBatchSize
        );

        for (const chunk of chunks) {
            const emailPayload: INotificationEmailSendPayload[] = chunk.map(
                user => {
                    const notificationId = this.databaseUtil.createId();

                    return {
                        userId: user.id,
                        email: user.email,
                        username: user.username,
                        notificationId,
                    };
                }
            );

            const entries: INotificationCreateEntry[] = emailPayload.map(
                payload => ({
                    kind: EnumNotificationKind.publishTermPolicy,
                    payload: {
                        id: payload.notificationId,
                        userId: payload.userId,
                        metadata: {
                            type: data.type,
                            version: data.version,
                        },
                        createdBy: proceedBy,
                    },
                })
            );

            await Promise.all([
                this.notificationRepository.createMany(entries),
                this.notificationEmailQueue.sendPublishTermPolicy(
                    emailPayload,
                    data
                ),
            ]);
        }

        return {
            message: 'Publish term policy notification processed',
            userCounts: users.length,
            filteredUserCounts: filteredUsers.length,
            batches: chunks.length,
        };
    }

    async processUserAcceptTermPolicy(
        userId: string,
        data: INotificationAcceptTermPolicyPayload
    ): Promise<IQueueResponse> {
        const user = await this.userDomain.getOneActive(userId);

        if (!user) {
            return {
                message:
                    'User not found, skipping user accept term policy notification',
            };
        }

        const notificationId = this.databaseUtil.createId();

        await this.notificationRepository.create(
            EnumNotificationKind.userAcceptTermPolicy,
            {
                id: notificationId,
                userId: user.id,
                metadata: {
                    username: user.username,
                    type: data.type,
                    version: data.version,
                },
                createdBy: user.id,
            }
        );

        return {
            message: 'User accept term policy notification processed',
        };
    }
}
