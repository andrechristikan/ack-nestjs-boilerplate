import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { INotificationTermPolicyBatchRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import type {
    ITermPolicyPublishPayload,
    ITermPolicyRecipientBatch,
    ITermPolicyRecipientClaim,
    ITermPolicyRecipientCreate,
    ITermPolicyRecipientPage,
    ITermPolicyRecipientPending,
    ITermPolicyRecipientState,
    ITermPolicyRecipientUser,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRecipientRepository } from '@modules/term-policy/repositories/term-policy.recipient.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TermPolicyRecipientService {
    readonly batchSize: number;

    constructor(
        private readonly termPolicyRecipientRepository: TermPolicyRecipientRepository,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.batchSize = this.configService.get<number>('email.batchSize')!;
    }

    private listPendingBatchIds(
        users: ITermPolicyRecipientUser[],
        markers: ITermPolicyRecipientState[]
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

    async getPage(
        termPolicyId: string,
        users: ITermPolicyRecipientUser[]
    ): Promise<ITermPolicyRecipientPage> {
        const markers =
            await this.termPolicyRecipientRepository.findManyByUserIds(
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
        { users, pendingBatchIds }: ITermPolicyRecipientPage
    ): Promise<ITermPolicyRecipientPending> {
        if (pendingBatchIds.length === 0) {
            return { sendableMarkers: [], offPageUserIds: [] };
        }

        const sendableMarkers =
            await this.termPolicyRecipientRepository.findManySendableByBatchIds(
                termPolicyId,
                pendingBatchIds
            );
        const pageUserIds = new Set(users.map(({ id }) => id));
        const offPageUserIds = sendableMarkers
            .map(({ userId }) => userId)
            .filter(userId => !pageUserIds.has(userId));

        return { sendableMarkers, offPageUserIds };
    }

    /** Re-adds each pending batch of one page from its stored markers in one outbox add on the given transaction, and returns how many it added. */
    async sendPendingBatchesInTx(
        tx: IDatabaseTransactionClient,
        proceedBy: string,
        data: ITermPolicyPublishPayload,
        { users, pendingBatchIds }: ITermPolicyRecipientPage,
        { sendableMarkers }: ITermPolicyRecipientPending,
        offPageUsers: ITermPolicyRecipientUser[]
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
            this.notificationEmailQueue.emailPublishTermPolicyEffect(
                data,
                batchId,
                proceedBy,
                recipientsByBatchId.get(batchId) ?? []
            )
        );
        await this.outboxService.addManyInTx(tx, effects);

        return pendingBatchIds.length;
    }

    /** Draws a fresh batch id and a fresh notification id per user. */
    buildBatch(users: ITermPolicyRecipientUser[]): ITermPolicyRecipientBatch {
        const batchId = this.databaseUtil.createId();
        const recipients: INotificationTermPolicyBatchRecipient[] = [];
        for (const { id, email, username } of users) {
            const notificationId = this.databaseUtil.createId();
            recipients.push({ userId: id, notificationId, email, username });
        }

        return { batchId, recipients };
    }

    async createManyInTx(
        tx: IDatabaseTransactionClient,
        proceedBy: string,
        termPolicyId: string,
        batchId: string,
        recipients: ITermPolicyRecipientCreate[]
    ): Promise<void> {
        await this.termPolicyRecipientRepository.createManyInTx(
            tx,
            proceedBy,
            termPolicyId,
            batchId,
            recipients
        );
    }

    /** Claims the unsent, unclaimed recipients of the batch among the user ids under a freshly drawn nonce and returns that nonce with the ids it claimed. */
    async claim(
        termPolicyId: string,
        batchId: string,
        userIds: string[],
        proceedBy: string
    ): Promise<ITermPolicyRecipientClaim> {
        const claimNonce = this.databaseUtil.createId();
        const claimedAt = this.helperDateService.now();
        const claimedUserIds = await this.termPolicyRecipientRepository.claim(
            termPolicyId,
            batchId,
            userIds,
            claimNonce,
            claimedAt,
            proceedBy
        );

        return { claimNonce, userIds: claimedUserIds };
    }

    async markSentInTx(
        tx: IDatabaseTransactionClient,
        claimNonce: string,
        userIds: string[],
        sentAt: Date,
        proceedBy: string
    ): Promise<void> {
        await this.termPolicyRecipientRepository.markSentInTx(
            tx,
            claimNonce,
            userIds,
            sentAt,
            proceedBy
        );
    }

    async release(
        claimNonce: string,
        userIds: string[],
        proceedBy: string
    ): Promise<void> {
        if (userIds.length === 0) {
            return;
        }

        await this.termPolicyRecipientRepository.release(
            claimNonce,
            userIds,
            proceedBy
        );
    }
}
