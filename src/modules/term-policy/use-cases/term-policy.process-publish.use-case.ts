import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { ITermPolicyPublishQueueResponse } from '@modules/term-policy/interfaces/term-policy.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import type {
    ITermPolicyBulkQueuePayload,
    ITermPolicyPublishPayload,
    ITermPolicyRecipientBatch,
    ITermPolicyRecipientPage,
    ITermPolicyRecipientPendingRead,
    ITermPolicyRecipientUser,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRecipientService } from '@modules/term-policy/services/term-policy.recipient.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TermPolicyProcessPublishUseCase implements IAppUseCase<
    [ITermPolicyBulkQueuePayload<ITermPolicyPublishPayload>],
    ITermPolicyPublishQueueResponse
> {
    constructor(
        private readonly termPolicyRecipientService: TermPolicyRecipientService,
        private readonly notificationService: NotificationService,
        private readonly notificationEmailQueue: NotificationEmailQueue,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    private async readPending(
        data: ITermPolicyPublishPayload,
        page: ITermPolicyRecipientPage,
        createdBefore: Date
    ): Promise<ITermPolicyRecipientPendingRead | null> {
        if (page.pendingBatchIds.length === 0) {
            return null;
        }

        const pending = await this.termPolicyRecipientService.getPending(
            data.termPolicyId,
            page
        );
        let offPageUsers: ITermPolicyRecipientUser[] = [];
        if (pending.offPageUserIds.length > 0) {
            offPageUsers = await this.userService.getManyActiveRecipientsByIds(
                pending.offPageUserIds,
                createdBefore
            );
        }

        return { pending, offPageUsers };
    }

    private async commitPage(
        proceedBy: string,
        data: ITermPolicyPublishPayload,
        page: ITermPolicyRecipientPage,
        pendingRead: ITermPolicyRecipientPendingRead | null
    ): Promise<number> {
        const hasFresh = page.freshUsers.length > 0;
        if (pendingRead === null && !hasFresh) {
            return 0;
        }

        let fresh: ITermPolicyRecipientBatch | null = null;
        if (hasFresh) {
            fresh = this.termPolicyRecipientService.buildBatch(page.freshUsers);
        }

        return this.databaseService.withTransaction(async tx => {
            let pendingBatches = 0;
            if (pendingRead) {
                pendingBatches =
                    await this.termPolicyRecipientService.sendPendingBatchesInTx(
                        tx,
                        proceedBy,
                        data,
                        page,
                        pendingRead.pending,
                        pendingRead.offPageUsers
                    );
            }
            if (!fresh) {
                return pendingBatches;
            }

            await Promise.all([
                this.notificationService.createManyInTx(
                    tx,
                    EnumNotificationKind.publishTermPolicy,
                    { type: data.type, version: data.version },
                    proceedBy,
                    fresh.recipients
                ),
                this.termPolicyRecipientService.createManyInTx(
                    tx,
                    proceedBy,
                    data.termPolicyId,
                    fresh.batchId,
                    fresh.recipients
                ),
            ]);
            const effect =
                this.notificationEmailQueue.emailPublishTermPolicyEffect(
                    data,
                    fresh.batchId,
                    proceedBy,
                    fresh.recipients
                );
            await this.outboxService.addInTx(tx, effect);

            return pendingBatches + 1;
        });
    }

    async execute({
        data,
        proceedBy,
    }: ITermPolicyBulkQueuePayload<ITermPolicyPublishPayload>): Promise<ITermPolicyPublishQueueResponse> {
        const createdBefore = this.helperDateService.createFromIso(
            data.recipientCutoffAt
        );
        const batchSize = this.termPolicyRecipientService.batchSize;
        let cursor: string | null = null;
        let index = 0;
        let candidateCounts = 0;
        let createdCounts = 0;
        let hasNextPage = true;

        while (hasNextPage) {
            // Sequential by design: a fan-out over an unbounded collection: bounded chunks in turn, each concurrent
            const { data: pageUsers, ...pageCursor } =
                await this.userService.getListActiveRecipientCursor(
                    cursor,
                    batchSize,
                    createdBefore
                );
            if (pageUsers.length === 0) {
                break;
            }

            const page = await this.termPolicyRecipientService.getPage(
                data.termPolicyId,
                pageUsers
            );
            const pendingRead = await this.readPending(
                data,
                page,
                createdBefore
            );
            index += await this.commitPage(proceedBy, data, page, pendingRead);
            candidateCounts += pageUsers.length;
            createdCounts += page.freshUsers.length;
            cursor = pageCursor.cursor ?? null;
            hasNextPage = pageCursor.hasNext;
        }

        const message = this.messageService.setMessage(
            'termPolicy.queue.publish'
        );

        return {
            message,
            candidateCounts,
            createdCounts,
            batches: index,
        };
    }
}
