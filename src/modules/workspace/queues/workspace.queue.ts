import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

/**
 * Owns the workspace queue connection; schedules the recurring invite-expiry sweep.
 */
@Injectable()
export class WorkspaceQueue extends QueueBase {
    private readonly defTz: string;
    private readonly expirySweepCron: string;

    constructor(
        @InjectQueue(EnumQueue.workspace) protected readonly queue: Queue,
        protected readonly sentryService: SentryService,
        private readonly configService: ConfigService
    ) {
        super(queue, sentryService);
        this.defTz = this.configService.get<string>('app.timezone')!;
        this.expirySweepCron = this.configService.get<string>(
            'workspace.invite.expirySweepCron'
        )!;
    }

    /**
     * Schedules the recurring stale-invite expiry sweep (daily at midnight, in the
     * configured timezone). `immediately: true` is BullMQ's native scheduler option
     * to also run the job right now, at every call — safe to re-run on every app
     * bootstrap since the sweep is idempotent (it only flips already-past-due rows).
     */
    async scheduleInviteExpirySweep(): Promise<void> {
        await this.queue.upsertJobScheduler(
            EnumWorkspaceProcess.expireStaleInvites,
            {
                pattern: this.expirySweepCron,
                tz: this.defTz,
                immediately: true,
            },
            {
                name: EnumWorkspaceProcess.expireStaleInvites,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
    }
}
