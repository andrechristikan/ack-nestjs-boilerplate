import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogCreate,
    IActivityLogCreateManyPayload,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import type { IQueueResponse } from '@queues/interfaces/queue.interface';
import { Job } from 'bullmq';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';

@Injectable()
export class ActivityLogProcessorService {
    constructor(
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService
    ) {}

    async processCreateMany(
        job: Job<IActivityLogCreateManyPayload, unknown, EnumActivityLogProcess>
    ): Promise<IQueueResponse> {
        const rows: IActivityLogCreate[] = [];
        for (const row of job.data.rows) {
            const createdAt = this.helperDateService.createFromIso(
                row.createdAt
            );
            rows.push({ ...row, createdAt });
        }
        await this.activityLogDomain.createMany(rows);

        const message = this.messageService.setMessage(
            'activityLog.queue.createMany'
        );

        return {
            message,
            countRows: rows.length,
        };
    }
    processUnknown(process: string): never {
        const message = this.messageService.setMessage(
            'activityLog.queue.error.unknownProcess',
            { properties: { process } }
        );

        throw new QueueException(message, true);
    }
}
