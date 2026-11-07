import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationQueuePayload,
    INotificationStepResult,
    INotificationWorkspaceJoinRequestEncryptedPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationWorkspaceService } from '@modules/notification/services/notification.workspace.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationProcessWorkspaceJoinRequestUseCase implements IAppUseCase<
    [
        Job<
            INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationWorkspaceService: NotificationWorkspaceService,
        private readonly notificationUtil: NotificationUtil
    ) {}

    private async recordSteps<T>(
        job: Job<
            INotificationQueuePayload<T>,
            unknown,
            EnumNotificationProcess
        >,
        result: INotificationStepResult
    ): Promise<IQueueResponse> {
        await job.updateData({
            ...job.data,
            completedSteps: result.completedSteps,
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
            INotificationQueuePayload<INotificationWorkspaceJoinRequestEncryptedPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const {
            userId,
            proceedBy,
            data,
            notificationId,
            completedSteps,
            recipient,
        } = job.data;
        const result =
            await this.notificationWorkspaceService.processWorkspaceJoinRequest(
                userId,
                proceedBy,
                recipient,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }
}
