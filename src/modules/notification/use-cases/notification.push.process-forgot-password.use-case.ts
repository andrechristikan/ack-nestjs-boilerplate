import { EnumNotificationPushProcess } from '@modules/notification/enums/notification.enum';
import type {
    INotificationPushQueuePayload,
    INotificationPushStepResult,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationPushSecurityService } from '@modules/notification/services/notification.push.security.service';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Injectable } from '@nestjs/common';
import { QueueException } from '@queues/exceptions/queue.exception';
import { Job } from 'bullmq';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class NotificationPushProcessForgotPasswordUseCase implements IAppUseCase<
    [Job<INotificationPushQueuePayload, unknown, EnumNotificationPushProcess>],
    IQueueResponse
> {
    constructor(
        private readonly notificationPushSecurityService: NotificationPushSecurityService,
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
            INotificationPushQueuePayload,
            unknown,
            EnumNotificationPushProcess
        >
    ): Promise<IQueueResponse> {
        const {
            send,
            completedSteps,
            encryptedFailureTokens,
            encryptedPendingTokens,
        } = job.data;
        const result =
            await this.notificationPushSecurityService.processForgotPassword(
                send,
                completedSteps,
                encryptedFailureTokens,
                encryptedPendingTokens
            );

        return this.recordSteps(job, result);
    }
}
