import { MessageService } from '@common/message/services/message.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { Injectable } from '@nestjs/common';
import type { IActivityLogPurgeExpiredQueueResponse } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ActivityLogProcessPurgeExpiredUseCase implements IAppUseCase<
    [],
    IActivityLogPurgeExpiredQueueResponse
> {
    constructor(
        private readonly activityLogService: ActivityLogService,
        private readonly messageService: MessageService
    ) {}

    async execute(): Promise<IActivityLogPurgeExpiredQueueResponse> {
        const activityLogs = await this.activityLogService.purgeExpired();

        const message = this.messageService.setMessage(
            'activityLog.queue.purgeExpired'
        );

        return { message, activityLogs };
    }
}
