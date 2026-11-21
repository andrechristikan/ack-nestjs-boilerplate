import { HelperDateService } from '@common/helper/services/helper.date.service';
import { QueueBase } from '@common/queue/bases/queue.base';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumProjectProcess,
    EnumProjectQueue,
} from '@modules/project/enums/project.enum';
import type { IProjectSoftDeleteByWorkspaceEffect } from '@modules/project/interfaces/project.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ProjectQueue extends QueueBase {
    constructor(
        @InjectQueue(EnumProjectQueue.project)
        protected readonly queue: Queue,
        private readonly helperDateService: HelperDateService
    ) {
        super(queue);
    }

    softDeleteByWorkspaceEffect(
        workspaceId: string,
        deletedAt: Date,
        deletedBy: string
    ): IProjectSoftDeleteByWorkspaceEffect {
        const deletedAtIso = this.helperDateService.formatToIso(deletedAt);

        return {
            queue: EnumProjectQueue.project,
            name: EnumProjectProcess.softDeleteByWorkspace,
            data: {
                workspaceId,
                deletedAt: deletedAtIso,
                deletedBy,
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };
    }
}
