import type {
    INotificationStepFailure,
    INotificationStepResult,
} from '@modules/notification/interfaces/notification.interface';
import { EnumNotificationStep } from '@modules/notification/enums/notification.enum';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';

@Injectable()
export class NotificationUtil {
    toStepFailure(
        step: EnumNotificationStep,
        reason: unknown
    ): INotificationStepFailure {
        const error = reason instanceof Error ? reason.message : String(reason);

        return { step, error };
    }

    toStepSummary(failedSteps: INotificationStepFailure[]): string {
        const pairs = failedSteps.map(({ step, error }) => `${step}:${error}`);

        return `Notification steps failed: ${pairs.join(', ')}`;
    }

    toStepResponse({
        message,
        completedSteps,
    }: INotificationStepResult): IQueueResponse {
        return { message, completedSteps };
    }
}
