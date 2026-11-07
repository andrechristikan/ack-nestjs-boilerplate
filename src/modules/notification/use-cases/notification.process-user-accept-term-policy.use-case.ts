import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationAcceptTermPolicyPayload,
    INotificationQueuePayload,
    INotificationStepResult,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationTermPolicyService } from '@modules/notification/services/notification.term-policy.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationProcessUserAcceptTermPolicyUseCase implements IAppUseCase<
    [
        Job<
            INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
            unknown,
            EnumNotificationProcess
        >,
    ],
    IQueueResponse
> {
    constructor(
        private readonly notificationTermPolicyService: NotificationTermPolicyService,
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
            INotificationQueuePayload<INotificationAcceptTermPolicyPayload>,
            unknown,
            EnumNotificationProcess
        >
    ): Promise<IQueueResponse> {
        const { userId, data, notificationId, completedSteps, recipient } =
            job.data;
        const result =
            await this.notificationTermPolicyService.processUserAcceptTermPolicy(
                userId,
                recipient,
                data,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }
}
