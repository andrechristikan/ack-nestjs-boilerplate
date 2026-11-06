import { SentryService } from '@common/sentry/services/sentry.service';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@queues/bases/queue.base';
import { EnumQueue, EnumQueuePriority } from '@queues/enums/queue.enum';

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

    /** Creates or replaces the stale-invite expiry scheduler on the configured cron and timezone, and runs the sweep at once on every call. */
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

    /** Creates or replaces the stale-join-request expiry scheduler on the invite sweep cron and timezone, and runs the sweep at once on every call. */
    async scheduleJoinRequestExpirySweep(): Promise<void> {
        await this.queue.upsertJobScheduler(
            EnumWorkspaceProcess.expireStaleJoinRequests,
            {
                pattern: this.expirySweepCron,
                tz: this.defTz,
                immediately: true,
            },
            {
                name: EnumWorkspaceProcess.expireStaleJoinRequests,
                data: {},
                opts: {
                    priority: EnumQueuePriority.low,
                },
            }
        );
    }
}
