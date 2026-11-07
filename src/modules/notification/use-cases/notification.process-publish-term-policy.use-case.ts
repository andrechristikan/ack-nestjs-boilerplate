import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationBulkQueuePayload,
    INotificationPublishTermPolicyPayload,
    INotificationTermPolicyPage,
    INotificationTermPolicyUser,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationProcessPublishTermPolicyUseCase implements IAppUseCase<
    [
        Job<
            INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>,
            unknown,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationTermPolicyService: NotificationTermPolicyService,
        private readonly userService: UserService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    private async sendPendingTermPolicyBatches(
        proceedBy: string,
        data: INotificationPublishTermPolicyPayload,
        page: INotificationTermPolicyPage,
        createdBefore: Date,
        index: number
    ): Promise<number> {
        if (page.pendingBatchIds.length === 0) {
            return 0;
        }

        const pending = await this.notificationTermPolicyService.getPending(
            data.termPolicyId,
            page
        );
        let offPageUsers: INotificationTermPolicyUser[] = [];
        if (pending.offPageUserIds.length > 0) {
            offPageUsers = await this.userService.getManyActiveRecipientsByIds(
                pending.offPageUserIds,
                createdBefore
            );
        }

        return this.notificationTermPolicyService.sendPendingBatches(
            proceedBy,
            data,
            page,
            pending,
            offPageUsers,
            index
        );
    }

    async execute({
        data: { data, proceedBy },
    }: Job<
        INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>,
        unknown,
        EnumNotificationProcess
    >): Promise<IQueueResponse> {
        const createdBefore = this.helperDateService.createFromIso(
            data.recipientCutoffAt
        );
        const batchSize = this.notificationTermPolicyService.emailBatchSize;
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

            const page = await this.notificationTermPolicyService.getPage(
                data.termPolicyId,
                pageUsers
            );
            const [pendingBatches, freshBatches] = await Promise.all([
                this.sendPendingTermPolicyBatches(
                    proceedBy,
                    data,
                    page,
                    createdBefore,
                    index
                ),
                this.notificationTermPolicyService.sendFreshBatch(
                    proceedBy,
                    data,
                    page.freshUsers,
                    index + page.pendingBatchIds.length
                ),
            ]);

            index += pendingBatches + freshBatches;
            candidateCounts += pageUsers.length;
            createdCounts += page.freshUsers.length;
            cursor = pageCursor.cursor ?? null;
            hasNextPage = pageCursor.hasNext;
        }

        const message = this.messageService.setMessage(
            'notification.queue.publishTermPolicy'
        );

        return {
            message,
            candidateCounts,
            createdCounts,
            batches: index,
        };
    }
}
