import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushQueuePayload,
    INotificationPushStepResult,
    INotificationWorkspaceJoinAcceptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushWorkspaceService } from '@modules/notification/services/notification.push.workspace.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationPushProcessWorkspaceJoinAcceptedUseCase implements IAppUseCase<
    [
        Job<
            INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
            unknown,
            EnumNotificationPushProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationPushWorkspaceService: NotificationPushWorkspaceService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private async recordSteps<T>(
        job: Job<
            INotificationPushQueuePayload<T>,
            unknown,
            EnumNotificationPushProcess
        >,
        result: INotificationPushStepResult
    ): Promise<IQueueResponse> {
        await job.updateData({
            ...job.data,
            completedSteps: result.completedSteps,
            encryptedFailureTokens: result.encryptedFailureTokens,
            encryptedPendingTokens: result.encryptedPendingTokens,
        });
        if (result.failedSteps.length > 0) {
            const summary = this.notificationUtil.toStepSummary(
                result.failedSteps
            );
            throw new QueueException(
                summary,
                true,
                result.failedSteps[0]!.rawError
            );
        }

        return this.notificationUtil.toStepResponse(result);
    }

    async execute(
        job: Job<
            INotificationPushQueuePayload<INotificationWorkspaceJoinAcceptedPayload>,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const {
            send,
            data,
            completedSteps,
            encryptedFailureTokens,
            encryptedPendingTokens,
        } = job.data;
        const result =
            await this.notificationPushWorkspaceService.processWorkspaceJoinAccepted(
                send,
                data,
                completedSteps,
                encryptedFailureTokens,
                encryptedPendingTokens
            );

        return this.recordSteps(job, result);
    }
}
