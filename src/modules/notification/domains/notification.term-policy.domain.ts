import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumNotificationKind,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationCreateEntry,
    INotificationPublishTermPolicyPayload,
    INotificationRecipientEncryptedPayload,
    INotificationStepResult,
    INotificationTermPolicyBatchRecipient,
    INotificationTermPolicyRecipientCreate,
    INotificationTermPolicyRecipientState,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
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
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue
    ) {
        this.emailBatchSize =
            this.configService.get<number>('email.batchSize')!;
    }

    private listPendingBatchIds(
        pageUsers: IUserRecipient[],
        pageMarkers: INotificationTermPolicyRecipientState[]
    ): string[] {
        const batchIdByUserId = new Map(
            pageMarkers
                .filter(marker => marker.enqueuedAt === null)
                .map(marker => [marker.userId, marker.batchId])
        );

        return [
            ...new Set(
                pageUsers.flatMap(({ id }) => batchIdByUserId.get(id) ?? [])
            ),
        ];
    }

    private async enqueuePendingBatches(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        pageUsers: IUserRecipient[],
        batchIds: string[],
        index: number,
        createdBefore: Date
    ): Promise<void> {
        const markers =
            await this.notificationRepository.findTermPolicyRecipientsByBatchIds(
                data.termPolicyId,
                batchIds
            );
        const pageUserIds = new Set(pageUsers.map(({ id }) => id));
        const offPageUserIds = markers
            .map(({ userId }) => userId)
            .filter(userId => !pageUserIds.has(userId));
        const offPageUsers: IUserRecipient[] = [];
        if (offPageUserIds.length > 0) {
            const found = await this.userDomain.getManyRecipientsByIds(
                offPageUserIds,
                createdBefore
            );
            offPageUsers.push(...found);
        }
        const userById = new Map(
            [...pageUsers, ...offPageUsers].map(user => [user.id, user])
        );
        const recipientsByBatchId = new Map<
            string,
            INotificationTermPolicyBatchRecipient[]
        >();

        for (const { userId, notificationId, batchId } of markers) {
            const user = userById.get(userId);
            if (user) {
                const recipients = recipientsByBatchId.get(batchId) ?? [];
                recipients.push({
                    userId,
                    notificationId,
                    email: user.email,
                    username: user.username,
                });
                recipientsByBatchId.set(batchId, recipients);
            }
        }

        await Promise.all(
            batchIds.map((batchId, i) =>
                this.notificationEmailQueue.sendPublishTermPolicyBatch(
                    data,
                    batchId,
                    proceedBy,
                    index + i,
                    recipientsByBatchId.get(batchId) ?? []
                )
            )
        );
    }

    private async createAndEnqueueTermPolicyBatch(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        batchId: string,
        users: IUserRecipient[],
        index: number
    ): Promise<void> {
        const { pendingChannels, deliveredChannels } =
            NotificationKindContract.publishTermPolicy;
        const channels = [...pendingChannels, ...deliveredChannels];
        const recipients: INotificationTermPolicyBatchRecipient[] = [];
        for (const { id, email, username } of users) {
            const notificationId = this.databaseUtil.createId();
            recipients.push({ userId: id, notificationId, email, username });
        }
        const entries: INotificationCreateEntry[] = recipients.map(
            ({ userId, notificationId }) => ({
                kind: EnumNotificationKind.publishTermPolicy,
                payload: {
                    id: notificationId,
                    userId,
                    metadata: { type: data.type, version: data.version },
                    createdBy: proceedBy,
                    channels,
                },
            })
        );
        const markers: INotificationTermPolicyRecipientCreate[] =
            recipients.map(({ userId, notificationId }) => ({
                userId,
                notificationId,
            }));

        await this.notificationRepository.createTermPolicyRecipients(
            proceedBy,
            data.termPolicyId,
            batchId,
            entries,
            markers
        );
        // Sequential by design: write must not run if an earlier step throws
        await this.notificationEmailQueue.sendPublishTermPolicyBatch(
            data,
            batchId,
            proceedBy,
            index,
            recipients
        );
    }

    async processPublishTermPolicy(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload
    ): Promise<IQueueResponse> {
        const createdBefore = this.helperDateService.createFromIso(
            data.recipientCutoffAt
        );
        let cursor: string | null = null;
        let index = 0;
        let candidateCounts = 0;
        let createdCounts = 0;
        let hasNextPage = true;

        while (hasNextPage) {
            // Sequential by design: bounded chunks, the chunks in turn
            const pageUsers = await this.userDomain.getListRecipientCursor(
                cursor,
                this.emailBatchSize,
                createdBefore
            );
            const lastUserId = pageUsers.at(-1)?.id ?? null;
            if (lastUserId === null) {
                break;
            }

            const markers =
                await this.notificationRepository.findTermPolicyRecipients(
                    data.termPolicyId,
                    pageUsers.map(({ id }) => id)
                );
            const markedUserIds = new Set(markers.map(m => m.userId));
            const freshUsers = pageUsers.filter(
                ({ id }) => !markedUserIds.has(id)
            );
            const pendingBatchIds = this.listPendingBatchIds(
                pageUsers,
                markers
            );
            const newBatchId = this.databaseUtil.createId();
            const now = this.helperDateService.create();
            const batchIds =
                freshUsers.length > 0
                    ? [...pendingBatchIds, newBatchId]
                    : pendingBatchIds;

            const work = [
                ...(pendingBatchIds.length > 0
                    ? [
                          this.enqueuePendingBatches(
                              proceedBy,
                              data,
                              pageUsers,
                              pendingBatchIds,
                              index,
                              createdBefore
                          ),
                      ]
                    : []),
                ...(freshUsers.length > 0
                    ? [
                          this.createAndEnqueueTermPolicyBatch(
                              proceedBy,
                              data,
                              newBatchId,
                              freshUsers,
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

            candidateCounts += pageUsers.length;
            createdCounts += freshUsers.length;
            cursor = lastUserId;
            hasNextPage = pageUsers.length === this.emailBatchSize;
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
        recipient: INotificationRecipientEncryptedPayload,
        data: INotificationAcceptTermPolicyPayload,
        notificationId: string,
        completedSteps: EnumNotificationStep[]
    ): Promise<INotificationStepResult> {
        const done = [...completedSteps];
        if (recipient.channels.length === 0) {
            return {
                message:
                    'User accept term policy notification skipped, no channel enabled',
                completedSteps: done,
                failedSteps: [],
            };
        }

        if (!done.includes(EnumNotificationStep.createNotification)) {
            try {
                await this.notificationRepository.createMany([
                    {
                        kind: EnumNotificationKind.userAcceptTermPolicy,
                        payload: {
                            id: notificationId,
                            userId,
                            metadata: {
                                username: recipient.username,
                                type: data.type,
                                version: data.version,
                            },
                            createdBy: userId,
                            channels: recipient.channels,
                        },
                    },
                ]);
                done.push(EnumNotificationStep.createNotification);
            } catch (error: unknown) {
                const failure = this.notificationUtil.toStepFailure(
                    EnumNotificationStep.createNotification,
                    error
                );

                return {
                    message: 'User accept term policy notification failed',
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        return {
            message: 'User accept term policy notification processed',
            completedSteps: done,
            failedSteps: [],
        };
    }
}
