import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogCreate,
    IActivityLogCreateManyPayload,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ActivityLogProcessCreateManyUseCase implements IAppUseCase<
    [Job<IActivityLogCreateManyPayload, unknown, EnumActivityLogProcess>],
    IQueueResponse
> {
    constructor(
        private readonly activityLogService: ActivityLogService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        job: Job<IActivityLogCreateManyPayload, unknown, EnumActivityLogProcess>
    ): Promise<IQueueResponse> {
        const rows: IActivityLogCreate[] = [];
        for (const row of job.data.rows) {
            const createdAt = this.helperDateService.createFromIso(
                row.createdAt
            );
            rows.push({ ...row, createdAt });
        }
        await this.activityLogService.createMany(rows);

        const message = this.messageService.setMessage(
            'activityLog.queue.createMany'
        );

        return {
            message,
            countRows: rows.length,
        };
    }
}
