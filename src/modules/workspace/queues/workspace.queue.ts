import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QueueBase } from '@common/queue/bases/queue.base';
import type { IQueueScheduler } from '@common/queue/interfaces/queue.interface';
import { EnumWorkspaceQueue } from '@modules/workspace/enums/workspace.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IWorkspaceSoftDeleteEffect } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class WorkspaceQueue extends QueueBase {
    private readonly timezone: string;
    private readonly expirySweepCron: string;

    constructor(
        @InjectQueue(EnumWorkspaceQueue.workspace)
        protected override readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        super(queue);
        this.timezone = this.configService.get<string>('app.timezone')!;
        this.expirySweepCron = this.configService.get<string>(
            'workspace.invite.expirySweepCron'
        )!;
    }

    protected override schedulers(): IQueueScheduler[] {
        return [
            EnumWorkspaceProcess.expireStaleInvites,
            EnumWorkspaceProcess.expireStaleJoinRequests,
        ].map(jobName => ({
            id: jobName,
            repeat: {
                pattern: this.expirySweepCron,
                tz: this.timezone,
                immediately: true,
            },
            template: {
                name: jobName,
                data: {},
                opts: { priority: EnumQueuePriority.low },
            },
        }));
    }

    softDeleteEffect(
        workspaceId: string,
        deletedBy: string,
        activityLog: IActivityLogActorPayload
    ): IWorkspaceSoftDeleteEffect {
        return {
            queue: EnumWorkspaceQueue.workspace,
            name: EnumWorkspaceProcess.softDelete,
            data: { workspaceId, deletedBy, activityLog },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }
}
