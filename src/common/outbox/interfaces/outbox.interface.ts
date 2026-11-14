import type { Outbox } from '@generated/prisma-client/client';
import type { EnumQueuePriority } from '@common/queue/enums/queue.enum';

export interface IOutboxEffect {
    queue: string;
    name: string;
    data: object;
    priority: EnumQueuePriority;
    idempotencyKey: string | null;
}

export interface IOutboxJobPayload {
    outboxId: string;
}

export interface IOutboxReconcileResult {
    stamped: boolean;
    missingRow: Outbox | null;
}
