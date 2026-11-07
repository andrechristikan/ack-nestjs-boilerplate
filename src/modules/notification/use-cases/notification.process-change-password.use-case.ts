import { EnumNotificationProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationQueuePayload,
    INotificationStepResult,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationSecurityService } from '@modules/notification/services/notification.security.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationProcessChangePasswordUseCase implements IAppUseCase<
    [Job<INotificationQueuePayload, unknown, EnumNotificationProcess>],
    IQueueResponse
> {
    constructor(
        private readonly notificationSecurityService: NotificationSecurityService,
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
        job: Job<INotificationQueuePayload, unknown, EnumNotificationProcess>
    ): Promise<IQueueResponse> {
        const { userId, notificationId, completedSteps, recipient } = job.data;
        const result =
            await this.notificationSecurityService.processChangePassword(
                userId,
                recipient,
                notificationId,
                completedSteps
            );

        return this.recordSteps(job, result);
    }
}
