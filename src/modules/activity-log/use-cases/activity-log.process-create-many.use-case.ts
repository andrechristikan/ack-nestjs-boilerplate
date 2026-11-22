import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogCreate,
    IActivityLogCreateManyPayload,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import type { IActivityLogCreateManyQueueResponse } from '@modules/activity-log/interfaces/activity-log.interface';
import { MessageService } from '@common/message/services/message.service';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ActivityLogProcessCreateManyUseCase implements IAppUseCase<
    [IActivityLogCreateManyPayload],
    IActivityLogCreateManyQueueResponse
> {
    constructor(
        private readonly activityLogService: ActivityLogService,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async execute(
        data: IActivityLogCreateManyPayload
    ): Promise<IActivityLogCreateManyQueueResponse> {
        const rows: IActivityLogCreate[] = [];
        for (const row of data.rows) {
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
