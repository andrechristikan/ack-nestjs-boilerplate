import type { IQueueResponse } from '@common/queue/interfaces/queue.interface';
import type { Outbox, Prisma } from '@generated/prisma-client/client';
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

export type IOutboxDispatchRow = Pick<
    Outbox,
    'id' | 'queue' | 'name' | 'priority' | 'idempotencyKey'
>;

export interface IOutboxBuffer {
    rows: Prisma.OutboxCreateManyInput[];
    dispatchRows: IOutboxDispatchRow[];
    idsByKey: Map<string, string>;
}

export interface IOutboxReconcileResult {
    stamped: boolean;
    missingRow: Outbox | null;
}

export interface IOutboxQueueResponse extends IQueueResponse {
    count: number;
}
