import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { NotificationKindContract } from '@modules/notification/contracts/notification.kind.contract';
import {
    EnumNotificationEmailProcess,
    EnumNotificationKind,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationCreateEntry,
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyBatchRecipient,
    INotificationTermPolicyPage,
    INotificationTermPolicyPending,
    INotificationTermPolicyRecipientCreate,
    INotificationTermPolicyRecipientState,
    INotificationTermPolicyUser,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationRepository } from '@modules/notification/repositories/notification.repository';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import type { INotificationEmailPublishTermPolicyEffect } from '@modules/notification/interfaces/notification.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IUserRecipient } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationTermPolicyService {
    readonly emailBatchSize: number;
    private readonly batchPattern: string;
    private readonly batchResendPattern: string;

    constructor(
        private readonly notificationRepository: NotificationRepository,
        private readonly configService: ConfigService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperStringService: HelperStringService,
        private readonly outboxService: OutboxService
    ) {
        this.emailBatchSize =
            this.configService.get<number>('email.batchSize')!;
        this.batchPattern = this.configService.get<string>(
            'notification.idempotencyKey.termPolicyBatchPattern'
        )!;
        this.batchResendPattern = this.configService.get<string>(
            'notification.idempotencyKey.termPolicyBatchResendPattern'
        )!;
    }

    private listPendingBatchIds(
        users: IUserRecipient[],
        markers: INotificationTermPolicyRecipientState[]
    ): string[] {
        const batchIdByUserId = new Map(
            markers
                .filter(
                    marker =>
                        marker.sentAt === null && marker.claimedAt === null
                )
                .map(marker => [marker.userId, marker.batchId])
        );

        return [
            ...new Set(
                users.flatMap(({ id }) => batchIdByUserId.get(id) ?? [])
            ),
        ];
    }

    private batchEffect(
        data: INotificationPublishTermPolicyPayload,
        batchId: string,
        proceedBy: string,
        recipients: INotificationTermPolicyBatchRecipient[]
    ): INotificationEmailPublishTermPolicyEffect {
        const { resendNonce } = data;
        const pattern =
            resendNonce === null ? this.batchPattern : this.batchResendPattern;
        const idempotencyKey = this.helperStringService.fillPattern(pattern, {
            process: EnumNotificationEmailProcess.publishTermPolicy,
            termPolicyId: data.termPolicyId,
            batchId,
            ...(resendNonce !== null && { resendNonce }),
        });
        const encryptedRecipients = recipients.map(
            ({ userId, notificationId, email, username }) => {
                const encryptedEmail = this.notificationUtil.encryptPayload(
                    email,
                    userId
                );

                return { userId, notificationId, encryptedEmail, username };
            }
        );

        return {
            queue: EnumNotificationQueue.notificationEmail,
            name: EnumNotificationEmailProcess.publishTermPolicy,
            data: {
                data,
                batchId,
                proceedBy,
                recipients: encryptedRecipients,
            },
            priority: EnumQueuePriority.medium,
            idempotencyKey,
        };
    }

    private async createTermPolicyBatch(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        users: INotificationTermPolicyUser[]
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
        const effect = this.batchEffect(data, batchId, proceedBy, recipients);

        await this.outboxService.withTransaction(async tx => {
            await this.notificationRepository.createTermPolicyRecipientsInTx(
                tx,
                proceedBy,
                data.termPolicyId,
                batchId,
                entries,
                markers
            );
            await this.outboxService.addInTx(tx, effect);
        });
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
        const pendingBatchIds = this.listPendingBatchIds(users, markers);
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

    /** Re-adds each pending batch of one page from its stored markers in one outbox add, and returns how many it added. */
    async sendPendingBatches(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        { users, pendingBatchIds }: INotificationTermPolicyPage,
        { sendableMarkers }: INotificationTermPolicyPending,
        offPageUsers: INotificationTermPolicyUser[]
    ): Promise<number> {
        if (pendingBatchIds.length === 0) {
            return 0;
        }

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

        const effects = pendingBatchIds.map(batchId =>
            this.batchEffect(
                data,
                batchId,
                proceedBy,
                recipientsByBatchId.get(batchId) ?? []
            )
        );
        await this.outboxService.addMany(effects);

        return pendingBatchIds.length;
    }

    /** Creates the rows of the fresh users and adds them as one batch row on the same transaction; returns 0 when there are none, otherwise 1. */
    async sendFreshBatch(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        freshUsers: INotificationTermPolicyUser[]
    ): Promise<number> {
        if (freshUsers.length === 0) {
            return 0;
        }

        await this.createTermPolicyBatch(proceedBy, data, freshUsers);

        return 1;
    }
}
