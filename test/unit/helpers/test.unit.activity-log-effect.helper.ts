import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';

export function buildActivityLogCreateManyEffect(
    idempotencyKey: string
): IActivityLogCreateManyEffect {
    return {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey,
    };
}
