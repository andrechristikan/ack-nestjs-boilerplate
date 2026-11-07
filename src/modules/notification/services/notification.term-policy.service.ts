import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationStep,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationCreateEntry,
    INotificationPublishTermPolicyPayload,
    INotificationRecipientEncryptedPayload,
    INotificationStepResult,
    INotificationTermPolicyBatchRecipient,
    INotificationTermPolicyPage,
    INotificationTermPolicyPending,
    INotificationTermPolicyRecipientCreate,
    INotificationTermPolicyUser,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageService } from '@common/message/services/message.service';

@Injectable()
export class NotificationTermPolicyService {
    readonly emailBatchSize: number;

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly messageService: MessageService
    ) {
        this.emailBatchSize =
            this.configService.get<number>('email.batchSize')!;
    }

    private async createAndEnqueueTermPolicyBatch(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        users: INotificationTermPolicyUser[],
        index: number
    ): Promise<void> {
        const batchId = this.databaseUtil.createId();
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

    async getPage(
        termPolicyId: string,
        users: INotificationTermPolicyUser[]
    ): Promise<INotificationTermPolicyPage> {
        const markers =
            await this.notificationRepository.findTermPolicyRecipients(
                termPolicyId,
                users.map(({ id }) => id)
            );
        const markedUserIds = new Set(markers.map(m => m.userId));
        const freshUsers = users.filter(({ id }) => !markedUserIds.has(id));
        const pendingBatchIds = this.notificationUtil.listPendingBatchIds(
            users,
            markers
        );
        return { users, freshUsers, pendingBatchIds };
    }

    /** Reads the unsent rows of the pending batches and names the users they hold off the page. */
    async getPending(
        termPolicyId: string,
        { users, pendingBatchIds }: INotificationTermPolicyPage
    ): Promise<INotificationTermPolicyPending> {
        if (pendingBatchIds.length === 0) {
            return { sendableMarkers: [], offPageUserIds: [] };
        }

        const sendableMarkers =
            await this.notificationRepository.findTermPolicyRecipientsSendableByBatchIds(
                termPolicyId,
                pendingBatchIds
            );
        const pageUserIds = new Set(users.map(({ id }) => id));
        const offPageUserIds = sendableMarkers
            .map(({ userId }) => userId)
            .filter(userId => !pageUserIds.has(userId));

        return { sendableMarkers, offPageUserIds };
    }

    /** Re-adds each pending batch of one page from its stored markers, and returns how many it enqueued. */
    async sendPendingBatches(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        { users, pendingBatchIds }: INotificationTermPolicyPage,
        { sendableMarkers }: INotificationTermPolicyPending,
        offPageUsers: INotificationTermPolicyUser[],
        index: number
    ): Promise<number> {
        const userById = new Map(
            [...users, ...offPageUsers].map(user => [user.id, user])
        );
        const recipientsByBatchId = new Map<
            string,
            INotificationTermPolicyBatchRecipient[]
        >();

        for (const { userId, notificationId, batchId } of sendableMarkers) {
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
            pendingBatchIds.map((batchId, i) =>
                this.notificationEmailQueue.sendPublishTermPolicyBatch(
                    data,
                    batchId,
                    proceedBy,
                    index + i,
                    recipientsByBatchId.get(batchId) ?? []
                )
            )
        );

        return pendingBatchIds.length;
    }

    /** Creates the rows of the fresh users and enqueues them as one batch; returns 0 when there are none, otherwise 1. */
    async sendFreshBatch(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        freshUsers: INotificationTermPolicyUser[],
        index: number
    ): Promise<number> {
        if (freshUsers.length === 0) {
            return 0;
        }

        await this.createAndEnqueueTermPolicyBatch(
            proceedBy,
            data,
            freshUsers,
            index
        );

        return 1;
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
            return this.notificationUtil.toNoChannelResult(
                EnumNotificationProcess.userAcceptTermPolicy,
                done
            );
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

                const message = this.messageService.setMessage(
                    'notification.queue.error.failed',
                    {
                        properties: {
                            process:
                                EnumNotificationProcess.userAcceptTermPolicy,
                        },
                    }
                );

                return {
                    message,
                    completedSteps: done,
                    failedSteps: [failure],
                };
            }
        }

        const message = this.messageService.setMessage(
            'notification.queue.userAcceptTermPolicy'
        );

        return {
            message,
            completedSteps: done,
            failedSteps: [],
        };
    }
}
