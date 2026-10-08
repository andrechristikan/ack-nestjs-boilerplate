import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationCreateEntry,
    INotificationPublishTermPolicyPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
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
        private readonly userDomain: UserDomain,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue
    ) {
        this.emailBatchSize =
            this.configService.get<number>('email.batchSize')!;
    }

    private async createAndEnqueueTermPolicyBatch(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        batchId: string,
        userIds: string[],
        index: number
    ): Promise<void> {
        const recipients = userIds.map(userId => {
            const notificationId = this.databaseUtil.createId();

            return { userId, notificationId };
        });
        const entries: INotificationCreateEntry[] = recipients.map(
            ({ userId, notificationId }) => ({
                kind: EnumNotificationKind.publishTermPolicy,
                payload: {
                    id: notificationId,
                    userId,
                    metadata: { type: data.type, version: data.version },
                    createdBy: proceedBy,
                },
            })
        );

        await this.notificationRepository.createTermPolicyRecipients(
            proceedBy,
            data.termPolicyId,
            batchId,
            entries,
            recipients
        );
        // Sequential by design: write must not run if an earlier step throws
        await this.notificationEmailQueue.sendPublishTermPolicyBatch(
            data,
            batchId,
            proceedBy,
            index
        );
    }

    async processPublishTermPolicy(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload
    ): Promise<IQueueResponse> {
        let cursor: string | null = null;
        let index = 0;
        let candidateCounts = 0;
        let createdCounts = 0;
        let hasNextPage = true;

        while (hasNextPage) {
            // Sequential by design: bounded chunks, the chunks in turn
            const pageUserIds = await this.userDomain.getListIdCursor(
                cursor,
                this.emailBatchSize
            );
            const lastUserId = pageUserIds.at(-1) ?? null;
            if (lastUserId === null) {
                break;
            }

            const markers =
                await this.notificationRepository.findTermPolicyRecipients(
                    data.termPolicyId,
                    pageUserIds
                );
            const markedUserIds = new Set(markers.map(m => m.userId));
            const freshUserIds = pageUserIds.filter(
                userId => !markedUserIds.has(userId)
            );
            const pendingBatchIds = [
                ...new Set(
                    markers
                        .filter(m => m.enqueuedAt === null)
                        .map(m => m.batchId)
                ),
            ];
            const newBatchId = this.databaseUtil.createId();
            const now = this.helperDateService.create();
            const batchIds =
                freshUserIds.length > 0
                    ? [...pendingBatchIds, newBatchId]
                    : pendingBatchIds;

            const work = [
                ...pendingBatchIds.map((batchId, i) =>
                    this.notificationEmailQueue.sendPublishTermPolicyBatch(
                        data,
                        batchId,
                        proceedBy,
                        index + i
                    )
                ),
                ...(freshUserIds.length > 0
                    ? [
                          this.createAndEnqueueTermPolicyBatch(
                              proceedBy,
                              data,
                              newBatchId,
                              freshUserIds,
                              index + pendingBatchIds.length
                          ),
                      ]
                    : []),
            ];

            if (work.length > 0) {
                await Promise.all(work);

                // Sequential by design: write must not run if an earlier step throws
                await this.notificationRepository.markTermPolicyRecipientsEnqueued(
                    data.termPolicyId,
                    batchIds,
                    now,
                    proceedBy
                );
                index += batchIds.length;
            }

            candidateCounts += pageUserIds.length;
            createdCounts += freshUserIds.length;
            cursor = lastUserId;
            hasNextPage = pageUserIds.length === this.emailBatchSize;
        }

        return {
            message: 'Publish term policy notification processed',
            candidateCounts,
            createdCounts,
            batches: index,
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
