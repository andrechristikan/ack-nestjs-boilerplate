import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { ITermPolicyPublishQueueResponse } from '@modules/term-policy/interfaces/term-policy.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import type {
    ITermPolicyBulkQueuePayload,
    ITermPolicyPublishPayload,
    ITermPolicyRecipientPage,
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
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    private async sendPendingBatches(
        proceedBy: string,
        data: ITermPolicyPublishPayload,
        page: ITermPolicyRecipientPage,
        createdBefore: Date
    ): Promise<number> {
        if (page.pendingBatchIds.length === 0) {
            return 0;
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

        return this.termPolicyRecipientService.sendPendingBatches(
            proceedBy,
            data,
            page,
            pending,
            offPageUsers
        );
    }

    private async sendFreshBatch(
        proceedBy: string,
        data: ITermPolicyPublishPayload,
        freshUsers: ITermPolicyRecipientUser[]
    ): Promise<number> {
        if (freshUsers.length === 0) {
            return 0;
        }

        const { batchId, recipients } =
            this.termPolicyRecipientService.buildBatch(freshUsers);
        const effect = this.notificationEmailQueue.emailPublishTermPolicyEffect(
            data,
            batchId,
            proceedBy,
            recipients
        );

        await this.outboxService.withTransaction(async tx => {
            await this.notificationService.createManyInTx(
                tx,
                EnumNotificationKind.publishTermPolicy,
                { type: data.type, version: data.version },
                proceedBy,
                recipients
            );
            await this.termPolicyRecipientService.createManyInTx(
                tx,
                proceedBy,
                data.termPolicyId,
                batchId,
                recipients
            );
            await this.outboxService.addInTx(tx, effect);
        });

        return 1;
    }

    async execute({
        data,
        proceedBy,
    }: ITermPolicyBulkQueuePayload<ITermPolicyPublishPayload>): Promise<ITermPolicyPublishQueueResponse> {
        const createdBefore = this.helperDateService.createFromIso(
            data.recipientCutoffAt
        );
        const batchSize = this.termPolicyRecipientService.emailBatchSize;
        let cursor: string | null = null;
        let index = 0;
        let candidateCounts = 0;
        let createdCounts = 0;
        let hasNextPage = true;

        while (hasNextPage) {
            // Sequential by design: bounded chunks, the chunks in turn
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
            const [pendingBatches, freshBatches] = await Promise.all([
                this.sendPendingBatches(proceedBy, data, page, createdBefore),
                this.sendFreshBatch(proceedBy, data, page.freshUsers),
            ]);

            index += pendingBatches + freshBatches;
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
