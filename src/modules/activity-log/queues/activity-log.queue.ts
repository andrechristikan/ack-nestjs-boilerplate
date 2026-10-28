import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumActivityLogProcess } from '@modules/activity-log/enums/activity-log.enum';
import type {
    IActivityLogCreate,
    IActivityLogCreateManyPayload,
    IActivityLogCreatePayload,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';
import { MessageService } from '@common/message/services/message.service';

/**
 * Enqueues the activity log rows a request staged, one job per flush under a fresh job id.
 */
@Injectable()
export class ActivityLogQueue extends QueueBase {
    private readonly createManyJobIdPattern: string;

    constructor(
        @InjectQueue(EnumQueue.activityLog) protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly messageService: MessageService
    ) {
        super(queue, sentryService);
        this.createManyJobIdPattern = this.configService.get<string>(
            'activityLog.jobId.createManyPattern'
        )!;
    }

    async createMany(rows: IActivityLogCreate[]): Promise<void> {
        if (rows.length === 0) {
            return;
        }

        const nonce = this.databaseUtil.createId();
        const jobId = this.helperStringService.fillPattern(
            this.createManyJobIdPattern,
            { process: EnumActivityLogProcess.createMany, nonce }
        );
        const payloadRows: IActivityLogCreatePayload[] = [];
        for (const row of rows) {
            const createdAt = this.helperDateService.formatToIso(row.createdAt);
            payloadRows.push({ ...row, createdAt });
        }
        const data: IActivityLogCreateManyPayload = { rows: payloadRows };

        const description = this.messageService.setMessage(
            'activityLog.queue.error.enqueueCreateMany'
        );

        await this.addSideEffect(
            EnumActivityLogProcess.createMany,
            data,
            {
                priority: EnumQueuePriority.low,
                jobId,
            },
            description
        );
    }
}
